'use strict';
var debug = require('debug')('rut:core:registration');
var uid = require('./uid');

module.exports = function (setup) {
  var exported = {};
  var db = setup.db;

  exported.registerUser = function (req, res, next) {
    db.model('User').register(req.body.username, req.body.password, function(err) {
      if (err) {
        debug('error while user register!', err);
        return next(err);
      }

      debug('user registered!');

      res.redirect('/account');
    });
  };

  exported.registerClient = function(req, res, next) {
    req.checkBody('name', 'No valid name is given').notEmpty().len(3, 40);

    var errors = req.validationErrors();
    if (errors) {
      res.send(errors, 400);
    }
    else {
      var name = req.body.name;
      // var clientId = uid(8);
      var clientSecret = uid(20);

      db.model('APIClient')
      .findOne({name: name}, function (err, client) {
        if(client) {
          res.send("Name is already taken", 422);
        }
        else {
          db.model('APIClient')
          .create({
            owner: req.user,
            name: name,
            secret: clientSecret
          }, function (err) {
            if (err) { return next(err); }
            res.send({
              name: name,
              secret: clientSecret
            }, 201);
          });
        }
      });
    }
  };

  return exported;
};