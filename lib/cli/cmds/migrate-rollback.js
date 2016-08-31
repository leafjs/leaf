exports.command = 'migrate:rollback'
exports.desc = 'Rollback the last database migration'
exports.builder = {}
exports.handler = function(argv) {
	let path = require("path").resolve(process.cwd() + "/index.js");
	let TestApp = require(path);
	let app = new TestApp();
	let orm = app.ORM;
	orm.rollback(app).then(function() {
		console.log("rollback done");
		process.exit(0);
	});
}