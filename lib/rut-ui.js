'use strict';

var async = require('async');
var debug = require('debug')('rut:core:ui');
var addAndPassSetup = require('./add-and-pass-setup');
var assign = require('lodash.assign');
var uid = require('./uid');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressValidator = require('express-validator');
var favicon = require('serve-favicon');
var path = require('path');
var serveStatic = require('serve-static');
var flash = require('connect-flash');
var ensureLoggedIn = require('./ensure-logged-in');

var rutUIInspect = require('./rut-ui-inspect');
var rutUIImport = require('./rut-ui-import');
var rutUIDump = require('./rut-ui-dump');

module.exports = function (setup, setupDone) {
  setupDone = addAndPassSetup('ui', setup, setupDone);

  function opt(name, defaultValue) {
    return typeof setup[name] !== 'undefined' ? setup[name] : defaultValue;
  }

  var app = setup.app;
  var passport = setup.passport;

  var Types = setup.mongoose.Schema.Types;

  var registration = require('./registration')(setup);

  var oauth = require('./oauth')(setup);
  require('./auth')(setup);


  var staticDir = path.resolve(__dirname + '/../static');
  var rutStylesPath = opt('rutStyles', staticDir + '/styles.css');
  debug('rut UI styles path: %s', rutStylesPath);

  app.use('/css/styles.css', serveStatic(rutStylesPath));
  var rutAdminStylesPath = opt('rutStyles', staticDir + '/admin-styles.css');
  app.use('/css/admin-styles.css', serveStatic(rutAdminStylesPath));
  debug('rut admin UI styles path: %s', rutStylesPath);


  app.use(favicon(staticDir + '/favicon.ico'));

  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(expressValidator());
  app.use(cookieParser());
  app.use(setup.sessionMiddleware);
  app.use(flash());

  app.use(passport.initialize());
  app.use(passport.session());








  function findOrCreateForThirdParty(name) {
    return function findOrCreateUser(accessToken, refreshToken, profile, cb) {
      function update(user) {
        debug('  existing %s user will be updated with %s auth info', user.username, name);
        user[name + 'Id'] = profile.id;
        user[name + 'Auth'] = {
          accessToken: accessToken,
          refreshToken: refreshToken
        };
        user.save(cb);
      }

      var username = profile.username || profile.displayName || (name + '_' + profile.id);
      var User = setup.db.model('User');
      var search = {};
      search[name + 'Id'] = profile.id;

      debug('find or create from third party service %s', name, username, profile);

      User.findOne(search, function (err, user) {
        debug('  %s user profile by id', name, profile.id, err, user);
        if (err) { return cb(err); }

        if (user) {
          return update(user);
        }


        User.findByUsername(username, function (err, user) {
          debug('    user profile by username %s', username, err, user);
          if (err) { return cb(err); }

          if (user) {
            return update(user);
          }

          debug('      user will be registered as %s', username);
          var newUser = {username: username};
          newUser[name + 'Id'] = profile.id;
          newUser[name + 'Auth'] = {
            accessToken: accessToken,
            refreshToken: refreshToken
          };
          User.register(newUser, uid(16), cb);
        });
      });
    };
  }

  var authServices = {};



  var oauthProviders = setup.oauthProviders;

  function addProvider(clientId, clientSecret, name, title) {
    var Strategy;
    try {
      Strategy = require('passport-' + name).Strategy;
    }
    catch (e) {
      debug('%s provider cannot load passport-%s', title, name);
      return;
    }

    setup.userSchemaDef[name + 'Id'] = String;
    setup.userSchemaDef[name + 'Auth'] = Types.Mixed;

    authServices[name] = {
      name: title,
      clientId: clientId
    };

    passport.use(new Strategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: setup.baseUrl + '/auth/' + name + '/callback'
      },
      findOrCreateForThirdParty(name)
    ));

    app.get('/auth/' + name + '',
      passport.authenticate(name));

    app.get('/auth/' + name + '/callback',
      function (req, res, next) {
        var destination = req.query.destination || req.session.destination || '/account';
        if (req.session.destination) {
          req.session.destination = null;
        }
        var username = (req.user ? req.user.username : false) || (req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : false);
        debug('auth callback with %s destination %s', name, destination, username);

        passport.authenticate(name, {
        })(req, res, function (err) {
          // if (err) { return next(err); }
          if (err) {
            return res.redirect('/register?destination=' + encodeURIComponent(destination));
          }
          debug('  authentication success %s (originaly %s)', req.user.username, username);

          if (username) {
            return setup.db.model('User').findByUsername(username, function (err, user) {
              if (err) { return next(err); }
              // req.logIn(user, {}, next);
              user[name + 'Id'] = req.user[name + 'Id'];
              user[name + 'Auth'] = req.user[name + 'Auth'];
              req.user = user;
              req.session.passport.user = user.username;
              user.save(function (err) {
                if (err) { return next(err); }
                res.redirect(destination);
              });
            });
          }

          res.redirect(destination);
        });
      });

    app.get('/account/' + name + '/forget',
      function (req, res, next) {
        req.user[name + 'Id'] = null;
        req.user[name + 'Auth'] = {};
        req.user.save(function (err) {
          if (err) { return next(err); }
          res.redirect('/account');
        });
      });
  }

  if (oauthProviders.FACEBOOK_APP_ID && oauthProviders.FACEBOOK_APP_SECRET) {
    addProvider(oauthProviders.FACEBOOK_APP_ID, oauthProviders.FACEBOOK_APP_SECRET, 'facebook', 'Facebook');
  }

  if (oauthProviders.GITHUB_CLIENT_ID && oauthProviders.GITHUB_CLIENT_SECRET) {
    addProvider(oauthProviders.GITHUB_CLIENT_ID, oauthProviders.GITHUB_CLIENT_SECRET, 'github', 'GitHub');
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

  app.get('/login', [
    authUserSkipLogin,
    function renderLogin(req, res) {
      var destination = req.query.destination || req.body.destination || '';
      res.render('login', assign({
        messages: req.flash(),
        destination: destination,
        noUserHeader: true
      }, req.query));
    }
  ]);

  app.post('/login', function processLogin(req, res, next) {
    var destination = req.query.destination || req.body.destination || req.session.destination;
    if (req.session.destination) {
      req.session.destination = null;
    }

    (passport.authenticate('local', {
      failureFlash: true,
      successFlash: true,
    }, function (err, user, info) {
      if (err) {
        debug('  authentication error: %s', err, info);
        req.flash('error', err.message);
        return res.redirect('/login' + (destination ? ('?destination=' + encodeURIComponent(destination)) : ''));
      }

      if (!user) {
        debug('  authentication failed', info, user);
        req.flash('error', info.message);
        res.status(401);
        return res.redirect('/login' + (destination ? ('?destination=' + encodeURIComponent(destination)) : ''));
      }

      debug('  authentication ok %s', !!req.user);
      var flash = req.session.flash || {};
      req.logIn(user, function (err) {
        debug('    logged in as %s', user.username, flash, req.session.flash);

        req.flash('info', 'Successfully logged in.');
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
          admin: setup.rutUsername === req.user.username,
          messages: req.flash(),
          tokens: data.tokens || [],
          clients: data.clients || [],
          user: req.user
        });
      });
      debug('Get tokens for %s', req.user.username);
    }
  );

  app.post('/account',
    ensureLoggedIn,
    function saveUser(req, res, next) {
      if (!req.body.username) {
        res.status(400);
        return next(new Error('Missing username in body'));
      }
      req.user.username = req.body.username;
      req.user.save(function (err, user) {
        if (err) { return next(err); }
        req.user = user;
        req.session.passport.user = user.username;
        res.redirect('/account');
      });
    }
  );

  app.get('/client/register', ensureLoggedIn, function renderClientRegistration(req, res) {
    res.render('client-registration', {
      admin: setup.rutUsername === req.user.username,
      messages: req.flash(),
      user: req.user
    });
  });
  app.post('/client/register', ensureLoggedIn, registration.registerClient);

  app.get('/register', function renderRegistration(req, res) {
    debug('registration possible with: %s', Object.keys(authServices));
    res.render('user-registration', {
      admin: setup.rutUsername === req.user.username,
      messages: req.flash(),
      authServices: authServices
    });
  });
  app.post('/register', registration.registerUser);

  app.get('/authorization', oauth.authorization);
  app.post('/decision', oauth.decision);

  rutUIInspect(setup);
  rutUIImport(setup);
  rutUIDump(setup);

  setupDone();
};