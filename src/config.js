module.exports = function (RED) {
  const YeelightColor = require('miio/lib/devices/yeelight.color');
  const PowerPlug = require('miio/lib/devices/power-plug');
  const models = require('miio/lib/models');
  models['yeelink.light.color5'] = YeelightColor;
  models['chuangmi.plug.hmi206'] = PowerPlug;

  const miio = require('miio');

  function Config(n) {
    let node = this;
    RED.nodes.createNode(node, n);
    node.browser = miio.browse({ cacheTime: 300 });
    node.devices = {};
    node.browser.on('available', reg => {
      // RED.events.emit('runtime-event', {
      //   id: `MIIO-LOCAL_DEVICE-AVAILABLE-${node.id}`,
      //   retain: false,
      //   payload: {
      //     reg
      //   }
      // });
      node.devices[reg.id] = reg;
      node.emit('miio-local-device-available', reg);
    });

    node.browser.on('unavailable', reg => {
      // RED.events.emit('runtime-event', {
      //   id: `MIIO-LOCAL_DEVICE-UNAVAILABLE-${node.id}`,
      //   retain: false,
      //   payload: {
      //     reg
      //   }
      // });
      delete node.devices[reg.id];
      node.emit('miio-local-device-unavailable', reg);
    });

    // Handle close event
    node.on('close', () => {
      node.browser.stop();
      node.devices.clear();
      delete node.browser;
      delete node.devices;
    });
  }

  RED.nodes.registerType('miio-local-config', Config);

  // Get list of lights
  RED.httpAdmin.get('/miio-local/devices', function (req, res) {
    if (!req.query.config_id) {
      res.status(500).send('Missing arguments');
      return;
    }

    let node = RED.nodes.getNode(req.query.config_id);

    res.set({ 'content-type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify(Object.keys(node.devices).map(k => node.devices[k]))
    );
  });
};
