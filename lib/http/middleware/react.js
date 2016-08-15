"use strict";
require("any-promise/register")("bluebird");


const debug = require("debug")("leafjs:http:middleware:react");
const react = require('koa-react-view');
const pathModule = require('path');

const viewDir = pathModule.resolve(http.basepath, "app/View");

class middleware {
  constructor(opts) {
    options = extend({}, DEFAULTS, opts || {});
  }

  *initialize(next) {
    debug("using leafjs react template middleware");

    let http = this;
    let koa = this.koa;

    react(app, {
      views: viewDir
    });

    yield* next;
  }
}


exports = module.exports = middleware;
