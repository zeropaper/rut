'use strict';

module.exports = function (setup, done) {
  var browserify = require('browserify');
  var b = browserify(null, {standalone: 'RutSDK'});
  var Ampersand = '';
  b.add(__dirname + '/sdk-browser.js');

  var addAndPassSetup = require('./add-and-pass-setup');
  var template = require('lodash.template');
  var debug = require('debug')('rut:sdk');
  var fs = require('fs');
  var scriptTemplate = template([
    '/*  Swagger client http://swagger.io/ */',
    '<%= swaggerClientScript %>',
    '/*  Ampersand stuff https://ampersandjs.com/ */',
    '<%= Ampersand %>',

    'var noop = function(){};',

    '(function(){',
      'var spec = <%= spec %>;',

      'var factory = window.rutFactory || RutSDK.factory || noop;',
      'var done = window.rutAdminInit || noop;',

      'var client = new SwaggerClient({',
        'spec: spec,',
        'success: function() {',
          'factory(client);',
          'done(null, client);',
        '},',
        'error: done',
      '});',
    '})();'
  ].join('\n'));

  done = addAndPassSetup('rutUser', setup, done);
  var min = '.min';// (setup.env === 'development' ? '' : '.min');
  debug('sdk minified? %s', min);
  var swaggerClientScript = fs.readFileSync(require.resolve('swagger-client/browser/swagger-client' + min + '.js'), 'utf8');

  setup.app.param('sdkId', function (req, res, next, id) {
    debug('sdkId %s', id);
    if (!setup.services[id]) {
      return next();
    }

    req.rutService = setup.services[id];
    next();
  });

  setup.app.get('/sdk/:sdkId.js', function (req, res) {
    var scripts = scriptTemplate({
      swaggerClientScript: swaggerClientScript,
      Ampersand: Ampersand,
      spec: JSON.stringify(req.rutService.definition)
    });

    res.type('text/javascript');
    res.send(scripts);
  });

  b.bundle(function(err, buffer) {
    if (buffer) { Ampersand = buffer.toString(); }
    done(err);
  });
};