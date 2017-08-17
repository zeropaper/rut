'use strict';
/**
 * Module dependencies.
 */
var debug = require('debug')('rut:core:auth');
var BearerStrategy = require('passport-http-bearer').Strategy;
var crypto = require('crypto');

module.exports = function (setup) {
  var passport = setup.passport;
  var db = setup.db;

  /**
   * This strategy is used to authenticate users based on an access token (aka a
   * bearer token).
   */
  passport.use('accessToken', new BearerStrategy(
    function (accessToken, done) {
      var accessTokenHash = crypto.createHash('sha1').update(accessToken).digest('hex');
      debug('accessToken strategy (BearerStrategy)', accessTokenHash);
      db.model('AccessToken')
      .findOne({token: accessTokenHash}, function (err, token) {
        if (err) return done(err);
        if (!token) return done(null, false);

        if (new Date() > token.expirationDate) {
          db.model('AccessToken')
          .remove({token: accessTokenHash}, function (err) { done(err); });
        }
        else {
          debug('  find user by token', token.user);
          db.model('User')
          .findById(token.user, function (err, user) {
            if (err) return done(err);
            if (!user) return done(null, false);
            // no use of scopes for now
            var info = { scope: '*' };
            done(null, user, info);
          });
        }
      });
    }
  ));
};
