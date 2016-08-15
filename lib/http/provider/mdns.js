"use strict";

require("any-promise/register")("bluebird");

const debug = require("debug")("leafjs:http:provider:mdns"),
  mdns = require("leaf-mdns");

class ServiceProvider {
  constructor(options){
  }
  advertise(http) {
    if ( http._ad ) { http._ad.stop(); }
    let adSettings = {
      name: http.config.name,
      txtRecord: {
        name: http.config.name, // cant put into subtype, it is too long
        version: http.config.version,
        nsp: http.namespace || "/"
      }//,
      //flags: mdns.kDNSServiceFlagsForceMulticast // linux avahi-compat-dns_sd cannot have flags...
    };

    // TODO: consider if ad interface should be an array, else not, loopback would not work
    if ( http._config.mdns && http._config.mdns.ad ) {
      if (undefined !== http._config.mdns.ad.interface) {
        if ( http._config.mdns.ad.interface === "lo") {
          adSettings.networkInterface = mdns.loopbackInterface();
          adSettings.host = "localhost";
        } else {
          adSettings.networkInterface = http._config.mdns.ad.interface;
        }
      }
      if (http._config.mdns.ad.domain) {
        adSettings.domain = http._config.mdns.ad.domain;
      }
    }
    function handleError(e){
      debug(e,e.stack);
    }

    debug("beginning advertisement");
    let port =   http._server.address().port;
    http._ad = new mdns.Advertisement(mdns.tcp('leaf-http'), port, adSettings, function(err, service){
      debug(`service registered: ${err} ${service.name}`);
    });
    http._ad.on("error", handleError);
    debug(`starting advertisement ${adSettings}`);
    http._ad.start();
  }
}

exports = module.exports = ServiceProvider;
