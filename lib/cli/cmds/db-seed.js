exports.command = 'db:seed'
exports.desc = 'Seed the database with records'
exports.builder = {}
exports.handler = function(argv) {
	let path = require("path").resolve(process.cwd() + "/index.js");
	let TestApp = require(path);
	let app = new TestApp();
	let orm = app.ORM;
	orm.seed(app).then(function() {
		console.log("done");
		process.exit(0);
	});
}