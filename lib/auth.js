'use strict';
/**
 * Module dependencies.
 */
var debug = require('debug')('rut:core:auth');
// var LocalStrategy = require('passport-local').Strategy;
// var BasicStrategy = require('passport-http').BasicStrategy;
// var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
// var bcrypt = require('bcrypt');
var crypto = require('crypto');

module.exports = function (setup) {
  var passport = setup.passport;
  var db = setup.db;
  debug('db ready? %s', db && db.modelNames && db.modelNames().indexOf('User') > -1);


  // /**
  //  * LocalStrategy
  //  */
  // // ... moved


  // /**
  //  * These strategies are used to authenticate registered OAuth clients.
  //  * The authentication data may be delivered using the basic authentication scheme (recommended);
  //  * or the client strategy, which means that the authentication data is in the body of the request.
  //  */
  // function authClient(clientId, clientSecret, done) {
  //   db.model('APIClient')
  //   .findOne({clientId: clientId}, function (err, client) {
  //     if (err) return done(err);
  //     if (!client) return done(null, false);

  //     if (client.clientSecret == clientSecret) return done(null, client);
  //     else return done(null, false);
  //   });
  // }
  // passport.use('clientBasic', new BasicStrategy(authClient));

  // passport.use('clientPassword', new ClientPasswordStrategy(authClient));

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
            // no use of scopes for no
            var info = { scope: '*' };
            done(null, user, info);
          });
        }
      });
    }
  ));
};
