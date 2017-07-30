'use strict';
/*jshint node: true*/
const bodyParser            = require('body-parser'),
      clone                 = require('lodash.clone'),
      connectFlash          = require('connect-flash'),
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
      atPath                = require('./lib/at-path'),
      ensureAdminUser       = require('./lib/ensure-admin-user'),
      randomString          = require('./lib/random-string'),
      setupDev              = require('./lib/setup-dev'),
      setupMDContent        = require('./lib/setup-markdown-content'),
      setupModelGenerics    = require('./lib/setup-model-generics'),
      setupPassport         = require('./lib/passport-integration');




function loadModels(db, plugins) {
  require('./models/user')(db, mongoose.Schema);
  require('./models/log')(db, mongoose.Schema);
  plugins.forEach(function(plugin) {
    var fn = typeof plugin === 'string' ? require(plugin) : plugin;
    fn(db, mongoose.Schema);
  });
}



function setupErrorHandling(app, db) {
  var Log = db.model('Log');

  app.get('*', function(req, res, next) {
    res.status(404);
    next(new Error('Not Found'));
  });

  app.use(function(err, req, res, next) {
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
  const MongoStore            = require('connect-mongo')(session),
        app                   = express(),
        plugins               = setup.plugins || [],
        server                = http.createServer(app),
        sessionSecret         = setup.sessionSecret,
        dataPath              = setup.dataDir,
        tmpPath               = setup.tmpDir,
        staticPath            = setup.staticDir,
        viewsPath             = setup.viewsDir,
        adminPassword         = setup.adminPassword ||
                                'R34lly1ns3cur3!!!',
        production            = setup.production,
        webPort               = setup.webPort,
        webAddress            = setup.webAddress,
        mongoDBURL            = setup.mongoDBURL,
        rutViewsPath          = path.join(__dirname, 'views'),
        tmpViewsPath          = (rutViewsPath === viewsPath ? viewsPath : tmpPath + '/rutViews');

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

      Object.keys(db.models).forEach(function(modelName) {
        var Model = db.model(modelName);
        [
          'registerRutPlugin'
        ].forEach(function(methodName) {
          var method = Model[methodName];
          if (typeof method === 'function') {
            method(app);
          }
        });
      });

      setupDev(app, db);

      setupModelGenerics(app, db);

      setupMDContent(app, dataPath);

      setupErrorHandling(app, db);

      server.listen(webPort, webAddress, function (err) {
        if (err) throw err;
        console.log(`Application worker ${process.pid} started...`);
      });
    }


    copyViews(function(err) {
      if (err) throw err;

      loadModels(db, plugins);

      app.use(helmet());

      app.set('view engine', 'pug');
      app.set('views', tmpViewsPath);
      app.use(partials());

      app.use(express.static(staticPath));
      var rutStaticPath = path.resolve('static');
      if (staticPath !== rutStaticPath) {
        app.use(express.static(rutStaticPath));
      }

      const mdcPath = path.join(path.dirname(require.resolve('material-components-web')), 'dist');
      app.use('/mdc.css', express.static(path.join(mdcPath, 'material-components-web.css')));
      app.use('/mdc.js', express.static(path.join(mdcPath, 'material-components-web.js')));

      const hljsPath = path.dirname(path.dirname(require.resolve('highlight.js')));
      app.use('/hljs.css', express.static(path.join(hljsPath, 'styles', 'default.css')));
      app.use('/hljs.js', express.static(path.join(hljsPath, 'lib', 'highlight.js')));


      app.locals.atPath = atPath;
      app.locals.clone = clone;
      app.locals.moment = moment;
      app.locals.productionMode = production;
      app.locals.randomString = randomString;
      app.locals.siteName = app.locals.title = setup.title || 'RUT';

      app.use(bodyParser.urlencoded({ extended: true }));
      app.use(bodyParser.json());
      app.use(methodOverride());
      app.use(session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: new MongoStore({
          mongooseConnection: db
        })
      }));

      app.use(connectFlash());
      app.use(function(req, res, next) {
        var render = res.render;
        res.render = function(...args) {
          res.locals.messages = res.locals.messages || {};
          var msgs = req.flash();
          Object.keys(msgs).forEach(function(type) {
            res.locals.messages[type] = res.locals.messages[type] || [];
            msgs[type].forEach(msg => res.locals.messages[type].push(msg));
          });
          res.locals.user = req.user;
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
