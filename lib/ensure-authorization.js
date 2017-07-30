'use strict';
/*jshint node: true*/
// Simple route middleware to ensure user is authorization.
const findOneArray = require('./find-one-array');
module.exports = function ensureAuthorization(roles) {
  return function checkAuthorization(req, res, next) {
    if (req.isAuthenticated()) {
      res.locals.user = req.user;
      if (req.user.username === 'admin') return next();

      if(findOneArray(roles, req.user.roles)) return next();

      res.status(401);
      return next(new Error('Unauthorized'));
    }

    res.redirect('/login?destination=' + encodeURIComponent(req.route.path));
  };
};
