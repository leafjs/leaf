"use strict";
require("any-promise/register")("bluebird");

const codust = require("co-dust");
const debug = require("debug")("leafjs:http:middleware:dust");
const moment = require("moment");
const glob = require("glob");
const fs = require("fs");
const mkdirp = require("mkdirp");
const extend = require("extend");
const pathModule = require("path");

const tmpDir = "./.tmp/View";
const viewDir = "app/View";

const DEFAULTS = {
  precompile: false,
  cache: false
};

var options;

class middleware {
  constructor(opts) {
    options = extend({}, DEFAULTS, opts || {});
  }

  *initialize(next) {
    debug("using leafjs dust template middleware");

    let http = this;
    let koa = this.koa;
    let dust;
    if (options.precompile) {
      dust = new codust( { base: pathModule.resolve(http.basepath, tmpDir), precompiled: options.precompile } );
      dust._dust.config.cjs = true;
      yield new Promise(function (resolve, reject) {
        mkdirp.sync(tmpDir);
        glob(viewDir + "/**/*.dust", function (err, files) {
          if (err) {
            reject(err);
          }
          files.map(function (file) {
            return [fs.readFileSync(file).toString(), file.substr([viewDir, "/"].join('').length)];
          }).map(function (data) {
            mkdirp.sync(pathModule.join(tmpDir, pathModule.dirname(data[1])));
            return fs.writeFileSync(pathModule.join(tmpDir, data[1]), dust._dust.compile(data[0], data[1]));
          });
          resolve();
        });
      });
    } else {
      dust = new codust({base: pathModule.resolve(http.basepath, ["./", viewDir].join('')) });
    }

    this._dust = dust;
    let helpers = require("../helper/dust_helpers");
    helpers(dust._dust);

    koa.use(function* dustMiddleware(next) {
      debug("use koa co-dust middleware");
      let koaContext = this;
      this.render = function*(path, context) {
        context = context || {};
        if (this.res.templateContext) {
          context = extend(this.res.templateContext, context);
        }
        context.loggedIn = koaContext.req.isAuthenticated;
        context.user = koaContext.req.user;
        context.today = moment();
        if (false === options.cache) {
          delete http._dust._dust.cache[path];
        }
        koaContext.body = yield dust.render(path, context);
      };
      yield* next;
    });

    yield* next;
  }
}


exports = module.exports = middleware;
