'use strict';
/* jshint node: true */
var debug = require('debug')('rut:core:rut-user');
var addAndPassSetup = require('./add-and-pass-setup');

var rutId = '000000000000000000000000';

module.exports = function (setup, done) {
  done = addAndPassSetup('rutUser', setup, done);
  debug('rut (admin) user');

  var User = setup.db.model('User');
  User.findByUsername(setup.rutUsername, function (err, user) {
    if (!err && !user) {
      debug('  does not exists');

      User.register({
        username: setup.rutUsername,
        _id: rutId
      }, setup.rutPassword, done);
    }
    else if (user) {
      debug('  exists');

      user.setPassword(setup.rutPassword, function (err) {
        if (err) { return done(err); }
        /*
        if (user._id.toString() !== rutId) {
          debug('    _id will be updated');
          user._id = rutId;
          return user.save(done);
        }
        */
        done(null, user);
      });
    }
    else {
      debug('  fail');
      done(err);
    }
  });
};