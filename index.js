"use strict";
const debugModule = require("debug"), debug = debugModule("leafjs");

class Leaf {
  constuctor() {

  }
  static get http(){
    return require('./lib/http');
  }
}

exports = module.exports = Leaf;
