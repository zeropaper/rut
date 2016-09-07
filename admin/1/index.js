'use strict';
var async = require('async');
var debug = require('debug')('rut:admin');

module.exports = function(setup) {
  var controllers = {};
  var db = setup.db;




  function modelCount(modelName) {
    return function (done) {
      var Model = db.model(modelName);
      Model.find().count(done);
    };
  }

  function modelInfo(modelName) {
    return function (cb) {
      var Model = db.model(modelName);
      var obj = {};
      debug('model info schema %s', modelName, Model.schema);


      modelCount(function (err, count) {
        if (err) { return cb(err); }
        obj.count = count;
        cb(err, obj);
      });
    };
  }

  controllers.modelList = function (req, res, next) {
    async.parallel(db.modelNames().map(modelInfo), function (err, results) {
      if (err) { return next(err); }
      res.send({items: results, total: results.length});
    });
  };


  controllers.modelDescription = function (req, res, next) {
    var modelName = req.swagger.params.model.value;
    modelInfo(modelName)(function (err, description) {
      if (err) { return next(err); }
      res.send(description);
    });
  };


  controllers.documentList = function (req, res, next) {
    res.status(501);
    next();
  };


  controllers.documentCreation = function (req, res, next) {
    res.status(501);
    next();
  };


  return controllers;
};