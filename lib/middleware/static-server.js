"use strict";

const debug = require("debug"),
  logger = debug("leaf:mw:static");

const send = require('koa-send');
const fs = require('mz/fs');
var options;

class middleware {
  constructor(opts) {
    options = opts || {};
  }

  * initialize(next) {
    logger("using leaf static server middleware");
    let leaf = this;
    let koa = this.koa;

    koa.use(function* staticServer(next) {
      let path = options.uri;
      if (this.request.path) {
        if (leaf.namespace && leaf.namespace !== "/") {
          path = leaf.namespace + path;
        }
        if (this.request.url.startsWith(path)) {
          yield send(this, this.request.path.substr(path.length + 1), {
            root: leaf.basepath + options.root
          });
          return;
        }
      }

      this.res.pushStatic = ((reqPath, originalPath) => {
        let rs = this.res;
        if (reqPath.startsWith(path)) {
          // first implement a naive implementation
          let stream = this.res.push(originalPath, {
            request: {
              accepts: "*/*",
              "accept-encoding": "gzip"
            },
            response: {
              vary: "accept-encoding"
                // "content-encoding": "gzip"
            }
          });
          let localPath = leaf.basepath + options.root + reqPath.substr(path.length);
          return fs.exists(localPath + ".gz").then((exists) => {
            if (exists) {
              stream.sendHeaders({
                "content-encoding": "gzip"
              });
              fs.createReadStream(localPath + ".gz").pipe(stream);
              return true;
            }
            return fs.exists(localPath);
          }).then((exists) => {
            if (exists) {
              fs.createReadStream(localPath).pipe(stream);
              return true;
            }
            stream.headers[":status"] = 404;
          })
        }
        return Promise.resolve(true)
      });
      yield * next;
    });

    yield * next;
  }
}

exports = module.exports = middleware;