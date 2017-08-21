'use strict';
var ensureLoggedIn = require('./ensure-logged-in');
var async = require('async');
var debug = require('debug')('rut:core:ui:inspect');

module.exports = function (setup) {
  var app = setup.app;

  app.get('/inspect',
    ensureLoggedIn,
    function (req, res, next) {
      if (!req.user || req.user.username !== setup.rutUsername) { return next(); }
      debug('inspect page');
      var modelNames = setup.db.modelNames();
      async.map(modelNames, function (modelName, cb) {
        debug('  model %s', modelName);

        setup.db.model(modelName).count({}, function (err, count) {
          if (err) { return cb(err); }
          debug('  has %s records', modelName, count || 'no');
          cb(null, count);
        });
      }, function (err, results) {
        if (err) { return next(err); }
        var data = {};
        results.forEach(function (result, r) {
          data[modelNames[r]] = result;
        });
        res.render('inspect', {
          admin: true,
          messages: req.flash(),
          user: req.user,
          models: data
        });
      });
    });

  app.get('/inspect/:modelName',
    ensureLoggedIn,
    function (req, res, next) {
      if (!req.user || req.user.username !== setup.rutUsername) { return next(); }
      var modelName = req.params.modelName;
      var Model = setup.db.model(modelName);
      debug('inspect page for model %s', modelName);

      Model.find(function (err, docs) {
        console.info(err || docs);
        if (err) { return next(err); }
        res.render('inspect', {
          admin: true,
          messages: req.flash(),
          modelName: modelName,
          model: Model,
          user: req.user,
          documents: docs
        });
      });
    });

  app.get('/inspect/:modelName/:modelId',
    ensureLoggedIn,
    function(req, res, next) {
      var modelName = req.params.modelName;
      var Model = setup.db.model(modelName);
      Model.findById(req.params.modelId, function(err, doc) {
        if (err) { return next(err); }
        if (!doc) { res.status(404); return next(new Error('Not Found')); }
        res.render('inspect-details', {
          admin: true,
          messages: req.flash(),
          modelName: modelName,
          model: Model,
          document: doc
        });
      });
    });
};