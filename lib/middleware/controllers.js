"use strict";
require("any-promise/register")("bluebird");

const glob = require("glob"),
  koaTrieRouter = require("koa-trie-router"),
  fs = require("fs"),
  pathModule = require("path"),
  methods = require("methods"),
  debug = require("debug"),
  compose = require("koa-compose"),
  logger = debug("leaf:mw:controller");

function genController(file, name, remove) {
  remove = remove === undefined ? false : remove;
  let path = pathModule.join(file),
    handlers;
  if (remove) {
    delete require.cache[path];
  }
  logger(`generating controller: ${path}`);
  handlers = require(path);
  return handlers;
}

let options;

class middleware {
  constructor(opts) {
    options = opts || {};
  }

  * initialize(next) {
    yield * next;
    logger("using leafjs controller middleware");
    let leaf = this;
    let koa = leaf.koa;

    leaf._router = koaTrieRouter(koa);
    koa.use(leaf._router);

    for (let method of methods) {
      leaf[method] = function(route, fn) {
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
      logger("looping through in resources helper");
      let mw = [].slice.call(arguments, 1);
      obj = mw.pop();
      let self = this;
      for (let key in keysMap) {

        let val = keysMap[key];
        let fn = obj[key] || obj.prototype[key];

        if (fn) {
          (function(fn, val) {
            logger("found the key?", key, obj);
            self[val[0]](path + val[1], mw.concat(function*() {
              return yield fn.call(this, this.req, this.res, this.app);
            }));
          })(fn, val);
        }
      }
    }

    leaf.group = function(path) {
      let router = [],
        mw = [].slice.call(arguments, 1, arguments.length - 1);
      for (let method of methods) {
        router[method] = function() {
          let args = [].slice.call(arguments, 0);
          logger("group router is triggered: " + args[0] + " transform into " + path + args[0]);
          args[0] = path + args[0];
          args.splice.apply(args, [1, 0].concat(mw));
          leaf[method].apply(leaf, args);
        };
      }
      router.resources = function() {
        resources.apply(router, arguments);
      };
      arguments[arguments.length - 1](router);
    };
    leaf.resources = function() {
      resources.apply(leaf, arguments);
    };

    try {
      yield(new Promise(function(resolve, reject) {
        let update = function() {
          leaf._router.router.trie.child = Object.create(null);
          leaf._router.router.trie.children = [];
          leaf.controllers = {};
          glob(pathModule.resolve(leaf.basepath, "./app/controllers/**/*.js"), function(er, files) {
            if (er) {
              return reject(er);
            }
            for (let f of files) {
              let substrLen = f.indexOf('app/controllers') + 'app/controllers/'.length;
              let name = f.substr(substrLen, f.length - (substrLen + 3));
              leaf.controllers[name] = genController(f, name, leaf.env !== "production");
              new leaf.controllers[name](leaf, debug([leaf._config.name, "controller", name].join(':')));
              logger(`loaded ${name} into app.controllers`);
            }
            logger(`complete initalizing controllers`);
            resolve();
          });
        };

        update();
        if (leaf.env !== "production") {
          fs.watch(pathModule.resolve(leaf.basepath, "./app/controllers/"), {
            recursive: true
          }, function() {
            logger("something updated", arguments);
            update();
          });
        }
      }));
    } catch (e) {
      logger("failed to load", e);
    }
  }
}

exports = module.exports = middleware;