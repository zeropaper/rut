'use strict';

var fs = require('fs');
var async = require('async');
var debug = require('debug')('rut:core:ui:import');
var formidable = require('formidable');
var ensureLoggedIn = require('./ensure-logged-in');


module.exports = function (setup) {
  var app = setup.app;

  app.get('/import',
    ensureLoggedIn,
    function (req, res) {
      res.render('import', {
        admin: true,
        messages: req.flash(),
        user: req.user,
        models: setup.db.modelNames()
      });
    });

  app.post('/import',
    ensureLoggedIn,
    function (req, res, next) {
      if (!req.user || req.user.username !== setup.rutUsername) { return next(); }


      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields, files) {
        if (err) { return next(err); }
        var modelName = fields.modelName;
        debug('import %s model', modelName);


        var Model = setup.db.model(modelName);
        async.map(files, function (file, cb) {
          debug('  file', file);

          fs.readFile(file.path, function (err, data) {
            if (err) { return cb(err); }

            try {
              data = JSON.parse(data.toString());
            }
            catch (err) {
              return cb(err);
            }
            cb(null, data);
          });
        }, function (err, filesJSON) {
          if (err) {
            req.flash('error', err.message);
            return res.redirect('/inspect');
          }

          Object.keys(filesJSON).forEach(function (key) {
            var chunked = [];
            var array = filesJSON[key];
            var chunkSize = !Model.import && !!Model.findOrCreate ? 1 : 25;

            while (array.length) {
              chunked.push(array.slice(0, chunkSize));
              array = array.slice(chunkSize);
            }

            debug('  operations split in %s of %s %s items using "%s"', chunked.length, chunkSize, modelName, !!Model.import ? 'import' : (!!Model.findOrCreate ? 'find or create' : 'create'));
            var func = (Model.import || Model.findOrCreate || Model.create).bind(Model);

            chunked.forEach(function (chunk, c) {
              setTimeout(function () {
                var data = chunkSize === 1 ? (chunk[0] || {}) : chunk.map(function (item) {
                  delete item.id;
                  delete item._id;
                  delete item.__v;
                  return item;
                });

                if (chunkSize === 1) {
                  delete data.id;
                  delete data._id;
                  delete data.__v;
                }

                func(data, function importModelCreationCallback(e) {
                  debug('....import callback %s', e ? e.message : 'OK');
                });
              }, c * chunkSize * 100);
            });
          });

          req.flash('info', modelName + ' documents created');
          res.redirect('/inspect');
        });
      });
    });
};