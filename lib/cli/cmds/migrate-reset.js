exports.command = 'migrate:reset'
exports.desc = 'Rollback all database migrations'
exports.builder = {}
exports.handler = function(argv) {
	let path = require("path").resolve(process.cwd() + "/index.js");
	let TestApp = require(path);
	let app = new TestApp();
	let orm = app.ORM;
	orm.reset(app).then(function() {
		console.log("reset done");
		process.exit(0);
	});
}