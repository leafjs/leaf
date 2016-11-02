"use strict";

const dustMw = require('leaf-dust');
const reactMw = require('leaf-react');

class middleware {
  constructor(leaf, options) {
    options = options || {};

    leaf.use(require('./strengthen'), {
      session: options.session,
      security: options.security,
      json: options.json,
      fileServer: options.fileServer
    });

    leaf.use(require('./static-server'), options.fileServer);

    if (options.templates && options.templates.engine == 'dust') {
      leaf.use(dustMw, options.templates);
    } else if (options.templates && options.templates.engine == 'react') {
      leaf.use(reactMw, options.templates);
    }

    leaf.use(require('./body'));
    leaf.use(require('./controllers'));
    leaf.use(require('./socketio'));
    leaf.use(require('./mdns'));
    leaf.use(require('./service'));
    leaf.use(require('./passport'));

    if (leaf._env !== 'production') leaf.koa.use(require('koa-logger')());
  }
}


exports = module.exports = middleware;