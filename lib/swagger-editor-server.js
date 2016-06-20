'use strict';
/*jshint node:true*/
var path = require('path');
var readJson = require('./read-json');
var serveJson = require('./serve-json');
var fs = require('fs');
var serveStatic = require('serve-static');
                           // api:load-controllers
var debug = require('debug')('rut:editor');

function serveSpecfile(cfg, options) {
  if (!cfg.useBackendForStorage) {
    return function serveSpecfileDisabled(req, res, next) {
      next(new Error('Swagger Editor backend storage not activated'));
    };
  }

  return function serveSpecfileMiddleware(req, res, next) {
    var yamlfile = options.specfilePath;
    debug('editor backend %s', yamlfile);
    if (req.method === 'GET' || req.method === 'HEAD') {
      debug('  statically serve spec file %s', yamlfile);
      // Serve the file
      return serveStatic(yamlfile)(req, res, next);
    }
    else if (req.method === 'PUT') {
      // Write file to disk
      // https://github.com/apigee-127/swagger-tools/blob/9cd20748c0d0b3c3abae948bce1fd608c9d0df24/lib/specs.js#L1181
      debug('  will write %s', yamlfile, req.headers, req.query, req.params);
      var stream = fs.createWriteStream(yamlfile);
      stream.on('finish', function () {
        debug('    wrote %s', yamlfile);
        res.end('ok');
      });
      req.pipe(stream);
    }
    else {
      // Method not allowed
      res.writeHead(405, {
        'Allow': 'GET, HEAD, PUT',
        'Content-Length': '0'
      });
      res.end();
    }
  };
}

module.exports = function swaggerEditor(app, config) {
  config = config || {};
  config.base = config.base || '';
  debug('config.base: %s', config.base);

  var swaggerEditorRoot = path.join(__dirname, '../node_modules/swagger-editor');
  debug('swaggerEditorRoot: %s', swaggerEditorRoot);

  var backendEndpoint = '.yaml';

  var editorDefaults = readJson.sync(path.join(swaggerEditorRoot, 'config/defaults.json'));
  editorDefaults.examplesFolder = false;
  editorDefaults.disableNewUserIntro = true;
  editorDefaults.useBackendForStorage = true;
  editorDefaults.useYamlBackend = true;
  editorDefaults.backendEndpoint = config.base + backendEndpoint;
  // editorDefaults.backendEndpoint = config.base + '?yaml=' + config.id;
  editorDefaults.disableFileMenu = true;
  editorDefaults.enableTryIt = true;
  editorDefaults.exampleFiles = [];
  editorDefaults.disableCodeGen = true;
  editorDefaults.analytics = {google: {id: null}};


  // debug('defaults served at %s with\n%s', config.base + '/config/defaults.json', JSON.stringify(editorDefaults, null, 2));
  debug('defaults served at %s', config.base + '/config/defaults.json');
  app.get(config.base + '/config/defaults.json', serveJson(editorDefaults));

  var options = {
    specfilePath: config.specfilePath,
    editorRoot: swaggerEditorRoot,
    editorDefaults: editorDefaults
  };
  debug('backend point at %s pointing to %s', editorDefaults.backendEndpoint, options.specfilePath);
  app.use(editorDefaults.backendEndpoint, serveSpecfile(editorDefaults, options));

  app.use(config.base, serveStatic(swaggerEditorRoot, {fallthrough: false}));

  // some annoying bug in swagger-editor
  if (!app._swaggerEditorDist) {
    app.use('/dist', serveStatic(swaggerEditorRoot + '/dist', {fallthrough: false}));
    app._swaggerEditorDist = true;
  }
};
