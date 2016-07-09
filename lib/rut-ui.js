'use strict';

var async = require('async');
var debug = require('debug')('rut:core:ui');
var addAndPassSetup = require('./add-and-pass-setup');
var assign = require('lodash.assign');
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

  app.use('/account',
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

  app.get('/client/register', function renderClientRegistration(req, res) { res.render('clientRegistration'); });
  app.post('/client/register', registration.registerClient);

  app.get('/register', function renderRegistration(req, res) { res.render('userRegistration'); });
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