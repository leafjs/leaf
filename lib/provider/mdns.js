"use strict";


const logger = require("debug")("leaf:provider:mdns"),
  mdns = require("leaf-mdns");

class ServiceProvider {
  constructor(options) {}
  advertise(leaf) {
    if (leaf._ad) {
      leaf._ad.stop();
    }
    let adSettings = {
      name: leaf.config.name,
      txtRecord: {
        name: leaf.config.name, // cant put into subtype, it is too long
        version: leaf.config.version,
        nsp: leaf.namespace || "/"
      } //,
      //flags: mdns.kDNSServiceFlagsForceMulticast // linux avahi-compat-dns_sd cannot have flags...
    };

    // TODO: consider if ad interface should be an array, else not, loopback would not work
    if (leaf.config.mdns && leaf.config.mdns.ad) {
      if (undefined !== leaf.config.mdns.ad.interface) {
        if (leaf.config.mdns.ad.interface === "lo") {
          adSettings.networkInterface = mdns.loopbackInterface();
          adSettings.host = "localhost";
        } else {
          adSettings.networkInterface = leaf.config.mdns.ad.interface;
        }
      }
      if (leaf.config.mdns.ad.domain) {
        adSettings.domain = leaf.config.mdns.ad.domain;
      }
    }

    logger("beginning advertisement");
    let port = leaf._server.address().port;
    leaf._ad = new mdns.Advertisement(mdns.tcp('leaf'), port, adSettings, (err, service) => {
      logger(`service registered: ${err} ${service.name}`);
    });
    leaf._ad.on("error", (e) => {
      logger(e, e.stack);
    });
    logger(`starting advertisement ${adSettings}`);
    leaf._ad.start();
  }
}

exports = module.exports = ServiceProvider;