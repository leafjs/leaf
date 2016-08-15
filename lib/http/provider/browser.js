"use strict";
require("any-promise/register")("bluebird");

const debug = require("debug")("leafjs:http:provider:browser");

const mdns = require("leaf-mdns");
const semver = require("semver");

var mDnsBrowser, globalDnsCache = {};

class Browser {
  constructor() {
    function serviceUp(service) {
      debug(`serviceup: ${service.type.name}`, service);
      if (service.type.name !== "leaf-http") {
        debug('ignoring service, service name not leaf-http');
        return;
      }
      if (!service.txtRecord || !service.txtRecord.version) {
        debug('ignoring service, service.txtRecord does not exist');
        return;
      }

      let host;
      for (let i = 0; i < service.addresses.length; i++) {
        if (!service.addresses[i].includes(":")) {
          host = service.addresses[i];
        }
      }
      if (!host) {
        debug('ipv4 not found, ignoring service');
        return;
      }
      let type = (globalDnsCache[service.txtRecord.name] = globalDnsCache[service.txtRecord.name] || {});
      let ver = type[service.txtRecord.version] = type[service.txtRecord.version] || {indices: [], services: {}};
      let id = service.host + ":" + service.port;
      ver.services[id] = service;
      ver.indices.push(id);
      debug('adding service to dns cache');
    }

    function serviceDown(service) {
      let type, ver;
      debug(`service ${service} is down`);
      if ((type = (globalDnsCache[service.type.name])) && (ver = type[service.txtRecord.version])) {
        let id = `${service.host}:${service.port}`;
        delete ver.services[id];
        ver.indices.filter(function (e) {
          return e === id;
        });
      }
    }

    function browserError(err, service) {
      debug("browser error:", err, err.stack);
      debug("service:", service);
    }

    if (!mDnsBrowser) {
      // mDnsBrowser = mdns.browseThemAll();
      // probably will require one more for loopback interface
      debug("creating service browser");
      mDnsBrowser = new mdns.Browser(mdns.tcp("leaf-http"), {
        resolverSequence: [
          mdns.rst.DNSServiceResolve(),
          mdns.rst.DNSServiceGetAddrInfo({families: [4]})
          // mdns.rst.getaddrinfo({families:[4]})
          // ('DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo : mdns.rst.getaddrinfo)({families:[4]})
        ]
      });
      mDnsBrowser.on("serviceUp", serviceUp);
      mDnsBrowser.on("serviceChanged", serviceUp);
      mDnsBrowser.on("serviceDown", serviceDown);
      mDnsBrowser.on("error", browserError);
      debug("starting service browser");
      mDnsBrowser.start();
    }
  }

  get(name, ver) {
    let time = new Date();
    // think of a way to refactor this into a generator, so we can just store that as a cache and yield everytime
    // hopeful usage would be:
    // var service = cache[service@version].next();
    // service.request(method, data, blabla);
    debug(`getting service(${name}@${ver})`);
    return new Promise((resolve, reject) => {
      function resolver() {
        debug("looping through browser caches");
        // keep trying for a specific amount of time, now hard coded, 1s
        if (new Date() - time > 2000) {
          debug("timeout");
          return reject();
        }
        if (name in globalDnsCache) {
          debug("name is found in globaDnsCache");
          let topver = undefined;
          for (let gver in globalDnsCache[name]) {
            if (semver.satisfies(gver, ver)) {
              if (topver === undefined || semver.gt(gver, topver)) {
                topver = gver;
              }
            }
          }
          if (topver) {
            debug("round robinning");
            // lets first do round robin
            let pool = globalDnsCache[name][topver];
            let c = ( (pool.lastCounter === null || pool.lastCount === undefined) ? 0 : pool.lastCounter);

            if (c + 1 > pool.indices.length) {
              c = -1;
            }
            pool.lastCounter++;
            debug("pool is:" + JSON.stringify(pool.services));
            debug("resolved with:" + pool.services[pool.indices[c + 1]]);
            // TODO: handle cases where it is not found
            return resolve(pool.services[pool.indices[c + 1]]);
          }
        }
        setTimeout(resolver, 30);
      }
      process.nextTick(resolver);
    });
  }
}

exports = module.exports = Browser;
