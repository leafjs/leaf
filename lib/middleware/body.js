"use strict";
const debug = require("debug"),
  multipart = require('co-multipart'),
  override = require("koa-override-method"),
  cobody = require("co-body"),
  logger = debug("leaf:mw:body");


let options;

class middleware {
  constructor(opts) {
    options = opts || {};
  }

  * initialize(next) {
    let koa = this.koa;

    logger("using leafjs body middleware");

    koa.use(function* bodyParseMiddleware(next) {
      let body, parts;
      let contentType = this.req.headers['content-type'],
        contentLength = this.req.headers["content-length"],
        transferEncoding = this.req.headers["transfer-encoding"];

      if (contentType && /application\/x-www-form-urlencoded/.test(contentType)) {
        if (this.request.method === "POST") {
          if (!contentLength && !transferEncoding) {
            body = {};
          } else {
            if (/multipart/.test(contentType)) {
              parts = yield * multipart(this);
              body = parts.fields.reduce((prev, cur, index, arr) => {
                prev[cur[0]] = cur[1];
                return prev;
              });
              body.files = parts.files;
            } else {
              body = yield cobody(this);
            }
            let method = override.call(this, body);
            this.request.method = method;
            this.req.method = method;
            delete body._method;
          }
        }
      }

      let self = this;
      this.req.body = function*() {
        logger("req.body req headers:", self.req.headers, body);
        if (!self.req.headers["content-length"] && !self.req.headers["transfer-encoding"]) {
          logger("it doesnt have content-length neither does it have transfer-encoding, set it empty");
          body = {};
          return body;
        }
        if (body) {
          logger("body is already parsed before", body);
          return body;
        }
        self.req.headers['content-type'] = self.req.headers['content-type'] || "application/x-www-form-urlencoded";
        if (self.req.headers['content-type'].match(/multipart/)) {
          logger("this header contains multipart");
          parts = yield * multipart(this);
          body = parts.fields.reduce((prev, cur, index, arr) => {
            prev[cur[0]] = cur[1];
            return prev;
          }, {});
          body.files = parts.files;
          logger('body is now', body);
        } else {
          logger("call cobody");
          body = yield cobody(this);
        }
        delete body._method;
        return body;
      };

      yield * next;
      if (parts) {
        parts.dispose();
      }
    });

    yield * next;
  }
}

exports = module.exports = middleware;