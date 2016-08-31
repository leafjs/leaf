exports.command = 'migrate'
exports.desc = 'Run the database migrations'
exports.builder = {}
exports.handler = function(argv) {
	let path = require("path").resolve(process.cwd() + "/index.js");
	let TestApp = require(path);
	let app = new TestApp();
	let orm = app.ORM;
	orm.migrate(app).then(function() {
		console.log("migrate done");
		process.exit(0);
	});
}