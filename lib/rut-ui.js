'use strict';

var async = require('async');
var debug = require('debug')('rut:core:ui');
var addAndPassSetup = require('./add-and-pass-setup');
var assign = require('lodash.assign');
var uid = require('./uid');


module.exports = function (setup, setupDone) {
  setupDone = addAndPassSetup('ui', setup, setupDone);

  function opt(name, defaultValue) {
    return typeof setup[name] !== 'undefined' ? setup[name] : defaultValue;
  }

  var app = setup.app;
  var passport = setup.passport;
  var bodyParser = require('body-parser');
  var cookieParser = require('cookie-parser');
  var expressValidator = require('express-validator');
  var favicon = require('serve-favicon');
  var path = require('path');
  var serveStatic = require('serve-static');

  var registration = require('./registration')(setup);

  var oauth = require('./oauth')(setup);
  require('./auth')(setup);


  var staticDir = path.resolve(__dirname + '/../static');
  var rutStylesPath = opt('rutStyles', staticDir + '/styles.css');
  debug('rut UI styles path: %s', rutStylesPath);
  // var swaggerClientPath = 'node_modules/swagger-client/browser/swagger-client' + (setup.env === 'production' ? '.min' : '') + '.js';
  // app.use('/js/swagger-client.js', serveStatic(swaggerClientPath));
  app.use('/css/styles.css', serveStatic(rutStylesPath));
  app.use(favicon(staticDir + '/favicon.ico'));

  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(expressValidator());
  app.use(cookieParser());
  app.use(setup.sessionMiddleware);

  app.use(passport.initialize());
  app.use(passport.session());










  var oauthProviders = setup.oauthProviders;

  setup.userSchemaDef.facebookId = String;
  setup.userSchemaDef.googleId = String;
  setup.userSchemaDef.githubId = String;
  setup.userSchemaDef.twitterId = String;

  function findOrCreateForThirdParty(name) {
    return function findOrCreateUser(accessToken, refreshToken, profile, cb) {
      debug('find or create from third party service %s', name);
      var User = setup.db.model('User');
      var search = {};
      search[name + 'Id'] = profile.id;

      User.findOne(search, function (err, user) {
        if (err) { return cb(err); }
        debug('  %s user profile', name, profile);

        if (user) {
          debug('    user exists as %s', name, profile);
          return cb(null, user);
        }

        var username = name + '_' + profile.id;
        debug('    user will be registered as %s', username);

        User.register({
          facebookId: profile.id,
          username: username
        }, uid(16), cb);
      });
    };
  }

  var authServices = {};

  if (oauthProviders.FACEBOOK_APP_ID && oauthProviders.FACEBOOK_APP_SECRET) {
    authServices.facebook = {
      name: 'Facebook',
      clientId: setup.oauthProviders.FACEBOOK_APP_ID
    };

    var FacebookStrategy = require('passport-facebook').Strategy;
    passport.use(new FacebookStrategy({
        clientID: oauthProviders.FACEBOOK_APP_ID,
        clientSecret: oauthProviders.FACEBOOK_APP_SECRET,
        callbackURL: setup.baseUrl + '/auth/facebook/callback'
      },
      function(accessToken, refreshToken, profile, cb) {
        findOrCreateForThirdParty('facebook')(accessToken, refreshToken, profile, cb);
      }
    ));

    app.get('/auth/facebook',
      passport.authenticate('facebook'));

    app.get('/auth/facebook/callback',
      passport.authenticate('facebook', { failureRedirect: '/register' }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
      });
  }

  function authUserSkipLogin(req, res, next) {
    var destination = req.query.destination || req.body.destination || '/account';
    var hasSession = req.session && req.session.passport && req.session.passport.user;

    if (destination.indexOf('/login') === 0) {
      destination = '/account';
    }

    debug('authUserSkipLogin has session "%s", %s', hasSession, destination);
    if (hasSession) {
      return res.redirect(destination);
    }

    next();
  }

  function ensureLoggedIn(req, res, next) {
    var hasSession = req.session && req.session.passport && req.session.passport.user;
    debug('ensureLoggedIn has no session %s, %s', !hasSession, req.user);

    if (!hasSession) {
      debug('  redirect to login to continue to %s', req.originalUrl);
      return res.redirect('/login?destination=' + encodeURIComponent(req.originalUrl));
    }

    next();
  }

  app.get('/login', [
    authUserSkipLogin,
    function renderLogin(req, res) {
      var destination = req.query.destination || req.body.destination || '';
      res.render('login', assign({
        destination: destination,
        noUserHeader: true
      }, req.query));
    }
  ]);

  app.post('/login', function processLogin(req, res, next) {
    var destination = req.query.destination || req.body.destination;
    (passport.authenticate('local', {}, function (err, user, info) {
      if (err) {
        debug('  authentication error: %s', err, info);
        return res.redirect('/login' + (destination ? ('?destination=' + destination) : ''));
      }

      if (!user) {
        debug('  authentication failed', info, user);
        res.status(401);
        return res.redirect('/login' + (destination ? ('?destination=' + destination) : ''));
      }

      debug('  authentication ok %s', !!req.user);
      req.logIn(user, function (err) {
        if (err) { return next(err); }
        return res.redirect(destination ? destination : '/account');
      });
    }))(req, res, next);
  });

  app.use('/logout', function logoutMiddleware(req, res) {
    req.logout();
    var destination = req.query.destination || req.body.destination || '/';
    res.redirect(destination);
  });

  app.get('/account',
    ensureLoggedIn,
    function renderAccount(req, res, next) {
      async.series({
        tokens: function (cb) {
          setup.db.model('AccessToken').find({
            user: req.user
          })
          .populate('user client')
          .exec(cb);
        },
        clients: function (cb) {
          setup.db.model('APIClient').find({
            owner: req.user
          })
          .populate('owner admins')
          .exec(cb);
        }
      }, function (err, data) {
        if (err) { return next(err); }
        res.render('account', {
          tokens: data.tokens || [],
          clients: data.clients || [],
          user: req.user
        });
      });
      debug('Get tokens for %s', req.user.username);
    }
  );

  app.get('/client/register', ensureLoggedIn, function renderClientRegistration(req, res) {
    res.render('client-registration', {
      user: req.user
    });
  });
  app.post('/client/register', ensureLoggedIn, registration.registerClient);

  app.get('/register', function renderRegistration(req, res) {
    var authServices = {};
    if (oauthProviders.FACEBOOK_APP_ID) {
      authServices.facebook = {
        name: 'Facebook',
        clientId: oauthProviders.FACEBOOK_APP_ID
      };
    }
    debug('registration possible with: %s', Object.keys(authServices));
    res.render('user-registration', {
      authServices: authServices
    });
  });
  app.post('/register', registration.registerUser);

  app.get('/authorization', oauth.authorization);
  app.post('/decision', oauth.decision);


  app.get('/inspect', function (req, res, next) {
    if (setup.env !== 'development') { return next(); }
    debug('inspect page');
    var modelNames = setup.db.modelNames();
    async.map(modelNames, function (modelName, cb) {
      debug('  model %s', modelName);

      setup.db.model(modelName).count({}, function (err, count) {
        if (err) { return cb(err); }
        debug('  has %s records', modelName, count || 'no');
        cb(null, count);
      });
    }, function (err, results) {
      if (err) { return next(err); }
      var data = {};
      results.forEach(function (result, r) {
        data[modelNames[r]] = result;
      });
      res.render('inspect', {models: data});
    });
  });

  app.get('/inspect/:modelName', function (req, res, next) {
    if (setup.env !== 'development') { return next(); }
    var modelName = req.params.modelName;
    var Model = setup.db.model(modelName);
    debug('inspect page for model %s', modelName);

    Model.find(function (err, docs) {
      if (err) { return next(err); }
      debug('  %s documents', docs.length);
      res.render('inspect', {
        modelName: modelName,
        model: Model,
        documents: docs
      });
    });
  });

  setupDone();
};