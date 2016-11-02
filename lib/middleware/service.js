"use strict";

require("any-promise/register")("bluebird");

const mdns = require("leaf-mdns"),
  logger = require("debug")("leaf:mw:service");

const Service = require('../provider/service');

var options;

class middleware {
  constructor(opts) {
    options = opts || {};
  }

  * initialize(next) {
    logger("using leafjs service middleware");
    let leaf = this;
    yield(new Promise((resolve) => {
      logger("initialize service middleware");
      leaf._services = {};
      leaf.services = (name) => {
        if (!leaf._services[name]) {
          throw "service missing in package.json[services]";
        }
        return leaf._services[name];
      };
      for (let name in (leaf.pkginfo.services || {})) {
        leaf._services[name] = new Service(name, leaf.pkginfo.services[name], leaf);
      }
      resolve();
    }));
    yield * next;
  }

  * destroy(next) {
    logger("destroy leafjs service middleware");
    let promises = [];
    for (let name in this._services) {
      promises.push(new Promise((resolve) => {
        if (!this._services[name].sioClient) {
          return Promise.resolve(true);
        }
        this._services[name].sioClient.on("disconnect", () => {
          logger("disconnected", name);
          resolve();
        });
        logger("disconnecting", name);
        this._services[name].sioClient.disconnect();
      }));
    }
    yield Promise.all(promises);
    yield * next;
  }
}

exports = module.exports = middleware;