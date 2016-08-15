"use strict";
const debugModule = require("debug"), debug = debugModule("leafjs:http:middleware:jwt");
const JWT = require('../provider/jwt');

var options;

class middleware {
  constructor( opts ) {
    options = opts || {};
  }
  *initialize( next ) {
    debug("using leafjs json web token middleware");
    let koa = this.koa;

    koa.use(function *jwt(next) {
      debug("use koa json web token middleware");
      this.JWT = new JWT( options );
      yield *next;
    });

    yield* next;
  }
}

exports = module.exports = middleware;
