"use strict";

const debug = require("debug"),
  logger = debug("leaf:mw:passport");

const passport = require("koa-passport");

var options;

class middleware {
  constructor(opts) {
    options = opts || {};
  }

  * initialize(next) {
    logger("using leafjs passport middleware");
    let koa = this.koa;
    if (options.passport !== false) {
      koa.use(passport.initialize());
      koa.use(passport.session());
      koa.passport = passport;
    }
    yield * next;
  }
}

exports = module.exports = middleware;