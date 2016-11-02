"use strict";

var http2 = require("spdy");
var delegate = require('delegates');
var merge = require('merge-descriptors');

exports = module.exports = function decorate(leaf, options) {
  options = options || {};

  let koa = leaf.koa;
  // koa request
  let req = koa.req;
  // koa response
  let res = koa.res;
  // koa context
  let context = koa.context;
  // node request
  let request = koa.request;
  //node response
  let response = koa.response;

  merge(context, require('./context'));
  merge(request, require('./request'));
  merge(response, require('./response'));

  require('koa-csrf')(koa);
  require('koa-trace')(koa);
  require('koa-body-parsers')(koa);

  koa.jsonStrict = options.jsonStrict !== false;
  koa.errorHandler = require('koa-error')(options.error);
  koa.pageNotFoundHandler = function* pageNotFoundHandler(next) {
    yield * next;
    if (this.response.body) return;
    if (this.response.status !== 404) return;
    this.throw(404);
  };

  if (options.qs) {
    require('koa-qs')(koa);
    koa.querystring = require('qs');
  }

  if (options.jsonp) {
    require('koa-safe-jsonp')(koa, options.jsonp);
  }

  koa.listen = (port, cb, options) => {
    if (typeof port === "function") options = cb, cb = port, port = null;
    if (options === undefined && typeof cb !== "function") options = cb, cb = undefined;
    options = options || {};
    let koaCallback = koa.callback();

    let oldCallback = koaCallback;

    let server = http2.createServer(options.server);
    koaCallback = function onIncomingRequest(req, res) {
      req.socket = req.connection;
      res.socket = res.socket || res.stream;

      res.templateContext = {};
      res.connection = res.connection || res.socket;
      oldCallback(req, res);
    };

    let oldcb = cb;
    cb = function() {
      server.emit("listening");
      oldcb && oldcb();
    };

    server.on("request", koaCallback);
    server.on("checkContinue", function(req, res) {
      req.checkContinue = true;
      koaCallback(req, res);
    });
    server.listen(port || process.env.PORT, cb);

    return server;
  };

  if (koa._env !== 'production') koa.debug();
};