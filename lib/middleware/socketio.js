"use strict";

const compose = require("koa-compose"),
  socketio = require("socket.io"),
  co = require("bluebird-co"),
  logger = require("debug")("leaf:mw:socketio"),
  ServerResponse = require("mock-res"),
  IncomingMessage = require("mock-req"),
  EventEmitter = require("eventemitter2").EventEmitter2,
  util = require("util"),
  extend = require("extend");
require("../decorator/passport-req")(IncomingMessage.prototype);

var options;

class middleware {
  constructor(opts) {
    options = opts || {};
  }

  * initialize(next) {
    logger("using leafjs socketio middleware");

    let leaf = this;
    let koa = leaf.koa;
    let nsp = leaf.namespace || "/";

    function handler(origHeaders) {
      logger("delete accept-encoding in origHeaders");
      delete origHeaders["accept-encoding"];
      return function _handler(method, route, data, headers, cb) {
        logger(`trigger socket.io s handler, with (${method}, ${route}, ${data}, ${headers})`);
        if (undefined === cb) { //arguments is method, route, headers, cb
          cb = headers;
          headers = data;
        }
        if (undefined === headers) { //arguments is method, route, cb
          cb = data;
        }
        let downstream = koa.middleware ? koa.middleware : koa;
        headers = headers || {};

        headers["content-type"] = headers["content-type"] || "application/json";
        headers = extend(origHeaders, headers);

        if ("get head delete".split(" ").indexOf(method.toLowerCase()) >= 0 && data) {
          route += "?" + require("querystring").stringify(data);
        }
        let req = new IncomingMessage({
          method: method.toUpperCase(),
          url: route,
          headers: headers || {}
        });
        req.connection = this.conn.request.connection;
        req.socket = req.connection;
        // require('extend')(req, this.conn.request);
        if (("get head delete".split(" ").indexOf(method.toLowerCase()) < 0) && data) {
          let dataString = JSON.stringify(data);
          req.headers["content-length"] = Buffer.byteLength(dataString, 'utf8');
          req.write(dataString);
          req.end();
        }
        let res = new ServerResponse();

        // filling up the headersSent problem
        // res.headersSent = false;
        // res.socket = this.conn.transport;

        // callback.call(leaf.koa, req, res);

        let context = koa.createContext(req, res);
        let fn = co.wrap(compose(downstream));

        fn.call(context).then(function() {
          let res = context.response;
          logger(`completed ${method} ${route} with ${res.status}, ${res.header}, ${res.body}`);
          if (util.isFunction(cb)) {
            if (res.body && res.body.on) {
              let buf = [];
              res.body.on("data", function(chunk) {
                buf.push(chunk.toString("utf8"));
              });

              function onEnd(chunk) {
                if (chunk) {
                  buf.push(chunk.toString("utf8"));
                }
                logger("chunk body ended");
                res.body.removeListener('end', onEnd);
                cb(res.status, res.header, buf.join(""));
              };
              res.body.on('end', onEnd);
            } else {
              logger("res body is undefined", res.body);
              cb(res.status, res.header, res.body);
            }
          }
        }).catch(context.onerror);
      };
    }

    yield(new Promise(function(resolve) {
      leaf.once("listening", function() {
        logger("trigger leaf listening event");
        logger("listening leaf namespace event");
        leaf.on("namespace", function() {
          logger("trigger leaf namespace event");
          let nsp = leaf.namespace || "/"; //if leaf namespace undefined,set default /
          leaf._sio.close();
          logger("begin set up a custom namespace for socket.io");
          leaf._sio = leaf._sioInstance.of(nsp);
          logger("listening custom namespace socket.io connection event");
          leaf._sio.on("connection", function(socket) {
            logger("trigger custom namespace socket.io connection event");
            logger("emit leafjs sio connection event");
            leaf.sio.emit("connection", socket);
          });
        });
        if (!leaf._sioInstance) {
          logger("leaf _sioInstance undefined, new socket.io instance");
          leaf._sioInstance = socketio(leaf._server);
        }
        logger("begin set up a custom namespace for socket.io");
        leaf._sio = leaf._sioInstance.of(nsp);
        logger("listening custom namespace socket.io connection event");
        leaf._sio.on("connection", function(socket) {
          logger("trigger custom namespace socket.io connection event");
          logger("emit leaf sio connection event");
          leaf.sio.emit("connection", socket);
        });
      });

      resolve();
    }));

    logger("create leaf sio EventEmitter");
    leaf.sio = new EventEmitter({});
    logger("listening leaf sio connection event");
    leaf.sio.on("connection", function(socket) {
      logger("trigger leaf sio EventEmitter connection event");
      logger("listening socket.io s handler")
      socket.on("s", handler(socket.request.headers));
    });
    yield * next;
  }

  * destroy(next) {
    logger("destroy leaf socketio middleware");
    yield new Promise((resolve, reject) => {
      if (!this._mounted && this._sio.close) {
        this._sio.close();
        logger("closing custom namespace socket.io connection");
      }
      resolve();
    });
    yield * next;
  }
}

exports = module.exports = middleware;