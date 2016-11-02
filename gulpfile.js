var run = require("gulp-run");
var gulp = require("gulp");
var debug = require("debug")("leaf:gulp");
gulp.task("cleanjsdocs", function(cb){
  return require("del")(["docs/jsdoc"], cb);
});

gulp.task("jsdoc", ["cleanjsdocs"], function(){
  return run("./node_modules/.bin/jsdoc -c ./jsdoc.json -R README.md").exec(function(){
    debug(arguments);
  });
});

gulp.task("watchjsdocs", function(){
  return gulp.watch(["./!(docs|node_modules)/**/*.js", "!gulpfile.js"], ["jsdoc"]);
});
