"use strict";
require("any-promise/register")("bluebird");

const debugModule = require("debug"), debug = debugModule("leafjs:http");

const Koa = require('leaf-koa');
const co = require('bluebird-co');
const compose = require('koa-compose');
const yaml = require('read-yaml');
const extend = require('extend');
const pkgModule = require('./helper/pkg_helpers');
const Emitter = require("events").EventEmitter;
const closest = require("closest-package");
const pathModule = require('path');
const fs = require('mz/fs');

const Middleware = require('./middleware');
const Decorator = require('./decorator');

//Http Default configuration
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
    key: 'leaf:sess'
  },
  templates: {
    engine: 'dust'
  },
  db: false,
  mdns: true
};

/**
 * Http server Class
 * @class
 * @extends Emitter
 */
class Http extends Emitter {
/**
 * Http server 构造函数
 * @constructor
 * @param {object} mod - module.
 * @param {object} config - 覆盖默认配置.
 */
  constructor(mod, config) {
    super();
    if (!(this instanceof Http)) return new Http(mod, config);
    debug(`root pwd is ${pathModule.resolve(".")}`);

    this._ns = "/";

    this._pkginfo = pkgModule(mod);
    debug("Reads package.json file content:", "\n", this._pkginfo);

    this._basepath = pathModule.dirname(closest.sync(pathModule.dirname(mod.filename)));
    this._env = process.env.NODE_ENV = process.env.NODE_ENV || "development";

    const configPath = pathModule.resolve(this._basepath, './config/server.yml');
    debug("Configuration file path: ", configPath);
    if (!config && !fs.existsSync(configPath)) {
      throw new Error('Not found the configuration file, Please rename server.yml.example to server.yml');
    }
    this._config = extend( true, DEFAULTS, yaml.sync(configPath)[this._env], config || {});
    this._config.name = this._pkginfo.name;
    this._config.version = this._pkginfo.version;
    try {
      this._config.services = yaml.sync(pathModule.resolve(this._basepath, "./config/services.yml"))[this._env];
    } catch(e) {
      debug("Not found the services.yml file");
      this._config.services = false;
    }

    let koa = this._koa = Koa();
    koa.http = this;

    let decorator = new Decorator(this);

    let middleware = new Middleware(this, {
      fileServer: this._config.fileServer,
      session: {
        key: this._config.session.key,
        domain: this._config.passport.domain
      },
      cookies: {
        keys: ["notasecret"]
      },
      security: {
        xframe: "same"
      },
      json: { pretty: false, param: 'pretty' },
      templates: this._config.templates
    });
  }

  /**
   * http 加载 Middleware方法
   *
   * @param {middleware} mw - leafjs middleware
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
   * 启动 http 服务
   *
   * @param {Http} app - leafjs http instance
   * @param {boolean} forConsole
   * @return {Http}
   */
  start( app, forConsole ) {
    let http = this;
    http._forConsole = forConsole;

    return new Promise((resolve, reject) => {
      //if bootstrap function exist, call bootstrap function
      http.bootstrap && http.bootstrap();

      let serverMw = function *startServer(next) {
        debug("require pmx and initalizing");
        require("pmx").init();

        yield* next;

        debug("going into send step of starting server");
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
        if (http._config.ssl) {
          options.server.key = fs.readFileSync(http._config.ssl.key);
          options.server.cert = fs.readFileSync(http._config.ssl.cert);
          options.server.spdy.plain = false;
        }

        let server;
        if ( forConsole ) {
          debug("starting with sock");
          server = http._server = http.koa.listen("/tmp/"+Math.random()+Date.now()+".sock", options);
        } else {
          debug(`Trying to listen to ${http._config.port} port`);
          server = http._server = http.koa.listen(http._config.port, options);
        }

        let completed = false;
        debug("waiting for listen event");
        server.once("listening", function(){
            debug("Receiving listening event!");
            if ( completed ) {
                resolve(http);
                http.emit("listening", http);
            }
            completed = true;
        });

        if ( completed ) {
            debug("It has already completed");
            resolve(http);
            http.emit("listening", http);
        }
        debug("should get here");
        completed = true;
      };

      if ( app && "__micro_plate__" in app ) {
          http._mounted = true;
          http._server = app._server;
          http._sioInstance = app._sioInstance;
          debug("server is mounting");
          serverMw = function* startMounted(next){
              debug("starting server mw");
              app.once("listening", function(){
                  http.emit("listening", http);
              });
              debug("resolving for mounting server");
              yield* next;
              debug("going into send step of starting server for platter");
              resolve(http);
          };
      }
      debug("preparing to start leafjs http server...");
      try {
        let fn = co.wrap(compose([serverMw].concat(http._middleware.map(function (el) {
          return el.initialize;
        }).filter(function (el) {
          return undefined !== el;
        }))));

        debug("starting server...");
        fn.call(http).catch(reject);
      } catch (e) {
        debug("catch starting server...");
        debug(e.stack);
      }
    }).catch(function (err) {
      debug("catch starting server promise...");
      debug(err.stack);
    });
  }

  /**
   * 关闭 http 服务
   */
  close() {
    debug("closing http server now...");
    let http = this;
    return new Promise(function(resolve, reject){
      if ( !http._mounted ) {
          http._server.close();
          http._server.on("close", function(err){
              debug(`server has closed, beginning of the end`);
              if ( err ) { debug(`server temination failed with ${err}`); return reject(err); }
              debug(`server closed`);
              resolve();
          });
      } else {
          resolve();
      }
      let fn = co.wrap(compose((http._middleware.map(function(el){
          return el.destroy;
      }).filter(function(el){return undefined !== el;}))));

      fn.call(http).then(()=>{
          debug(`middleware teardown completed, closing server`);
      }).catch(reject);
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

exports = module.exports = Http;
