"use strict";

const debugModule = require("debug"), debug = debugModule("leafjs:http:middleware");


class middleware {
  constructor( http, options ) {
    options = options || {};

    http.use(require('./strengthen'), {
      session: options.session,
      security: options.security,
      json: options.json,
      fileServer: options.fileServer
    });

    if (options.cookies !== false) {
      http.koa.use(function* cookies(next) {
        debug("use koa cookies middleware", options.cookies);
        this.cookies = require('../provider/cookies')(this.req, this.res, options.cookies);
        yield* next;
      });
    }
    http.use(require('./static-server'), options.fileServer);
    http.use(require('./jwt'));
    if( options.templates && options.templates.engine == 'dust') {
      http.use(require('./dust'), options.templates);
    } else if( options.templates && options.templates.engine == 'react' ){
      http.use(require('./react'), options.templates);
    }
    http.use(require('./body'));
    http.use(require('./controllers'));
    http.use(require('./socketio'));
    http.use(require('./mdns'));
    http.use(require('./service'));
    http.use(require('./passport'));
    http.use(require('./crypto'));

    if (http._env !== 'production') http.koa.use(require('koa-logger')());
  }
}


exports = module.exports = middleware;
