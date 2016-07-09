'use strict';

var rut = require(__dirname + '/index');

var ip = process.env.OPENSHIFT_NODEJS_IP || 'localhost';
var port = process.env.OPENSHIFT_NODEJS_PORT || '9090';
var env = process.env.OPENSHIFT_NODEJS_IP ? 'production' : (process.env.NODE_ENV || 'development');

var options = {
  apiDir: './test/test-services/',
  serviceYamlPattern: '{simple,implicit}/*.yaml',
  dbFixtures: true,
  dbWipe: true,
  env: env,
  ip: ip,
  mongodbURL: 'mongodb://127.0.0.1/rut',
  port: port,
  prodHost: process.env.OPENSHIFT_APP_DNS,
};

var oauthProviders = options.oauthProviders = {};
// oauthProviders.FACEBOOK_APP_ID = 'YOUR_APP_ID';
// oauthProviders.FACEBOOK_APP_SECRET = 'YOUR_APP_SECRET';


if (env === 'production') {
  options.dbWipe = false;
  options.dbFixtures = false;
  options.mongodbURL = process.env.OPENSHIFT_MONGODB_DB_URL + process.env.OPENSHIFT_APP_NAME;

  options.schemes = ['https'];
  options.baseUrl = 'https://' + process.env.OPENSHIFT_APP_DNS;
  options.validateResponse = false;
}


rut(options, function (err, results) {
  results.server.listen(port, ip, function() {
    console.info('%s: Node server started on %s:%d ...', Date(Date.now()), ip, port);
    if (env === 'development') {
      try {
        // Invoke express-print-routes
        require('express-print-routes')(results.app, 'routes.generated.txt');
      }
      catch (e) {}

      var staticApp = require('express')();
      var serveStatic = require('serve-static');
      Object.keys(results.serveStatic).forEach(function (local) {
        staticApp.use(results.serveStatic[local], serveStatic(local));
      });

      staticApp.listen(9091, ip, function () {
        console.info('%s: Node static server started on %s:%d ...', Date(Date.now()), ip, 9091);
      });
    }
  });
});
