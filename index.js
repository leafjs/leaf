"use strict";

const debug = require("debug");

const co = require('bluebird-co');
const Koa = require('leaf-koa');

const compose = require('koa-compose');
const yaml = require('read-yaml');
const extend = require('extend');
const pkgModule = require('./lib/helper/pkg_helpers');
const Emitter = require("events").EventEmitter;
const closest = require("closest-package");
const pathModule = require('path');
const fs = require('mz/fs');

const Middleware = require('./lib/middleware');
const Decorator = require('./lib/decorator');

const logger = debug("leaf");

const DEFAULTS = {
  port: 8000,
  host: undefined,
  fileServer: {
    root: '/public',
    uri: '/static'
  },
  passport: {
    domain: "localhost"
  },
  session: {
    key: 'leaf.sid',
    prefix: 'leaf:sess:'
  },
  templates: {
    engine: 'dust'
  },
  db: false,
  mdns: true
};

/**
 * Leaf server Class
 * @class
 * @extends Emitter
 */
class Leaf extends Emitter {
  /**
   * Leaf server 构造函数
   * @constructor
   * @param {object} mod - module.
   * @param {object} config - 覆盖默认配置.
   */
  constructor(mod, config) {
    super();
    if (!(this instanceof Leaf)) return new Leaf(mod, config);
    logger(`root pwd is ${pathModule.resolve(".")}`);

    this._ns = "/";
    this._pkginfo = pkgModule(mod);
    logger("Reads package.json file content:", "\n", this._pkginfo);

    this._basepath = pathModule.dirname(closest.sync(pathModule.dirname(mod.filename)));
    this._env = process.env.NODE_ENV = process.env.NODE_ENV || "development";

    const configPath = pathModule.resolve(this._basepath, './config/server.yml');
    logger("Configuration file path: ", configPath);
    if (!config && !fs.existsSync(configPath)) {
      throw new Error('Not found the configuration file, Please rename server.yml.example to server.yml');
    }
    this._config = extend(true, DEFAULTS, yaml.sync(configPath)[this._env], config || {});
    this._config.name = this._pkginfo.name;
    this._config.version = this._pkginfo.version;
    try {
      this._config.services = yaml.sync(pathModule.resolve(this._basepath, "./config/services.yml"))[this._env];
    } catch (e) {
      logger("Not found the services.yml file");
      this._config.services = false;
    }

    let koa = this._koa = Koa();
    koa.leaf = this;
    koa.keys = ["notasecret"];

    let decorator = new Decorator(this);

    let middleware = new Middleware(this, {
      fileServer: this._config.fileServer,
      session: {
        key: this._config.session.key,
        prefix: this._config.session.prefix
      },
      security: {
        xframe: "same"
      },
      json: {
        pretty: false,
        param: 'pretty'
      },
      templates: this._config.templates
    });
  }

  /**
   * leaf 加载 Middleware方法
   *
   * @param {middleware} mw - leaf middleware
   * @param {object} options - middleware options
   */
  use(mw, options) {
    this._middleware = this._middleware || [];
    var args = new Array(arguments.length);
    for (var i = 1; i < args.length; ++i) {
      args[i - 1] = arguments[i];
    }

    let middleware = new mw(options);
    if (require("util").isFunction(middleware)) {
      middleware = middleware.apply(this, args);
    }
    this._middleware.push(middleware);
  }

  /**
   * 启动 leaf server
   *
   * @param {Leaf} app - leaf instance
   * @param {boolean} forConsole
   * @return {Leaf}
   */
  start(app, forConsole) {
    let leaf = this;
    leaf._forConsole = forConsole;

    return new Promise((resolve, reject) => {
      //if bootstrap function exist, call bootstrap function
      leaf.bootstrap && leaf.bootstrap();

      let serverMw = function* startServer(next) {
        logger("require pmx and initalizing");
        require("pmx").init();

        yield * next;

        logger("going into send step of starting server");
        let options = {
          server: {
            spdy: {
              protocols: ['h2', 'http/1.1'],
              plain: true,
              connection: {
                windowSize: 1024 * 1024
              }
            }
          }
        };
        if (leaf._config.ssl) {
          options.server.key = fs.readFileSync(leaf._config.ssl.key);
          options.server.cert = fs.readFileSync(leaf._config.ssl.cert);
          options.server.spdy.plain = false;
        }

        let server;
        if (forConsole) {
          logger("starting with sock");
          server = leaf._server = leaf.koa.listen("/tmp/" + Math.random() + Date.now() + ".sock", options);
        } else {
          logger(`Trying to listen to ${leaf._config.port} port`);
          server = leaf._server = leaf.koa.listen(leaf._config.port, options);
        }

        let completed = false;
        logger("waiting for listen event");
        server.once("listening", function() {
          logger("Receiving listening event!");
          if (completed) {
            resolve(leaf);
            leaf.emit("listening", leaf);
          }
          completed = true;
        });

        if (completed) {
          logger("It has already completed");
          resolve(leaf);
          leaf.emit("listening", leaf);
        }
        completed = true;
      };

      if (app && "__micro_plate__" in app) {
        leaf._mounted = true;
        leaf._server = app._server;
        leaf._sioInstance = app._sioInstance;
        logger("server is mounting");
        serverMw = function* startMounted(next) {
          logger("starting server mw");
          app.once("listening", function() {
            leaf.emit("listening", leaf);
          });
          logger("resolving for mounting server");
          yield * next;
          logger("going into send step of starting server for platter");
          resolve(leaf);
        };
      }
      logger("preparing to start leaf server...");
      try {
        let fn = co.wrap(compose([serverMw].concat(leaf._middleware.map(function(el) {
          return el.initialize;
        }).filter(function(el) {
          return undefined !== el;
        }))));

        logger("starting server...");
        fn.call(leaf).catch(reject);
      } catch (e) {
        logger("catch starting server...");
        logger(e.stack);
      }
    }).catch(function(err) {
      logger("catch starting server promise...");
      logger(err.stack);
    });
  }

  /**
   * 关闭 leaf server
   */
  close() {
    logger("closing leaf server now...");
    return new Promise((resolve, reject) => {
      let fn = co.wrap(compose((this._middleware.map(function(el) {
        return el.destroy;
      }).filter(function(el) {
        return undefined !== el;
      }))));

      fn.call(this).then(() => {
        logger(`middleware teardown completed, closing server`);
      }).catch(reject);

      if (!this._mounted) {
        this._server.close();
        this._server.on("close", (err) => {
          logger(`server has closed, beginning of the end`);
          if (err) {
            logger(`server temination failed with ${err}`);
            return reject(err);
          }
          logger(`server closed`);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * get koa instance
   *
   * @return {Koa} koajs instance
   */
  get koa() {
    return this._koa;
  }

  /**
   * get config
   *
   * @return {object} leafjs config
   */
  get config() {
    return this._config;
  }

  /**
   * set config
   *
   * @param {object} config
   */
  set config(config) {
    return this._config = config;
  }

  get pkginfo() {
    return this._pkginfo;
  }

  get basepath() {
    return this._basepath;
  }

  get env() {
    return this._env;
  }

  set namespace(ns) {
    this._ns = ns;
    this.emit("namespace", ns);
  }

  get namespace() {
    return this._ns;
  }

  get middleware() {
    return this._middleware;
  }
}

exports = module.exports = Leaf;