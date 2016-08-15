var path = require("path").resolve(process.cwd()+"/index.js");
var Http = require(path);

exports.command = 'serve'
exports.desc = 'Running Leafjs Http server'
exports.builder = {}
exports.handler = function (argv) {
  var app = new Http();
  app.start();
}
