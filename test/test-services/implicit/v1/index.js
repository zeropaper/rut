'use strict';
var debug = require('debug')('rut:test:implicit-service');
module.exports = function () {
  var controllers = {};
  controllers.simpleGet = function (req, res) {
    res.send({
      simple: 'ok'
    });
  };
  controllers.restrictedGet = function (req, res) {
    debug('request user', req.user.username);
    res.send({
      restricted: 'ok'
    });
  };
  return controllers;
};