"use strict";
require("any-promise/register")("bluebird");

const logger = require("debug")("leaf:mw:mdns"),
  ServiceProvider = require("../provider/mdns");

var sp, options;

class middleware {
  constructor(opts) {
    options = opts || {};
    sp = new ServiceProvider();
  }

  * initialize(next) {
    logger("using leafjs mdns middleware");
    let leaf = this;
    if (!leaf._forConsole) {
      leaf.once("listening", () => {
        leaf.on("namespace", () => {
          sp.advertise(leaf);
        });
        sp.advertise(leaf);
      });
    }
    yield * next;
  }

  * destroy(next) {
    logger("destroy leafjs mdns middleware");
    yield new Promise((resolve) => {
      if (this._forConsole) {
        return resolve();
      }
      this._ad.stop();
      resolve()
    });
    yield * next;
  }
}

exports = module.exports = middleware;