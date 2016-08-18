'use strict';
var debug = require('debug')('rut:core:ui:logged-in');

module.exports = function ensureLoggedIn(req, res, next) {
  var hasSession = req.session && req.session.passport && req.session.passport.user;
  debug('ensureLoggedIn has no session %s, %s', !hasSession, req.user ? req.user.username : null);

  if (!hasSession) {
    debug('  redirect to login to continue to %s', req.originalUrl);
    return res.redirect('/login?destination=' + encodeURIComponent(req.originalUrl));
  }

  next();
};