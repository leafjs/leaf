"use strict";
require("any-promise/register")("bluebird");

const glob = require("glob"),
  koaTrieRouter = require("koa-trie-router"),
  fs = require("fs"),
  pathModule = require("path"),
  methods = require("methods"),
  debugModule = require("debug"),
  compose = require("koa-compose"),
  debug = debugModule("leafjs:http:middleware:controller");

function genController(file, name, remove) {
  remove = remove === undefined ? false : remove;
  let path = pathModule.join(file), handlers;
  if (remove) {
    delete require.cache[path];
  }
  debug(`generating controller: ${path}`);
  handlers = require(path);
  return handlers;
}

var options;

class middleware {
  constructor( opts ) {
    options = opts || {};
  }

  *initialize(next) {
    yield* next;
    debug("using leafjs controller middleware");
    let http = this;
    let koa = http.koa;

    http._router = koaTrieRouter(koa);
    koa.use(http._router);

    for (let method of methods) {
      http[method] = function (route, fn) {
        if (arguments.length < 2) {
          throw `${method} ${route} handler has to have at least one fn`;
        }
        if (arguments.length > 2 || Array.isArray(fn)) {
          let fns = Array.isArray(fn) ? fn : [].slice.call(arguments, 1);

          fn = compose(fns);
        }
        koa[method](route, fn);
      };
    }

    let keysMap = {
      index: ["get", ""],
      create: ["get", "/:id/create"],
      store: ["post", ""],
      show: ["get", "/:id"],
      edit: ["get", "/:id/edit"],
      update: ["put", "/:id"],
      destroy: ["delete", "/:id"]
    };

    function resources(path, obj) {
      // requires various methods to be defined
      debug("looping through in resources helper");
      let mw = [].slice.call(arguments, 1);
      obj = mw.pop();
      let self = this;
      for (let key in keysMap) {

        let val = keysMap[key];
        let fn = obj[key] || obj.prototype[key];

        if (fn) {
          (function (fn, val) {
            debug("found the key?", key, obj);
            self[val[0]](path + val[1], mw.concat(function*() {
              return yield fn.call(this, this.req, this.res, this.app);
            }));
          })(fn, val);
        }
      }
    }

    http.group = function (path) {
      let router = [], mw = [].slice.call(arguments, 1, arguments.length - 1);
      for (let method of methods) {
        router[method] = function () {
          let args = [].slice.call(arguments, 0);
          debug("group router is triggered: " + args[0] + " transform into " + path + args[0]);
          args[0] = path + args[0];
          args.splice.apply(args, [1, 0].concat(mw));
          http[method].apply(http, args);
        };
      }
      router.resources = function () {
        resources.apply(router, arguments);
      };
      arguments[arguments.length - 1](router);
    };
    http.resources = function () {
      resources.apply(http, arguments);
    };

    try {
      yield (new Promise(function (resolve, reject) {
        let update = function () {
          http._router.router.trie.child = Object.create(null);
          http._router.router.trie.children = [];
          http.controllers = {};
          glob(pathModule.resolve(http.basepath, "./app/Http/Controllers/**/*.js"), function (er, files) {
            if (er) { return reject(er); }
            for (let f of files) {
              let substrLen = f.indexOf('app/Http/Controllers') + 'app/Http/Controllers/'.length;
              let name = f.substr(substrLen, f.length - (substrLen + 3));
              http.controllers[name] = genController(f, name, http.env !== "production");
              new http.controllers[name](http, debugModule([http._config.name, "controller", name]));
              debug(`loaded ${name} into app.controllers`);
            }
            debug(`complete initalizing controllers`);
            resolve();
          });
        };

        update();
        if (http.env !== "production") {
          fs.watch(pathModule.resolve(http.basepath, "./app/Http/Controllers/"), {recursive: true}, function () {
            debug("something updated", arguments);
            update();
          });
        }
      }));
    } catch (e) {
      debug("failed to load", e);
    }
  }
}

exports = module.exports = middleware;
