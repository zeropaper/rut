'use strict';

var async = require('async');
var debug = require('debug')('rut:core:ui');
var addAndPassSetup = require('./add-and-pass-setup');
var assign = require('lodash.assign');
var formidable = require('formidable');
var fs = require('fs');
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
  var flash = require('connect-flash');

  var Types = setup.mongoose.Schema.Types;

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

  app.use(flash());








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

      var username = profile.displayName || (name + '_' + profile.id);
      var User = setup.db.model('User');
      var search = {};
      search[name + 'Id'] = profile.id;

      debug('find or create from third party service %s', name, username);

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
          // failureRedirect: '/register?destination=' + encodeURIComponent(destination),
          // successRedirect: destination,
          // session: !!username
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

  function ensureLoggedIn(req, res, next) {
    var hasSession = req.session && req.session.passport && req.session.passport.user;
    debug('ensureLoggedIn has session %s, %s', !!hasSession, !!req.user);

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
        messages: req.flash('info'),
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
          messages: req.flash('info'),
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
      messages: req.flash('info'),
      user: req.user
    });
  });
  app.post('/client/register', ensureLoggedIn, registration.registerClient);

  app.get('/register', function renderRegistration(req, res) {
    debug('registration possible with: %s', Object.keys(authServices));
    res.render('user-registration', {
      messages: req.flash('info'),
      authServices: authServices
    });
  });
  app.post('/register', registration.registerUser);

  app.get('/authorization', oauth.authorization);
  app.post('/decision', oauth.decision);


  app.get('/inspect',
    ensureLoggedIn,
    function (req, res, next) {
      if (!req.user || req.user.username !== setup.rutUsername) { return next(); }
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
        res.render('inspect', {
          messages: req.flash('info'),
          models: data
        });
      });
    });

  app.get('/inspect/:modelName',
    ensureLoggedIn,
    function (req, res, next) {
      if (!req.user || req.user.username !== setup.rutUsername) { return next(); }
      var modelName = req.params.modelName;
      var Model = setup.db.model(modelName);
      debug('inspect page for model %s', modelName);

      Model.find(function (err, docs) {
        if (err) { return next(err); }
        res.render('inspect', {
          messages: req.flash('info'),
          modelName: modelName,
          model: Model,
          documents: docs
        });
      });
    });

  app.get('/dump/:modelName',
    ensureLoggedIn,
    function (req, res, next) {
      if (!req.user || req.user.username !== setup.rutUsername) { return next(); }
      var modelName = req.params.modelName;
      var Model = setup.db.model(modelName);
      debug('dump page for model %s', modelName);

      Model.find(function (err, docs) {
        if (err) { return next(err); }
        debug('  %s documents', docs.length);
        res.set('Content-Disposition', 'attachment; filename="' + modelName + '.json"');
        res.send(docs);
      });
    });

  app.get('/inspect/:modelName',
    ensureLoggedIn,
    function (req, res, next) {
      if (!req.user || req.user.username !== setup.rutUsername) { return next(); }
      var modelName = req.params.modelName;
      var Model = setup.db.model(modelName);
      debug('inspect page for model %s', modelName);

      Model.find(function (err, docs) {
        if (err) { return next(err); }
        debug('  %s documents', docs.length);
        res.render('inspect', {
          messages: req.flash('info'),
          modelName: modelName,
          model: Model,
          documents: docs
        });
      });
    });

  app.get('/import',
    ensureLoggedIn,
    function (req, res) {
      res.render('import', {
        messages: req.flash('info'),
        models: setup.db.modelNames()
      });
    });

  app.post('/import',
    ensureLoggedIn,
    function (req, res, next) {
      if (!req.user || req.user.username !== setup.rutUsername) { return next(); }


      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields, files) {
        if (err) { return next(err); }
        var modelName = fields.modelName;
        debug('import %s model', modelName);


        var Model = setup.db.model(modelName);
        async.map(files, function (file, cb) {
          debug('  file', file);

          fs.readFile(file.path, function (err, data) {
            if (err) { return cb(err); }

            try {
              data = JSON.parse(data.toString());
            }
            catch (err) {
              return cb(err);
            }

            Model.create(data, cb);
          });
        }, function (err) {
          if (err) {
            req.flash('error', err.message);
            return res.redirect('/inspect');
          }

          req.flash('info', modelName + ' documents created');
          res.redirect('/inspect');
        });
      });
    });

  setupDone();
};