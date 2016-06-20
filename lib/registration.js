'use strict';
var debug = require('debug')('rut:core:registration');
// var bcrypt = require('bcrypt');
var uid = require('./uid');

module.exports = function (setup) {
  var exported = {};
  var db = setup.db;
  debug('db ready? %s', db && db.modelNames && db.modelNames().indexOf('User') > -1);



  exported.registerUser = function (req, res, next) {
    db.model('User').register(req.body.username, req.body.password, req.body.password, function(err) {
      if (err) {
        debug('error while user register!', err);
        return next(err);
      }

      debug('user registered!');

      res.redirect('/account');
    });
    // req.checkBody('username', 'No valid username is given').notEmpty().len(3, 40);
    // req.checkBody('password', 'No valid password is given').notEmpty().len(6, 50);

    // var errors = req.validationErrors();
    // if (errors) {
    //   res.send(errors, 400);
    // }
    // else {
    //   var username = req.body.username;
    //   var password = req.body.password;

    //   db.model('User')
    //   .findOne({username: username}, function (err, user) {
    //     if(user) {
    //       res.send("Username is already taken", 422);
    //     }
    //     else {
    //       bcrypt.hash(password, 11, function (err, hash) {
    //         db.model('User')
    //         .save({username: username, password: hash}, function (err) {
    //           if (err) { return next(err); }
    //           res.send({username: username}, 201);
    //         });
    //       });
    //     }
    //   });
    // }
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