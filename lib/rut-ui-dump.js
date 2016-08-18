'use strict';
var ensureLoggedIn = require('./ensure-logged-in');
var debug = require('debug')('rut:core:ui:dump');

module.exports = function (setup) {
  var app = setup.app;

  app.get('/dump/:modelName',
    ensureLoggedIn,
    function (req, res, next) {
      if (!req.user || req.user.username !== setup.rutUsername) { return next(); }
      var modelName = req.params.modelName;
      var Model = setup.db.model(modelName);
      debug('dump page for model %s', modelName);

      Model.find(function (err, docs) {
        if (err) { return next(err); }
        debug('  %s documents', docs.length);
        res.set('Content-Disposition', 'attachment; filename="' + modelName + '.json"');
        res.send(docs);
      });
    });
};