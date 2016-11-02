var path = require("path").resolve(process.cwd() + "/index.js");
var Leaf = require(path);

exports.command = 'serve'
exports.desc = 'Running Leafjs Http server'
exports.builder = {}
exports.handler = function(argv) {
	let app = new Leaf();
	app.start();
}