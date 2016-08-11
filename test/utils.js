'use strict';
var utils = {};

var rut = require(__dirname + '/../index');
var assign = require('lodash.assign');
var async = require('async');

var defaultOptions = {
  dbWipe: true,
  dbFixtures: true,
  ip: '127.0.0.1',
  port: 9091,
  env: 'development',
  apiDir: require('path').join(__dirname, '/test-services/'),
  mongodbURL: 'mongodb://127.0.0.1/rut-test'
};

utils.options = function options(given) {
  return assign({}, defaultOptions, given || {});
};

var db;
utils.cleanRut = function cleanRut(opts, done) {
  async.series({

    disconnectDb: function (cb) {
      if (!db || !db.disconnect) { return cb(); }

      db.disconnect(cb);
    },
    rut: function (cb) {
      rut(opts, function (err, results) {
        db = results.db || db;
        cb(err, results);
      });
    }
  }, function (err, results) {
    if (err) { return done(err); }
    done(null, results.rut);
  });
};

module.exports = utils;
