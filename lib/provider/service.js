"use strict";

const logger = require("debug")("leaf:provider:service");
const urlMod = require("url");
const sioClient = require("socket.io-client");
const methods = require("methods");
const Browser = require('./browser');

var serviceConfig;

class Service {
  constructor(name, ver, leaf) {
    this._name = name;
    this._ver = ver;
    this._browser = new Browser();
    this.leaf = leaf;
  }

  _retrieve() {
    logger(`retrieving a service based on ${this._name}, ${this._ver}:start`);
    return this._browser.get(this._name, this._ver);
  }

  // TODO, implement a stream method
  request(method, path, data, headers) {
    logger(`calling general request helper: start`);

    function _request(sc, path, nsp, method, data, headers, resolve, reject) {
      let realPath = "";
      if (!path.startsWith("/")) {
        realPath += "/";
      }
      realPath += path;
      logger(`[${method}]`, realPath, data, headers);
      sc.emit("s", method, realPath, data, headers, function(status, headers, body) {
        logger(`service replied with ${status}, ${headers}, ${body}`);
        resolve({
          status: status,
          headers: headers,
          body: body
        });
      }).on("error", function(e) {
        reject(e);
      });
    }

    return new Promise((resolve, reject) => {
      logger(`attempting to retrieve service`);
      if (this.sioClient) {
        logger(`sioClient already exists`);
        _request(this.sioClient, path, this._nsp, method, data, headers, resolve, reject);
      } else {
        if (serviceConfig === undefined) {
          serviceConfig = this.leaf._config.services;
        }

        if (serviceConfig && serviceConfig[this._name]) {
          let uri = urlMod.parse(serviceConfig[this._name]);
          logger(`WARNING: ${this._name} is using ws://${uri.host}/${uri.path}`);
          let sc = (this.sioClient = this.sioClient || new sioClient(`ws://${uri.host}${uri.path}`, {
            transports: ["websocket"]
          }));
          logger("client connection made");
          this._nsp = uri.path;
          _request(sc, path, uri.path, method, data, headers, resolve, reject);
        } else {
          this._retrieve().then((service) => {
            let nsp = service.txtRecord.nsp || "/";
            this._nsp = nsp;
            let host;
            for (let i = 0; i < service.addresses.length; i++) {
              if (!service.addresses[i].includes(":")) {
                host = service.addresses[i];
              }
            }
            // var host = `[${service.addresses[0]}]`;
            // if ( service.replyDomain === "local.") { // this is a local service
            // host = "127.0.0.1";
            // }
            if (!nsp.startsWith("/")) {
              nsp = "/" + nsp;
            }
            let url = `ws://${host}:${service.port}${nsp}`;
            logger(`service(${this._name}@${this._ver}) resolved, connecting now@${url}`);
            logger(`joining into namespace: ${nsp}`);
            let sc = (this.sioClient = this.sioClient || new sioClient(url));
            this.sioClient.on("error", (err) => {
              logger(err);
              this.sioClient = undefined;
            });
            _request(sc, path, nsp, method, data, headers, resolve, reject);
          }, (e) => {
            logger(`service(${this._name}@${this._ver}) failed to be resolved: ${e}`);
            reject(e);
          });
        }
      }
    });
  }
}

for (let method of methods) {
  Service.prototype[method] = (function(method) {
    return function(path, data, headers) {
      logger(`calling ${method} helper: start`);
      logger(this)
      return this.request.call(this, method, path, data, headers);
    };
  })(method);
}

exports = module.exports = Service;