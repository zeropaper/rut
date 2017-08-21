'use strict';
var addAndPassSetup = require('./add-and-pass-setup');
var debug = require('debug')('rut:sdk');
var browserify = require('browserify');

module.exports = function (setup, done) {
  var bundle = browserify(null, {standalone: 'RUT'});
  var Ampersand = '';
  bundle.add(__dirname + '/sdk-browser.js');


  done = addAndPassSetup('sdk', setup, done);

  setup.app.param('sdkId', function (req, res, next, id) {
    debug('sdkId %s', id);
    if (!setup.services[id]) {
      res.status(404);
      return next(new Error('Not Found'));
    }
    req.rutService = setup.services[id];
    next();
  });

  setup.app.get('/sdk/:sdkId.js', function (req, res) {
    var scripts = `${Ampersand}
(function(){
  var noop = function(){};
  var factory = window.${req.rutService.name}ClientFactory || RUT.factory || noop;
  var options = window.${req.rutService.name}ClientOptions || {};
  var success = options.success || noop;
  options.success = function() {
    factory(client);
    (window.${req.rutService.name}ClientInit || noop)(client);
  };
  var client = RUT.client('${setup.baseUrl}/${req.rutService.name}/${req.rutService.version}.json', options);
})();`;

    res.type('text/javascript');
    res.send(scripts);
  });

  bundle.bundle(function(err, buffer) {
    if (buffer) { Ampersand = buffer.toString(); }
    done(err);
  });
};