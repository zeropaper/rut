'use strict';
/*jshint node: true*/
const env              = process.env,
      path             = require('path'),
      production       = env.NODE_ENV == 'production',
      webPort          = env.NODE_PORT || 9090,
      mongoCredentials = env.MONGO_DB_CREDENTIALS ? (env.MONGO_DB_CREDENTIALS + '@') : '',
      mongoHost        = env.OPENSHIFT_MONGODB_DB_HOST || 'localhost',
      mongoPort        = env.OPENSHIFT_MONGODB_DB_PORT ? (':' + env.OPENSHIFT_MONGODB_DB_PORT) : '',
      rut              = require('./index');

rut({
  sessionSecret: env.RUTAPP_SESSION_SECRET,
  adminPassword: env.RUTAPP_ADMIN_PASS,
  production:    env.NODE_ENV == 'production',
  webPort:       webPort,
  webAddress:    env.NODE_IP || 'localhost',
  dataDir:       env.OPENSHIFT_DATA_DIR || path.resolve('guide'),
  tmpDir:        env.OPENSHIFT_TMP_DIR || '/tmp',
  staticDir:     path.resolve('static'),
  viewsDir:      path.resolve('views'),
  mongoDBURL:    'mongodb://' + mongoCredentials + mongoHost + mongoPort + '/rut',
  webAppBaseURL: (production ?
                    'https://' + env.OPENSHIFT_APP_DNS + '' :
                    'http://localhost:' + webPort),
  github: {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET
  }
});