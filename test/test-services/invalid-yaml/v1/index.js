'use strict';
module.exports = function () {
  var controllers = {};
  controllers.simpleGet = function (req, res, next) {
    next();
  };
  return controllers;
};