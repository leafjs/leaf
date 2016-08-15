"use strict";
require("any-promise/register")("bluebird");

const debug = require("debug")("leafjs:http:middleware:mdns"),
  ServiceProvider = require("../provider/mdns");

var sp, options;

class middleware {
  constructor( opts ) {
    options = opts || {};
    sp = new ServiceProvider();
  }
  *initialize(next) {
    debug("using leafjs mdns middleware");
    let http = this;

    http.once("listening", () =>{
      http.on("namespace", () =>{
        sp.advertise(http);
      });
      sp.advertise(http);
    });

    yield* next;
  }
  *destroy(next) {
    debug("destroy leafjs mdns middleware");
    let http = this;
    yield new Promise(function(resolve){
      http._ad.stop();
      resolve();
    });
    yield* next;
  }
}

exports = module.exports = middleware;
