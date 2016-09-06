'use strict';
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var async = require('async');
var swaggerTools = require('swagger-tools');
var swaggerEditor = require('./swagger-editor-server');
var assign = require('lodash.assign');
var camelCase = require('lodash.camelcase');
var debug = require('debug')('rut:service');

var addAndPassSetup = require('./add-and-pass-setup');

var loadYamlSpecSync = require('./load-yaml-spec-sync');
var cors = require('./cors');


var service = module.exports = {};







function summarizeValidation(array, name, type) {
  type = type || 'error';
  return array.reduce(function (msg, item) {
    var details = item.inner ? item.inner.reduce(function (str, inner) {
      return str + ('   -- ' + inner.message + '\n');
    }, '') : '';
    return msg + (item.message ? (' -- ' + item.message + (item.path ? (': ' + item.path) : '') + (details ? ('\n' + details) : '') + '\n') : '');
  }, 'Swagger doc validation ' + type + ' for "' + name + '":\n');
}














service.discover = function (setup, done) {
  done = addAndPassSetup('swaggerFiles', setup, done);

  debug('Discover service YAML files "%s" in "%s"', setup.serviceYamlPattern, setup.apiDir);
  glob(setup.serviceYamlPattern, {cwd: setup.apiDir}, function (err, files) {
    if (err) {
      debug('  discovery error', err);
      return done(err);
    }
    setup.services = setup.services || {};

    debug('  found\n    - %s', files.join('\n    - '));
    files = files.map(function(filepath) {
      return path.resolve(path.join(setup.apiDir, filepath));
    });
    files.push(path.resolve(__dirname + '/../admin/1.yaml'));

    async.each(files, function (filepath, fileDone) {
      var parts = filepath.split('/');
      var name = parts[parts.length - 2];
      var version = parts[parts.length - 1].split('.').shift();
      var id = camelCase(name + version);

      debug('  swagger YAML file %s %s %s', filepath, name, version);

      // var swaggerDoc = loadYamlSpecSync(path.join(setup.apiDir, filepath));
      var swaggerDoc = loadYamlSpecSync(filepath);
      swaggerDoc.basePath = '/' + name + '/' + version;
      swaggerDoc.host = setup.ip +
                        (setup.port !== 80 && setup.port !== 443 ?
                          (':' + setup.port) :
                        '');
      if (setup.env === 'production' && setup.prodHost) {
        swaggerDoc.host = setup.prodHost;
      }

      debug('  set swagger doc host to (%s://)%s with basePath %s', setup.protocol, swaggerDoc.host, swaggerDoc.basePath);

      Object.keys(swaggerDoc.securityDefinitions || {}).forEach(function (key) {
        var definition = swaggerDoc.securityDefinitions[key];
        if (definition.type !== 'oauth2' || definition.flow !== 'implicit') { return; }

        definition.authorizationUrl = setup.baseUrl +
                                      '/authorization?client_id=' + name + version +
                                      '&response_type=' + (definition.flow === 'implicit' ? 'token' : 'code') +
                                      '&redirect_uri=';

        debug('    authorizationUrl for oauth2 implicit flow set to %s', definition.authorizationUrl);
      });

      var helpers = require('swagger-tools/lib/helpers');
      var spec = helpers.getSpec(helpers.getSwaggerVersion(swaggerDoc), true);
      spec.validate.apply(spec, [swaggerDoc, function (err, results) {
        if (err) { return fileDone(err); }
        if (results && results.errors && results.errors.length) {
          return fileDone(new Error(summarizeValidation(results.errors, name)));
        }
        if (results && results.warnings && results.warnings.length) {
          debug('    swagger validation warnings %s', summarizeValidation(results.warnings, name, 'warning'));
        }

        setup.services[id] = {
          filepath: filepath,
          apiDir: setup.apiDir,
          definition: swaggerDoc,
          // filepath: filepath,
          libpath: filepath.split('.yaml')[0],
          id: id,
          name: name,
          version: version
        };

        var controllersPath = path.join(setup.services[id].libpath, 'index');
        try {
          setup.services[id].controllers = require(controllersPath)(setup, setup.services[id]);
          debug('    found controllers in %s\n- %s', controllersPath, Object.keys(setup.services[id].controllers).join('\n- '));
        }
        catch (err) {
          debug('    cannot load %s (%s) controllers from %s, %s', swaggerDoc.info.title, id, controllersPath, err.stack);
        }

        try {
          setup.services[id].schemas = require(path.join(setup.services[id].libpath, 'schemas'))(setup, setup.services[id]);
        }
        catch (err) {  }

        fileDone();
      }]);
    }, function (err) {
      done(err, files);
    });
  });
};

service.Models = function (setup, done) {
  done = addAndPassSetup('serviceModels', setup, done);
  debug('Models');
  async.each(Object.keys(setup.services), function (key, cb) {
    var item = setup.services[key];
    debug('  for schema %s', key);

    item.Models = item.Models || {};
    Object.keys(item.schemas || {}).map(function (schemaName) {
      var name = camelCase(schemaName);
      debug('    registering %s (%s)', name, schemaName);
      item.Models[name] = setup.db.model(name, item.schemas[schemaName]);
    });

    cb();
  }, function (err) {
    done(err, {});
  });
};

service.Statics = function (setup, done) {
  debug('Service public directories');
  setup.serveStatic = setup.serveStatic || {};

  async.each(Object.keys(setup.services), function (key, cb) {
    var item = setup.services[key];
    debug('  %s - %s | %s', key, item.version, item.definition.info.version);

    var publicPath = path.join(item.libpath, '/public');
    var servedPath = '/' + item.name + '-' + item.version + '/';

    fs.exists(publicPath, function (yepNope) {
      debug('  serve "%s" as "%s"? %s', publicPath, servedPath, yepNope);
      if (!yepNope) { return cb(); }

      setup.serveStatic[item.libpath + '/public/'] = servedPath;
      cb();
    });
  }, function (err) {
    done(err, setup);
  });
};

service.APIs = function (setup, done) {
  debug('Service API');
  setup.app.use(cors(setup));

  async.each(Object.keys(setup.services), function (key, cb) {
    var item = setup.services[key];
    var swaggerDoc = item.definition;
    var controllers = item.controllers;

    debug('  setup for %s', item.name);


    setup.app.use(swaggerDoc.basePath + '.yaml', function (req, res) {
      debug('serve %s %s YAML definition', item.name, item.version);
      res.type('text/yaml; charset=UTF-8');

      fs.readFile(item.filepath, function (err, content) {
        content = content.toString()/*.replace(
                    /host(\s*):(\s*)(.+)/g,
                    '# host$1:$2$3\nhost: ' + req.headers.host
                  )*/;
        res.send(content);
      });
    });

    setup.app.use(swaggerDoc.basePath + '.json', function (req, res) {
      debug('serve %s %s JSON definition', item.name, item.version);
      res.type('application/json; charset=UTF-8');

      res.send(assign({}, swaggerDoc, {
        schemes: setup.schemes
        // host: req.headers.host
      }));
    });

    debug('  hosted on http://%s%s.json', swaggerDoc.host, swaggerDoc.basePath);
    swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {
      debug('    use %s %s swagger middleware on app', item.name, item.version);

      // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
      setup.app.use(middleware.swaggerMetadata());


      setup.app.use(middleware.swaggerSecurity({
        implicitOauth2: function (req, def, scopes, callback) {
          debug('implicitOauth2 swagger security');
          setup.passport.authenticate('accessToken', { session: false })(req, req.res, callback);
        }
      }));

      // Route validated requests to appropriate controller
      setup.app.use(middleware.swaggerRouter({
        // useStubs: setup.useStubs,
        controllers: controllers
      }));

      // Serve the Swagger UI
      if (setup.env === 'development') {
        setup.app.use(middleware.swaggerUi({
          apiDocs: item.definition.basePath + '.json',
          swaggerUi: '/docs' + item.definition.basePath
        }));
      }
      cb();
    });
  }, function (err) {
    addAndPassSetup('serviceAPIs', setup, done)(err, {});
  });
};




service.Editors = function (setup, done) {
  async.each(Object.keys(setup.services), function (key, cb) {
    if (setup.env === 'development') {
      var item = setup.services[key];
      // Serve the Swagger Editor
      swaggerEditor(setup.app, {
        base: '/editor' + item.definition.basePath,
        id: key,
        spec: item.definition,
        specfilePath: item.filepath
      });
    }
    cb();
  }, function (err) {
    addAndPassSetup('serviceEditors', setup, done)(err, {});
  });
};

service.Docs = function (setup, done) {
  async.each(Object.keys(setup.services), function (key, cb) {
    // if (setup.env === 'development') {
    //   var item = setup.services[key];
    //   // Serve the Swagger UI
    //   setup.app.use(middleware.swaggerUi({
    //     apiDocs: '/api-docs' + item.definition.basePath,
    //     swaggerUi: '/docs' + item.definition.basePath
    //   }));
    // }
    cb();
  }, function (err) {
    addAndPassSetup('serviceDocs', setup, done)(err, {});
  });
};

service.Fixtures = function (setup, done) {
  done = addAndPassSetup('serviceFixtures', setup, done);
  if (!setup.dbFixtures) { return done(); }

  async.each(Object.keys(setup.services), function (key, cb) {
    var service = setup.services[key];
    var fixtures;

    try {
      var _module = require(service.libpath + '/fixtures');
      fixtures = _module(setup);
    }
    catch (e) {
      debug('  no fixtures for %s', key);
      return cb();
    }

    fixtures(cb);
  }, done);
};