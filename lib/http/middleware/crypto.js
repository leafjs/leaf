"use strict";

const debug = require("debug")("leafjs:http:middleware:crypter");
const Crypter = require('../provider/crypter');

class middleware {
  constructor( options ) {

  }

  *initialize( next ) {
    debug("using leafjs crypto middleware");

    let koa = this.koa;

    koa.use(function *crypter(next) {
      debug("use koa crypter middleware");
      this._crypter = new Crypter(this);
      yield* next;
    });

    yield* next;
  }
}

exports = module.exports = middleware;
