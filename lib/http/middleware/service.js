"use strict";

require("any-promise/register")("bluebird");

const mdns = require("leaf-mdns"),
  debug = require("debug")("leafjs:http:middleware:service");

const Service = require('../provider/service');

var options;

class middleware {
  constructor( opts ) {
    options = opts || {};
  }

  *initialize(next) {
    debug("using leafjs service middleware");
    let http = this;
    yield (new Promise((resolve) => {
      debug("initialize service middleware");
      http._services = {};
      http.services = (name) => {
        if (!http._services[name]) {
          throw "service missing in package.json[services]";
        }
        return http._services[name];
      };
      for (let name in (http.pkginfo.services || {})) {
        http._services[name] = new Service(name, http.pkginfo.services[name], http);
      }
      resolve();
    }));
    yield* next;
  }

  *destroy(next) {
    debug("destroy leafjs service middleware");
    let http = this;
    let promises = [];
    for (let name in http._services) {
      promises.push(new Promise((resolve) => {
        if (!http._services[name].sioClient) {
          return Promise.resolve(true);
        }
        http._services[name].sioClient.on("disconnect", ()=> {
          debug("disconnected", name);
          resolve();
        });
        debug("disconnecting", name);
        http._services[name].sioClient.disconnect();
      }));
    }
    yield Promise.all(promises);
    yield* next;
  }
}

exports = module.exports = middleware;
