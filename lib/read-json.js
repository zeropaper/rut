'use strict';
/* jshint node: true */
var fs = require('fs');
function stripComments(str) {
  return str.replace(/\/\/ [^\n]*/g, '');
}

module.exports = function (filepath, done) {
  fs.readFile(filepath, function (err, data) {
    if (err) { return done(err); }
    var json;
    try {
      json = JSON.parse(stripComments(data.toString()));
    }
    catch (err) {
      return done(err);
    }
    done(null, json);
  });
};

module.exports.sync = function (filepath) {
  return JSON.parse(stripComments(fs.readFileSync(filepath).toString()));
};
