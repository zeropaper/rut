'use strict';
/*jshint node: true*/
const passportLocalMongoose = require('passport-local-mongoose'),
      mongooseUnique        = require('mongoose-unique-validator'),
      debug                 = require('debug')('rut:user'),
      findOneArray          = require('./../lib/find-one-array'),
      redirectDestination   = require('./../lib/redirect-destination'),
      ensureAuthenticated   = require('./../lib/ensure-authenticated');

function ensureAnon(req, res, next) {
  if (req.isAuthenticated()) {
    return redirectDestination(req, res, '/account');
  }
  next();
}


module.exports = function(db, Schema) {
  var accountSchema = new Schema({
    provider: {type: String, required: true},
    providerUserId: {type: String, required: true},
    auth: {type: Schema.Types.Mixed, required: true},
    profile: {type: Schema.Types.Mixed, required: true}
  });

  var userSchema = new Schema({
    name: {
      first: {type: String, default: 'Anon'},
      last: {type: String, default: 'Ymous'}
    },
    // email: {type: String, required: true, unique: true},
    username: {type: String, required: true, unique: true},
    accounts: [accountSchema],
    roles: [String]
  }, {
    timestamps: {}
  });

  userSchema.virtual('displayName').
    get(function() { return this.name.first + ' ' + this.name.last; }).
    set(function(displayName) {
      this.name.first = displayName.substr(0, displayName.indexOf(' ')).trim();
      this.name.last = displayName.substr(displayName.indexOf(' ') + 1).trim();
    });

  userSchema.static('registerRoutes', function(app) {
    const User = this;

    app.use(function(req, res, next) {
      res.locals.userHasRole = function(roles) {
        return findOneArray(roles, req.user.roles);
      };
      next();
    });

    app.param('userName', function userName(req, res, next, username) {
      var User = db.model('User');
      User.findByUsername(username, function(err, user) {
        if (err) return next(err);
        if (user) {
          res.locals.params = res.locals.params || [];
          res.locals.params.push({
            docName: 'user',
            modelName: 'User',
            modelRoute: 'user',
            docId: user.id
          });
          res.locals.userParam = user;
        }
        next();
      });
    });

    function getAccount(req, res, next) {
      var viewed = res.locals.userParam;
      // doing so, the /user/:userId route can still be used
      if (!viewed) return next();

      res.render('user/details', {
        pageTitle: viewed.displayName,
        pageSubTitle: viewed.username
      });
    }
    app.get('/user/:userName', ensureAuthenticated, getAccount);
    app.get('/user/:userId', ensureAuthenticated, getAccount);

    app.post('/register', ensureAnon, function(req, res, next) {
      if (req.body.password != req.body['password-confirm']) {
        req.flash('error', 'Password and confirmation are not matching.');
        return res.redirect('/register');
      }

      User.register(new User({
        name: {
          first: req.body.firstname || 'Anon',
          last: req.body.lastname || 'Ymous'
        },
        username: req.body.username
      }), req.body.password, function(err) {
        if (err) {
          return next(err);
        }

        req.flash('success', 'Your account has been created.');
        redirectDestination(req, res, '/account');
      });
    });

    app.get('/register', ensureAnon, function(req, res) {
      res.render('user/register', {
        pageTitle: 'Register'
      });
    });

    app.post('/login',
              ensureAnon,
              function(req, res, next){
                req.authenticateLocal(req, res, next);
              },
              function(req, res) {
                req.flash('success', 'Your are now logged in.');
                redirectDestination(req, res, '/account');
              });

    app.get('/login', ensureAnon, function(req, res){
      res.render('user/login', {
        user: req.user,
        pageTitle: 'Login',
        noLogin: true,
        destination: req.body.destination
      });
    });

    app.get('/account', function(req, res){
      res.render('user/details', {
        user: req.user,
        userParam: req.user,
        pageTitle: 'Your Account', //req.user.displayName,
        pageSubTitle: req.user.username
      });
    });

    app.post('/user/:userId/edit', ensureAuthenticated, function updateUser(req, res, next) {
      var updated = res.locals.userParam;
      var data = req.body;
      data.roles = typeof data.roles === 'string' ? data.roles.split(/[, ]+/) : data.roles;
      updated.update(data, function(err) {
        if (err) {
          req.flash('error', 'Could not update ' + updated.username + '');
          return next(err);
        }

        req.flash('success', 'The account has been updated.');
        redirectDestination(req, res, '/user/' + updated.id);
      });
    });

    app.post('/user/:userId/password', ensureAuthenticated, function changePassword(req, res, next) {
      var destination = '/user/' + res.locals.userParam.id;
      var logger = db.model('Log').log;
      var editedUser = res.locals.userParam;
      var editingUser = req.user;

      var error;
      if (req.body.password !== req.body.confirmation) {
        error = 'Password and confirmation are not matching.';
      }
      else if (editingUser.id !== editedUser.id && editingUser.roles.indexOf('admin') < 0) {
        error = 'You can not change the password of ' + editingUser.username;
      }

      if (error) {
        req.flash('error', error);
        logger(error, req);
        return res.redirect(destination);
      }

      editedUser.setPassword(req.body.password, function(err) {
        if (err) {
          req.flash('error', 'The password of ' + editingUser.username + ' could not be changed.');
          return next(err);
        }

        editedUser.save(function() {
          if (err) {
            req.flash('error', 'The password of ' + editingUser.username + ' could not be changed.');
            return next(err);
          }
          req.flash('success', 'The password of ' + editingUser.username + ' has been changed.');
          res.redirect(destination);
        });
      });
    });

    app.get('/logout', function(req, res){
      req.logout();
      redirectDestination(req, res);
    });
  });

  userSchema.static('labelFor', function(name) {
    return name;
  });

  userSchema.plugin(passportLocalMongoose);

  userSchema.static('findOneByProvider', function(provider, id, next) {
    return this.findOne({
      'accounts.provider': provider,
      'accounts.providerUserId': id
    }, next);
  });

  userSchema.plugin(mongooseUnique);

  db.model('User', userSchema);
};