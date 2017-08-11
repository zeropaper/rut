'use strict';
/*jshint node: true*/
const bodyParser            = require('body-parser'),
      debug                 = require('debug')('rut'),
      clone                 = require('lodash.clone'),
      connectFlash          = require('connect-flash'),
      compression           = require('compression'),
      express               = require('express'),
      fs                    = require('fs-extra'),
      helmet                = require('helmet'),
      http                  = require('http'),
      methodOverride        = require('method-override'),
      moment                = require('moment'),
      mongoose              = require('mongoose'),
      partials              = require('express-partials'),
      path                  = require('path'),
      session               = require('express-session'),
      socketIo              = require('socket.io'),
      atPath                = require('./lib/at-path'),
      ensureAdminUser       = require('./lib/ensure-admin-user'),
      randomString          = require('./lib/random-string'),
      setupDev              = require('./lib/setup-dev'),
      setupMDContent        = require('./lib/setup-markdown-content'),
      setupModelGenerics    = require('./lib/setup-model-generics'),
      setupPassport         = require('./lib/passport-integration'),
      markdownRenderer      = require('./lib/markdown-renderer');


function menuHandler(contentPath) {
  var menu;
  try {
    menu = require(path.join(contentPath, 'menu'));
  }
  catch(_){}

  function menuMaker(cache) {
    return function(newItems = false, clear = false) {
      if (newItems) cache = clear ? clone(newItems) : merge(cache, newItems);
      return cache;
    };
  }

  return function menuMiddleware(req, res, next) {
    var tabs = {};
    res.locals.tabs = menuMaker(tabs);

    res.locals.menu = menuMaker(menu);
    next();
  };
}


const _rutPlugins = [];
function loadModels(db, plugins) {
  var args = [db, mongoose.Schema];
  _rutPlugins.push(require('./models/user')(...args));
  _rutPlugins.push(require('./models/log')(...args));
  plugins.forEach(function(plugin) {
    var fn = typeof plugin === 'string' ? require(plugin) : plugin;
    _rutPlugins.push(fn(...args));
  });
}

function execPlugins(functionName, ...args) {
  return _rutPlugins
    .filter(plugin => plugin && typeof plugin[functionName] === 'function')
    .map(plugin => plugin[functionName](...args));
}




function setupErrorHandling(app, db) {
  var Log = db.model('Log');

  app.get('*', function(req, res, next) {
    res.status(404);
    next(new Error('Not Found'));
  });

  app.use(function(err, req, res, next) {
    debug('error handler: ' + err.message);
    if (res.statusCode < 400) res.status(500);

    Log.logError(err, req);

    console.warn('Application error', err.stack);

    res.render('error', {
      code: res.statusCode,
      error: err
    });
  });
}



module.exports = function butRut(setup) {
  debug(`Setup ${(setup.plugins || []).length} plugin(s)`);
  const MongoStore            = require('connect-mongo')(session),
        app                   = express(),
        plugins               = setup.plugins ||
                                [],
        server                = http.createServer(app),
        io                    = socketIo(server),
        sessionSecret         = setup.sessionSecret,
        sessionCookieName     = setup.sessionCookieName ||
                                'rut.sid',
        basePath              = setup.basePath ||
                                '/',
        dataPath              = setup.dataDir,
        tmpPath               = setup.tmpDir,
        staticPath            = setup.staticDir,
        viewsPath             = setup.viewsDir,
        adminPassword         = setup.adminPassword ||
                                'R34lly1ns3cur3!!!',
        staticMaxAge          = setup.staticMaxAge ||
                                '0s',
        production            = setup.production,
        webPort               = setup.webPort,
        webAddress            = setup.webAddress,
        mongoDBURL            = setup.mongoDBURL,
        rutViewsPath          = path.join(__dirname, 'views'),
        tmpViewsPath          = (rutViewsPath === viewsPath ? viewsPath : tmpPath + '/rutViews'),
        appBootTime           = Date.now();

  setup.rutViewsPath = rutViewsPath;
  setup.tmpViewsPath = tmpViewsPath;

  function copyViews(next) {
    if (tmpViewsPath === rutViewsPath) return next();
    fs.emptyDir(tmpViewsPath)
      .then(() => {
        fs.copy(rutViewsPath, tmpViewsPath)
          .then(() => {
            fs.copy(viewsPath, tmpViewsPath)
              .then(next)
              .catch(next);
          })
          .catch(next);
      })
      .catch(next);
  }

  mongoose.Promise = global.Promise;

  mongoose.createConnection(mongoDBURL, {
    useMongoClient: true
  }).then(function(db) {
    function setupRut(err) {
      if (err) throw err;

      setupPassport(app, db, setup);

      io.on('connection', function (socket) {
        socket.emit('news', { hello: 'world' });
        socket.on('my other event', function (data) {
          console.log(data);
        });
      });

      Object.keys(db.models).forEach(function(modelName) {
        var Model = db.model(modelName);
        [
          'registerRoutes'
        ].forEach(function(methodName) {
          var method = Model[methodName];
          if (typeof method === 'function') {
            debug(`model plugin ${modelName}.${methodName}(app, io)`);
            method(app, io);
          }
        });
      });
      execPlugins('router', app, io);

      setupDev(app, db);

      setupModelGenerics(app, db);

      app.get('/toc', function(req, res) {
        res.render('toc', {
          pageTitle: 'Table Of Contents'
        });
      });

      setupMDContent(app, contentPath);

      setupErrorHandling(app, db);

      server.listen(webPort, webAddress, function (err) {
        if (err) throw err;
        console.log(`Application worker ${process.pid} started in ${(Date.now() - appBootTime)}ms`);
      });
    }


    copyViews(function(err) {
      if (err) throw err;
      loadModels(db, plugins);

      app.use(function(req, res, next){
        res.locals.requestProcessTime = Date.now();
        next();
      });
      app.use(helmet());

      app.set('view engine', 'pug');
      app.set('views', tmpViewsPath);
      app.use(partials());

      app.use(compression());

      function serveStatic(path) {
        return express.static(path, {
          maxAge: staticMaxAge
        });
      }
      app.use(serveStatic(staticPath));
      var rutStaticPath = path.resolve('static');
      if (staticPath !== rutStaticPath) {
        app.use(serveStatic(rutStaticPath));
      }

      const mdcPath = path.join(path.dirname(require.resolve('material-components-web')), 'dist');
      app.use('/mdc.css', serveStatic(path.join(mdcPath, 'material-components-web.css')));
      app.use('/mdc.js', serveStatic(path.join(mdcPath, 'material-components-web.js')));

      const hljsPath = path.dirname(path.dirname(require.resolve('highlight.js')));
      app.use('/hljs.css', serveStatic(path.join(hljsPath, 'styles', 'default.css')));
      app.use('/hljs.js', serveStatic(path.join(hljsPath, 'lib', 'highlight.js')));


      app.locals.atPath = atPath;
      app.locals.clone = clone;
      app.locals.moment = moment;
      app.locals.markdownRenderer = function(input) {
        return markdownRenderer.render(input);
      };
      app.locals.productionMode = production;
      app.locals.randomString = randomString;
      app.locals.siteName = app.locals.title = setup.title || 'RUT';

      app.use(bodyParser.urlencoded({ extended: true }));
      app.use(bodyParser.json());
      app.use(methodOverride());
      app.use(session({
        name: sessionCookieName,
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: new MongoStore({
          mongooseConnection: db
        })
      }));

      app.use(menuHandler(contentPath));
      app.use(connectFlash());
      // override the render function for
      // - mark a user as seen if applicable
      // - ensure flash messages are rendered
      // - update the requestProcessTime
      app.use(function(req, res, next) {
        if (req.user) req.user.seen();
        var render = res.render;
        res.render = function(...args) {
          res.locals.messages = res.locals.messages || {};
          var msgs = req.flash();
          Object.keys(msgs).forEach(function(type) {
            res.locals.messages[type] = res.locals.messages[type] || [];
            msgs[type].forEach(msg => res.locals.messages[type].push(msg));
          });
          res.locals.user = req.user;
          res.locals.requestProcessTime = Date.now() - res.locals.requestProcessTime;
          render(...args);
        };
        next();
      });

      ensureAdminUser(db, adminPassword, setupRut);
    });
  }).catch(function(err) {
    console.error('Mongoose connection errror', err.stack);
    throw err;
  });
};
