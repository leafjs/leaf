"use strict";
require("any-promise/register")("bluebird");


const debug = require("debug")("leafjs:http:middleware:react");
const react = require('koa-react-view');
const register = require('babel-register');
const es2015 = require('babel-preset-es2015');
const reactPreset = require('babel-preset-react');
const pathModule = require('path');
const extend = require('extend');

const DEFAULTS = {};
var options;

class middleware {
  constructor(opts) {
    options = extend({}, DEFAULTS, opts || {});
  }

  * initialize(next) {
    debug("using leafjs react template middleware");

    let http = this;
    let koa = this.koa;

    const viewDir = pathModule.resolve(http.basepath, "app/View");

    react(koa, {
      views: viewDir
    });

    register({
      presets: [es2015, reactPreset],
      extensions: ['.jsx'],
    });

    yield * next;
  }
}


exports = module.exports = middleware;