"use strict";

const debug = require("debug"),
  logger = debug("leaf:mw:strengthen");

const JWT = require('../provider/jwt');
const Crypter = require('../provider/crypter');

var options;

class middleware {
  constructor(opts) {
    options = opts || {};
  }

  * initialize(next) {
    logger("using leaf strengthen middleware");

    let koa = this.koa;

    koa.use(require('koa-response-time')());

    koa.use(require('./trace')());

    koa.use(require('koa-compress')(options.compress));

    koa.use(require('./headers')(options.security));

    koa.use(function* errorHandler(next) {
      yield * this.app.errorHandler.call(this, next);
    });

    koa.use(function* pageNotFoundHandler(next) {
      yield * this.app.pageNotFoundHandler.call(this, next);
    });

    koa.use(require('./conditional-get')(options.etag));
    koa.use(require('koa-file-server')(options.fileServer));
    if (options.cash)
      koa.use(require('koa-cash')(options.cash));

    koa.use(require('koa-json')(options.json));

    if (options.session !== false)
      koa.use(require('koa-generic-session')(options.session));

    koa.use(function* jwt(next) {
      this.JWT = new JWT(options.jwt);
      yield * next;
    });

    koa.use(function* crypter(next) {
      this._crypter = new Crypter(this);
      yield * next;
    });

    yield * next;
  }
}

exports = module.exports = middleware;