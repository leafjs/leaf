"use strict";
require("any-promise/register")("bluebird");

const extend = require("extend"),
  jwt = require("jsonwebtoken");
const jose = require('node-jose');

const DEFAULTINITOPTIONS = {
  key: "notasecret",
  alg: "HS256"
};

class JWT {
  constructor( options ) {
    options = extend(DEFAULTINITOPTIONS, options);
    this._key = options.key;
    this._alg = options.alg;
  }
  sign(payload, options) {
    options = options || {};
    options.algorithm = options.algorithm || this._alg;
    var self = this;
    var key = options.key || self._key;
    return new Promise(function(resolve, reject){
      try {
        resolve(jwt.sign(payload, key, options));
      } catch(e) { reject(e);}
    });
  }
  verify(token, options) {
    options = options || {};
    options.algorithms = options.algorithms || [this._alg];
    var self = this;
    var keyVal = options.key || self._key;
    return new Promise(function(resolve, reject){
      jwt.verify(token, keyVal, options, function(err, decoded){
        if ( err ) { return reject(err); }
        resolve(decoded);
      });
    });
  }
  decode(token, options) {
    options = options || {};
    options.algorithm = this._alg;
    var self = this;
    return new Promise(function(resolve, reject){
      resolve(jwt.decode(token, options));
    });
  }
}

exports = module.exports = JWT;
