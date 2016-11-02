"use strict";

exports = module.exports = function(options) {
  options = options || {};

  if (!options.calculate) {
    var hash = options.hash;
    if (hash == null || hash === true) hash = 'sha256';
    if (hash && hash !== 'crc32') {
      var createHash = require('crypto').createHash;
      var encoding = options.encoding || 'base64';
      options.calculate = function(body) {
        return createHash(hash).update(body).digest(encoding)
      }
    }
  }

  return function* conditionalGet(next) {
    yield * next;
    if (this.request.fresh) this.response.status = 304;
  }
};