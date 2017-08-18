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
    debug('service for sdkId', req.rutService);
    next();
  });

  setup.app.get('/sdk/:sdkId.js', function (req, res) {
    console.info(req.rutService);
    var scripts = `${Ampersand}
(function(){
  var noop = function(){};
  var factory = window.rutFactory || RUT.factory || noop;
  RUT.Client('${setup.baseUrl}/${req.rutService.name}/${req.rutService.version}.json')
    .then(client => {
      factory(client);
      (window.rutInit || noop)(client);
    })
    .catch(err => { console.log('RUT.Client Error', err); });
})();`;

    res.type('text/javascript');
    res.send(scripts);
  });

  bundle.bundle(function(err, buffer) {
    if (buffer) { Ampersand = buffer.toString(); }
    done(err);
  });
};