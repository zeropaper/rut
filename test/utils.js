'use strict';
var utils = {};

var rut = require(__dirname + '/../index');
var uid = require(__dirname + '/../lib/uid');
var assign = require('lodash.assign');
var async = require('async');
var request = require('supertest');
var crypto = require('crypto');


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

utils.expect = require('expect.js');


var _testUserCount = 0;
function rutUtils(results) {
  var obj = {};
  var rut = results.rut;
  obj.request = function rutRequest() {
    return request(rut.app);
  };
  obj.agent = function rutAgent() {
    return request.agent(rut.app);
  };
  obj.model = function rutModel(name) {
    return rut.db.model(name);
  };
  obj.rutUser = function rutUser(cb) {
    return rut.db.model('User').findByUsername(results.rutUsername, cb);
  };
  obj.testUser = function rutUser(name, password) {
    if (arguments.length === 2) {
      password = 'insecure';
    }
    if (arguments.length === 1) {
      password = 'insecure';
      _testUserCount++;
      name = 'testUser' + _testUserCount;
    }
    var cb = arguments[arguments.length - 1];
    return rut.db.model('User').register({
      username: name
    }, password, cb);
  };

  function _rutAPIToken(client, user, cb) {
    var token = uid(256);
    var tokenHash = crypto.createHash('sha1').update(token).digest('hex');
    var expirationDate = new Date(new Date().getTime() + (1000 * 60));

    db.model('AccessToken').create({
      token: tokenHash,
      expirationDate: expirationDate,
      scope: '*',
      user: user._id,
      client: client._id
    }, function(err) {
      if (err) { return cb(err); }
      cb(null, token, {
        // hash: tokenHash,
        expires_in: expirationDate.toISOString()
      });
    });
  }
  obj.APIToken = function rutAPIToken(client, user, cb) {
    if (typeof client === 'string') {
      return rut.db.model('APIClient').findOne({name: client}, function (err, obj) {
        if (err) { return cb(err); }
        obj.APIToken(obj, user, cb);
      });
    }

    if (typeof user === 'string') {
      return rut.db.model('APIClient').findByUsername(user, function (err, obj) {
        if (err) { return cb(err); }
        obj.APIToken(client, obj, cb);
      });
    }


    _rutAPIToken(client, user, cb);
  };

  return obj;
}

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
    var rut = results.rut;

    rut.testUtils = rutUtils(results);

    done(null, rut);
  });
};

module.exports = utils;
