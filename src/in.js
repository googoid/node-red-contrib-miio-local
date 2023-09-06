module.exports = function (RED) {
  const miio = require('miio');

  // The main node definition - most things happen in here
  function InputNode(n) {
    let node = this;
    let debug = !!n.debug;

    RED.nodes.createNode(this, n);

    node.status({ fill: 'gray', shape: 'ring', text: 'Not Connected' });

    const config = RED.nodes.getNode(n.config);

    function findDevice(reg) {
      node.reg = config.devices[n.device];

      if (node.reg) {
        config.removeListener('miio-local-device-available', findDevice);
        config.removeListener('miio-local-device-unavailable', findDevice);

        miio
          .device({
            address: node.reg.address,
            token: n.token
          })
          .then(device => {
            node.device = device;
            if (n.pollDuration) {
              node.device.updatePollDuration(n.pollDuration);
            }
            node.device.on('stateChanged', change =>
              node.send({
                topic: node.device.id,
                payload: node.device.properties
              })
            );

            node.send({
              topic: node.device.id,
              payload: node.device.properties
            });

            node.status({ fill: 'green', shape: 'ring', text: 'Connected' });
          })
          .catch(err => {
            node.error(err);
            node.status({ fill: 'red', shape: 'ring', text: err.message });
          });
      }
    }

    config.on('miio-local-device-available', findDevice);
    config.on('miio-local-device-unavailable', findDevice);

    this.on('close', () => {
      config.removeListener('miio-local-device-available', findDevice);
      config.removeListener('miio-local-device-unavailable', findDevice);
    });
  }

  RED.nodes.registerType('miio-local-input', InputNode);
};
