"use strict";
var path = require('path');

var pkginfo = module.exports = function (pmodule, options) {
  var args = [].slice.call(arguments, 2).filter(function (arg) {
    return typeof arg === 'string';
  });

  //
  // **Parse variable arguments**
  //
  if (Array.isArray(options)) {
    //
    // If the options passed in is an Array assume that
    // it is the Array of properties to expose from the
    // on the package.json file on the parent module.
    //
    options = { include: options };
  }
  else if (typeof options === 'string') {
    //
    // Otherwise if the first argument is a string, then
    // assume that it is the first property to expose from
    // the package.json file on the parent module.
    //
    options = { include: [options] };
  }

  //
  // **Setup default options**
  //
  options = options || {};

  // ensure that includes have been defined
  options.include = options.include || [];

  if (args.length > 0) {
    //
    // If additional string arguments have been passed in
    // then add them to the properties to expose on the
    // parent module.
    //
    options.include = options.include.concat(args);
  }

  var pkg = pkginfo.read(pmodule, options.dir).package;
  Object.keys(pkg).forEach(function (key) {
    if (options.include.length > 0 && !~options.include.indexOf(key)) {
      return;
    }

    if (!pmodule.exports[key]) {
      pmodule.exports[key] = pkg[key];
    }
  });

  return pkg;
};

//
// ### function find (dir)
// #### @pmodule {Module} Parent module to read from.
// #### @dir {string} **Optional** Directory to start search from.
// Searches up the directory tree from `dir` until it finds a directory
// which contains a `package.json` file.
//
pkginfo.find = function (pmodule, dir) {
  if (! dir) {
    dir = path.dirname(pmodule.filename || pmodule.id);
  }

  if (dir === '/') {
    throw new Error('Could not find package.json up from ' +
      (pmodule.filename || pmodule.id));
  }
  else if (!dir || dir === '.') {
    throw new Error('Cannot find package.json from unspecified directory');
  }

  var contents;
  try {
    contents = require(dir + '/package.json');
  } catch (error) {}

  if (contents) return contents;

  return pkginfo.find(pmodule, path.dirname(dir));
};

//
// ### function read (pmodule, dir)
// #### @pmodule {Module} Parent module to read from.
// #### @dir {string} **Optional** Directory to start search from.
// Searches up the directory tree from `dir` until it finds a directory
// which contains a `package.json` file and returns the package information.
//
pkginfo.read = function (pmodule, dir) {
  return {
    dir: dir,
    package: pkginfo.find(pmodule, dir),
  };
};

//
// Call `pkginfo` on this module and expose version.
//
pkginfo(module , {
  dir: __dirname,
  include: ['version'],
  target: pkginfo
});
