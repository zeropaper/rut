'use strict';

var http = require('http');

var assign = require('lodash.assign');
var async = require('async');
var debug = require('debug')('rut:core');

var express = require('express');
var expressSession = require('express-session');
var MongoStore = require('connect-mongo/es5')(expressSession);
var passport = require('passport');

var passportLocalMongoose = require('passport-local-mongoose');

var addAndPassSetup = require('./lib/add-and-pass-setup');

var ui = require('./lib/rut-ui');
var rutDevIndex = require('./lib/rut-index');

function values(obj) {
  return Object.keys(obj).map(function (key) {
    return obj[key];
  });
}

module.exports = function rutServer(options, initFinished) {
  if (typeof !initFinished === 'function') {
    initFinished = function () {};
  }

  debug('Setup %s environment', options.env);

  function opt(name, defaultValue) {
    return typeof options[name] !== 'undefined' ? options[name] : defaultValue;
  }

  options.protocol = options.protocol || 'http';
  var baseUrl = options.baseUrl = options.baseUrl || (options.protocol + '://' + options.ip +
                                    (options.port !== 80 && options.port !== 443 ?
                                      (':' + options.port) :
                                      ''
                                    ));

  debug('  Base URL %s', baseUrl);

  var rutPassword = opt('rutPassword', 'insecure');

  var mongoose = options.mongoose || require('mongoose');
  var Schema = mongoose.Schema;


  var app = options.app = express();
  app.set('x-powered-by', false);
  app.set('env', opt('env', 'development'));
  app.set('view engine', opt('view engine', 'pug'));
  app.set('views', opt('views', __dirname + '/views'));


  var server = options.server = http.createServer(app);

  var db = mongoose.createConnection();



  var setupResults = {
    apiDir:             opt('apiDir', './services'),
    app:                app,
    baseUrl:            baseUrl,
    clientSchemaDef:    opt('clientSchemaDef', {}),
    db:                 db,
    dbFixtures:         opt('dbFixtures', false),
    dbWipe:             opt('dbWipe', false),
    env:                opt('env', 'development'),
    ip:                 opt('ip', '0.0.0.0'),
    mongoose:           mongoose,
    oauthProviders:     opt('oauthProviders', {}),
    passport:           passport,
    port:               opt('port', '80'),
    protocol:           opt('protocol', 'https'),
    schemes:            opt('schemes', ['https', 'http']),
    server:             server,
    serveStatic:        {},
    serviceYamlPattern: opt('serviceYamlPattern', '*/*.yaml'),
    userSchemaDef:      opt('userSchemaDef', {}),
    useStubs:           opt('useStubs', false),
    validateResponse:   opt('validateResponse', true),
    tokenLifeSpan:      opt('tokenLifeSpan', 3600 * 1000)
  };
  setupResults.prodHost = opt('prodHost', setupResults.ip);


  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  var setupOperations = {};





  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  setupOperations.db = function (setup, done) {
    setup.db.open(options.mongodbURL, function (err) {
      if (err) {
        console.warn('mongodb connection "%s" could not be open\n %s', options.mongodbURL, err.stack);
        return done(err);
      }
      done(null, setup);
    });
  };





  //
  //
  //
  //
  //
  //
  //
  var service = require('./lib/service');


  //
  //
  //
  //
  //
  //
  //
  setupOperations.services = service.discover;





  //
  //
  //
  //
  //
  //
  //
  setupOperations.serviceModels = service.Models;




  //
  //
  //
  //
  //
  //
  //
  setupOperations.serviceStatics = service.Statics;






  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  setupOperations.sessionMiddleware = function (setup, done) {
    var sessionStore = new MongoStore({
      mongooseConnection: setup.db
    });

    var sessionOptions = {
      resave: false,
      saveUninitialized: false,
      secret: opt('sessionSecret', '1ns3cu3r'),
      name: opt('sessionName', 'rutsess'),
      cookie: {
        httpOnly: opt('sessionCookieHttpOnly', false)
      },
      store: sessionStore
    };

    setup.sessionOptions = sessionOptions;
    setup.sessionMiddleware = expressSession(sessionOptions);
    done(null, setup);
  };




  //
  //
  //
  //
  //
  //
  //
  setupOperations.coreDbSchemes = function (setup, done) {
    var userSchema = new Schema(assign({}, setup.userSchemaDef, {}), {
      timestamps: {}
    });

    userSchema.plugin(passportLocalMongoose, {
      passwordValidator: function(password, cb) {
        cb(password.length > 9 || password === 'insecure' ? null : 'Password must be at least 9 charachters long');
      }
    });

    var User = setup.db.model('User', userSchema);
    setup.passport.use(User.createStrategy());

    setup.passport.serializeUser(User.serializeUser());

    setup.passport.deserializeUser(User.deserializeUser());



    var clientSchema = new Schema(assign({}, setup.clientSchemaDef, {
      name: { type: String, required: true },
      owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      token: String,
      secret: String,
      redirectURI: { type: String, required: true },
    }), {
      timestamps: {}
    });


    setup.db.model('APIClient', clientSchema);

    var accessTokensSchema = new Schema({
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      client: { type: Schema.Types.ObjectId, ref: 'APIClient', required: true },
      scope: String,
      token: String,
      expirationDate: Date
    }, {
      timestamps: {}
    });

    setup.db.model('AccessToken', accessTokensSchema);

    done(null, setup);
  };





  //
  //
  //
  //
  //
  //
  //
  setupOperations.dbWiping = function (setup, done) {
    debug('wiping db? %s', !!setup.dbWipe);
    done = addAndPassSetup('dbWiping', setup, done);
    if (!setup.dbWipe) { return done(); }
    async.map(setup.db.modelNames(), function (name, cb) {
      debug('  wiping: %s', name);
      setup.db.model(name).find({}).remove(cb);
    }, done);
  };





  //
  //
  //
  //
  //
  //
  //
  setupOperations.adminUser = function (setup, done) {
    var User = setup.db.model('User');
    done = addAndPassSetup('adminUser', setup, done);

    debug('rut (admin) user');
    User.findByUsername('rut', function (err, user) {
      if (!err && !user) {
        debug('  does not exitst');
        User.register({username: 'rut'}, rutPassword, done);
      }
      else if (user) {
        debug('  exists');
        user.setPassword(rutPassword, done);
      }
      else {
        debug('  fail');
        done(err);
      }
    });
  };





  //
  //
  //
  //
  //
  //
  //
  setupOperations.serviceClients = function (setup, done) {
    done = addAndPassSetup('serviceClients', setup, done);
    var serviceNames = Object.keys(setup.services);

    var Client = setup.db.model('APIClient');
    debug('ensure api clients for frontends');
    setup.db.model('User').findByUsername('rut', function (err, rutUser) {
      if (err) { return done(err); }

      async.map(serviceNames, function (name, n) {
        var service = setup.services[name];
        // that part sucks... but i need it to work
        var redirectURI = options.env === 'development' ?
                          ('http://localhost:9091/' + service.name + '-' + service.version + '#/oauth/callback') :
                          'https://zeropaper.github.io/' + service.name + '/';

        Client.findOne({name:name}, function (err, client) {
          if (err) { return n(err); }
          if (!client) {
            debug('  %s does not have client', name);
            return Client.create({
              owner: rutUser,
              name: name,
              redirectURI: redirectURI,
              secret: 'yadayada'
            }, function (err, client) {
              if (err) { return n(err); }
              debug('    %s registered', name);
              n(null, client.name);
            });
          }

          debug('  %s already have client', name);
          if (client.redirectURI === redirectURI) {
            debug('    %s already up-to-date', name);
            return n(null, client.name);
          }

          client.redirectURI = redirectURI;
          client.save(function (err) {
            if (err) { return n(err); }
            debug('    %s updated', name);
            n(null, client.name);
          });
        });
      }, done);
    });
  };






  //
  //
  //
  //
  //
  //
  //
  setupOperations.ui = ui;






  //
  //
  //
  //
  //
  //
  //
  setupOperations.serviceAPIs = service.APIs;





  //
  //
  //
  //
  //
  //
  //
  setupOperations.serviceEditors = service.Editors;





  //
  //
  //
  //
  //
  //
  //
  setupOperations.serviceDocs = service.Docs;





  //
  //
  //
  //
  //
  //
  //
  setupOperations.serviceFixtures = service.Fixtures;






  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  setupOperations.devIndex = function (setup, done) {
    app.get('/', rutDevIndex(setup));
    done(null, setup);
  };






  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  setupOperations.serveStatic = function (setup, done) {
    done(null, setup);
  };






  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  setupOperations.errorHandling = function (setup, done) {
    app.use(function (req, res, next) {
      debug('404: %s', req.url);
      var err = new Error('Page Not Found');
      err.code = 404;
      next(err);
    });

    app.use(require('./lib/error-handler')(options));
    done(null, setup);
  };



  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  var cbs = values(setupOperations);
  debug('Setup operations\n    - %s', Object.keys(setupOperations).join('\n    - '));
  cbs.unshift(function (cb) {
    cb(null, setupResults);
  });


  async.waterfall(cbs, function (err) {
    if (err) {
      debug('  rut initialization error:\n%s', err.stack);
      return initFinished(err);
    }

    initFinished(null, setupResults);
  });
};