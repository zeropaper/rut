'use strict';
module.exports = function addAndPassSetup(propName, obj, done) {
  return function (err, result) {
    // require('debug')('rut:pass-setup')('pass setup as "%s", error? %s', propName, !!err);
    if (err) { return done(err); }
    obj[propName] = result;
    done(null, obj);
  };
};