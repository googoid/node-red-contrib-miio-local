module.exports = function (RED) {
  const miio = require('miio');
  const { color } = require('abstract-things/values');

  function OutputNode(n) {
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

    this.on('input', msg => {
      if (!node.device) {
        return;
      }

      let promise = new Promise(resolve => resolve());
      let colorHue, colorSaturation;
      for (let key of Object.keys(msg.payload)) {
        switch (key) {
          case 'power':
            promise = promise.then(() =>
              node.device.changePower(msg.payload[key])
            );
            break;
          case 'brightness':
            promise = promise.then(() =>
              node.device.changeBrightness(msg.payload[key], {
                powerOn: node.device.properties.power
              })
            );
            break;
          case 'colorHue':
            colorHue = msg.payload[key];
            break;
          case 'colorSaturation':
            colorSaturation = msg.payload[key];
            break;
        }

        if (colorHue !== undefined && colorSaturation !== undefined) {
          promise = promise.then(() =>
            node.device.changeColor(color([colorHue, colorSaturation], 'hsl'), {
              duration: 500
            })
          );
        }

        promise.then().catch(console.error);
      }
    });

    this.on('close', () => {
      config.removeListener('miio-local-device-available', findDevice);
      config.removeListener('miio-local-device-unavailable', findDevice);
    });
  }

  RED.nodes.registerType('miio-local-output', OutputNode);
};
