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

var mongooseUnique = require('mongoose-unique-validator');

var addAndPassSetup = require('./lib/add-and-pass-setup');

var rutUi = require('./lib/rut-ui');
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
  var rutUsername = opt('rutUsername', 'rut');

  var mongoose = options.mongoose || require('mongoose');
  mongoose.Promise = Promise;
  var Schema = mongoose.Schema;


  var app = options.app = express();
  app.set('x-powered-by', false);
  app.set('env', opt('env', 'development'));
  app.set('view engine', opt('view engine', 'pug'));
  app.set('views', opt('views', __dirname + '/views'));


  var server = options.server = http.createServer(app);

  var db;



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
    rutUsername:        rutUsername,
    rutPassword:        rutPassword,
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
    db = setup.db = mongoose.createConnection(options.mongodbURL);
    done(null, setup);
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
  setupOperations.ui = rutUi;




  //
  //
  //
  //
  //
  //
  //
  setupOperations.coreDbSchemes = function (setup, done) {
    debug('setup.userSchemaDef', setup.userSchemaDef);

    var accountSchema = new Schema({
      provider: {type: String, required: true},
      providerUserId: {type: String, required: true},
      auth: {type: Schema.Types.Mixed, required: true},
      profile: {type: Schema.Types.Mixed, required: true}
    });

    var userSchema = new Schema(assign({
      name: {
        first: {type: String, default: 'Anon'},
        last: {type: String, default: 'Ymous'}
      },
      // email: {type: String, required: true, unique: true},
      username: {type: String, required: true, unique: true},
      accounts: [accountSchema],
      lastSeen: Date,
      roles: [String]
    }, setup.userSchemaDef, {}), {
      timestamps: {}
    });

    userSchema.virtual('displayName')
      .get(function() { return this.name.first + ' ' + this.name.last; })
      .set(function(displayName) {
        var spaceIndex = displayName.indexOf(' ');
        this.name.first = displayName.substr(0, spaceIndex).trim();
        this.name.last = displayName.substr(spaceIndex + 1).trim();
      });

    userSchema.plugin(passportLocalMongoose, {
      passwordValidator: function(password, cb) {
        var err = password.length > 12 ||
                  (setup.env !== 'production' && password === 'insecure') ?
                  null :
                  new Error('Password must be at least 12 charachters long');
        cb(err);
      }
    });

    userSchema.method('seen', function(done) {
      var user = this;
      done = done || function(){};
      var diff = Date.now() - user.lastSeen.getTime() < 60 * 1000;
      debug(`seen ${user.username} (${diff}), ${Date.now()} ${user.lastSeen.getTime()}`);
      if (diff) return done(null, user);
      user.lastSeen = new Date();
      user.save(done);
    });

    userSchema.static('findOneByProvider', function(provider, id, next) {
      return this.findOne({
        'accounts.provider': provider,
        'accounts.providerUserId': id
      }, next);
    });

    userSchema.plugin(mongooseUnique);

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


  setupOperations.WS = function(setup, done) {
    done = addAndPassSetup('WS', setup, done);
    var User = setup.db.model('User');
    var io = require('socket.io')(server, {
      path: '/ws',
      // serveClient: false,
      // origins: '*'
    });

    function socketSessionId(socket, sessionCookieName) {
      var cookies = {};
      socket.handshake.headers.cookie
        .split('; ')
        .forEach(kv => {
          kv = kv.split('=');
          cookies[kv[0]] = decodeURIComponent(kv[1]);
        });
      return ((cookies[sessionCookieName] || '').split(/:|\./) || [])[1] || false;
    }

    function socketGetSession(socket, sessionStore, sessionId, next) {
      sessionStore.get(sessionId, function (err, ioSession) {
        if (!ioSession || !ioSession.passport || !ioSession.passport.user) return;
        User.findByUsername(ioSession.passport.user, function(err, user) {
          socket.user = user;
          next(err, socket);
        });
      });
    }


    io.on('connection', function(socket) {
      var sessionId = socketSessionId(socket, setup.sessionOptions.name);
      debug('WS connection with session ID: %s', sessionId);
      if (!sessionId) return;
      debug('socket user username', (socket.user || {}).username);
      socketGetSession(socket, setup.sessionOptions.store, sessionId, function() {
        socket.on('appstatus', function(data, next) {
          return next({
            upSince: app._upSince
          });
        });
        // if (!socket.user) return;
        // socket.broadcast.emit('userconnect', {
        //   username: socket.user.username
        // });

        // socket.emit('userwelcome', {
        //   message: 'Hello ' + socket.user.username
        // });
      });
    });

    done(null, io);
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
  setupOperations.rutUser = require('./lib/rut-user');





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
    setup.db.model('User').findByUsername(setup.rutUsername, function (err, rutUser) {
      if (err) { return done(err); }

      async.map(serviceNames, function (name, nextName) {
        var service = setup.services[name];
        // that part sucks... but i need it to work
        var redirectURI = options.env === 'development' ?
                          ('http://localhost:9091/' + service.name + '-' + service.version + '#/oauth/callback') :
                          'https://zeropaper.github.io/' + service.name + '/';

        Client.findOne({name:name})
        .populate('owner')
        .exec(function (err, client) {
          if (err) { return nextName(err); }
          if (!client) {
            debug('  %s does not have client', name);
            return Client.create({
              owner: rutUser,
              name: name,
              redirectURI: redirectURI,
              secret: 'yadayada'
            }, function (err, client) {
              if (err) { return nextName(err); }
              debug('    %s registered', name);
              nextName(null, client.name);
            });
          }

          debug('  %s already have client owned by %s', name, client.owner.username);
          if (client.redirectURI === redirectURI && client.owner) {
            debug('    %s already up-to-date', name);
            return nextName(null, client.name);
          }

          client.owner = rutUser;
          client.redirectURI = redirectURI;
          client.save(function (err) {
            if (err) { return nextName(err); }
            debug('    %s updated', name);
            nextName(null, client.name);
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
  setupOperations.sdk = require('./lib/sdk');






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
    debug('  rut initialization complete');
    initFinished(null, setupResults);
  });
};