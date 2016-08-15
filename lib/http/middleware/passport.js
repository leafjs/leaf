"use strict";

const debugModule = require("debug"), debug = debugModule("leafjs:http:middleware:passport");

const passport = require("koa-passport");

var options;

class middleware {
  constructor( opts ) {
    options = opts || {};
  }

  *initialize( next ) {

    let koa = this.koa;

    if (options.passport !== false) {
      koa.use(passport.initialize());
      koa.use(passport.session());
      koa.passport = passport;
    }
    yield* next;
  }
}

exports = module.exports = middleware;
