'use strict';
module.exports = function (options) {
  if (options.env !== 'development') {
    return function bypassRutIndex(req, res, next) { next(); };
  }

  return function serveRutIndex(req, res) {
    res.render('index', {
      user: req.user,
      pageTitle: 'Rut',
      services: options.services || {}
    });
  };
};
