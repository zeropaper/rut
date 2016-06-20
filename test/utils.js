'use strict';
var utils = {};

var rut = require('./../index');
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
// var Mongoose = require('mongoose').Mongoose;
// var mongoose = new Mongoose();
// var mockgoose = require('mockgoose');


utils.cleanRut = function cleanRut(opts, done) {
  async.series({
    // cleanupDb: function (cb) {
    //   if (!db || !db.modelNames) { return cb(); }

    //   async.map(db.modelNames(), function (className, c) {
    //     db.model(className).find({}).remove(c);
    //   }, cb);
    // },
    disconnectDb: function (cb) {
      if (!db || !db.disconnect) { return cb(); }

      db.disconnect(cb);
    },
    rut: function (cb) {
      rut(opts, function (err, results) {
        db = results.db || db;
        cb(err, results);
      });
    // },
    // createTestUser: function (cb) {
    //   var User = _results.db.model('User');
    //   function create() {
    //     User.register({
    //       username: 'testuser'
    //     }, 'testpassword', function (err, testuser) {
    //       if (err) { return cb(err); }
    //       cb(null, testuser);
    //     });
    //   }

    //   User.findByUsername('testuser', function (err, existing) {
    //     if (err) { return cb(err); }

    //     if (existing) {
    //       return existing.remove(function (err) {
    //         if (err) { return cb(err); }
    //         create();
    //       });
    //     }

    //     create();
    //   });
    }
  }, function (err, results) {
    if (err) { return done(err); }
    done(null, results.rut);
  });
};

module.exports = utils;
