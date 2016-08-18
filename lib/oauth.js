'use strict';

var debug = require('debug')('rut:core:oauth');
var uid = require('./uid');
var oauth2orize = require('oauth2orize');
var crypto = require('crypto');

module.exports = function (setup) {
  var db = setup.db;
  var exported = {};

  function ensureLogin(req, res, next) {
    debug('check if a user exists', !!req.user);
    if (req.user) {
      debug('  yep');
      return next();
    }
    debug('  nope');
    res.redirect('/login?destination=' + encodeURIComponent(req.originalUrl));
  }

  // create OAuth 2.0 server
  var server = oauth2orize.createServer();

  //(De-)Serialization for clients
  server.serializeClient(function(client, done) {
      return done(null, client.name);
  });

  server.deserializeClient(function(name, done) {
    db.model('APIClient').findOne({name: name}, done);
  });

  //Implicit grant
  server.grant(oauth2orize.grant.token(function (client, user, ares, done) {
    debug('grant token %s from %s', client.name, user.username, ares);
    var token = uid(256);
    var tokenHash = crypto.createHash('sha1').update(token).digest('hex');
    var expirationDate = new Date(new Date().getTime() + setup.tokenLifeSpan);

    db.model('AccessToken').create({
      token: tokenHash,
      expirationDate: expirationDate,
      scope: '*',
      user: user,
      client: client
    }, function(err) {
      if (err) { return done(err); }

      return done(null, token, {
        expires_in: expirationDate.toISOString()
      });
    });
  }));

  // user authorization endpoint
  exported.authorization = [
    ensureLogin,
    server.authorization(function(name, redirectURI, done) {
      debug('authorize %s', name);

      db.model('APIClient')
      .findOne({name: name}, function(err, client) {
        if (err) return done(err);
        if (!client) {
          debug('  does not exists');
          return done(new Error('Client ' + name + ' does not exists'));
        }
        // WARNING: For security purposes, it is highly advisable to check that
        // redirectURI provided by the client matches one registered with
        // the server. For simplicity, this example does not. You have
        // been warned.
        var destination = setup.env === 'development' ? (redirectURI || client.redirectURI) : client.redirectURI;
        debug('  exists, redirect to: %s', destination);
        return done(null, client, destination);
      });
    }),
    function(req, res) {
      res.render('decision', {
        admin: setup.rutUsername === req.user.username,
        messages: req.flash('info'),
        noUserHeader: true,
        transactionID: req.oauth2.transactionID,
        user: req.user,
        client: req.oauth2.client
      });
    }
  ];

  // user decision endpoint

  exported.decision = [
    ensureLogin,
    server.decision()
  ];

  return exported;
};
