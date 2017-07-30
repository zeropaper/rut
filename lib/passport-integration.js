'use strict';
/*jshint node: true*/
const passport            = require('passport'),
      githubIntegration   = require('./github-integration').passport;

module.exports = function setupPassport(app, db, setup) {
  const User = db.model('User');

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  passport.use(User.createStrategy());

  const authenticateLocal = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Invalid username or password.'
  });

  app.use(function(req, res, next) {
    req.authenticateLocal = authenticateLocal;
    next();
  });

  app.locals.authProviders = app.locals.authProviders || {};

  githubIntegration(passport, app, db, setup);
};