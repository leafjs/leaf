"use strict";

const debugModule = require("debug"), debug = debugModule("leafjs:http:middleware:strengthen");

var options;

class middleware {
  constructor( opts ) {
    options = opts || {};
  }
  *initialize( next ) {
    debug("using leafjs strengthen middleware");

    let koa = this.koa;

    koa.use(require('koa-response-time')());

    koa.use(require('./trace')());

    koa.use(require('koa-compress')(options.compress));

    koa.use(require('./headers')(options.security));

    koa.use(function* errorHandler(next) {
      yield* this.app.errorHandler.call(this, next);
    });

    koa.use(function* pageNotFoundHandler(next) {
      yield* this.app.pageNotFoundHandler.call(this, next);
    });

    koa.use(require('./conditional-get')(options.etag));
    koa.use(require('koa-file-server')(options.fileServer));
    if (options.cash)
      koa.use(require('koa-cash')(options.cash));

    koa.use(require('koa-json')(options.json));

    if (options.session !== false)
      koa.use(require('koa-session')(options.session, koa));

    yield* next;
  }
}

exports = module.exports = middleware;
