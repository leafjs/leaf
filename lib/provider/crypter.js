"use strict";
require("any-promise/register")("bluebird");

const forge = require("node-forge"),
  JWT = require("./jwt.js"),
  logger = require("debug")("leaf:provider:crypter");

class Crypter {
  constructor(leaf) {
    this.hasher = forge.md.sha256.create();
    this._pass = process.env.CCRET;
    if (!this._pass && leaf.env === "production") {
      throw "secret required, please set it with export CCRET";
    }
    this._pass = this._pass || "notasecret";
  }

  hash(val) {
    var md = forge.md.sha256.create();
    md.update(val);
    return md.digest().toHex();
  }

  encrypt(val) {
    logger("encrypting");
    return new Promise((resolve, reject) => {
      logger("encrypting here");
      let salt = forge.random.getBytesSync(128);
      let key = forge.pkcs5.pbkdf2(this._pass, salt, 4, 16);
      let iv = forge.random.getBytesSync(16);
      let cipher = forge.cipher.createCipher("AES-CBC", key);
      cipher.start({
        iv: iv
      });
      cipher.update(forge.util.createBuffer(val));
      cipher.finish();
      let cipherText = forge.util.encode64(cipher.output.getBytes());
      return JWT.sign({
        ct: cipherText,
        st: forge.util.encode64(salt),
        iv: forge.util.encode64(iv)
      }).then(resolve).catch(reject);
    });
  }

  decrypt(val) {
    return new Promise((resolve, reject) => {
      return JWT.verify(val)
        .then(function(obj) {
          let key = forge.pkcs5.pbkdf2(this._pass, forge.util.decode64(obj.st), 4, 16);
          let decipher = forge.cipher.createDecipher("AES-CBC", key);
          decipher.start({
            iv: forge.util.decode64(obj.iv)
          });
          decipher.update(forge.util.createBuffer(forge.util.decode64(obj.ct)));
          decipher.finish();
          resolve(decipher.output.toString());
        })
        .catch(reject);
    });
  }
}

exports = module.exports = Crypter;