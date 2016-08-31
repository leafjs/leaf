exports.command = 'make:migration'
exports.desc = 'Create a new migration file'
exports.builder = {}
exports.handler = function(argv) {
	let path = require("path").resolve(process.cwd() + "/index.js");
	let TestApp = require(path);
	let app = new TestApp();
	let orm = app.ORM;
	orm.createMigration(app, argv._[1]).then(function() {
		console.log("Successfully created the migration", arguments[0]);
		process.exit(0);
	});
}