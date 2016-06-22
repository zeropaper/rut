'use strict';
module.exports = function (options) {
  if (options.env === 'production') {
    return function bypassRutIndex(req, res) {
      res.redirect('/account');
    };
  }

  return function serveRutIndex(req, res) {
    res.render('index', {
      user: req.user,
      pageTitle: 'Rut',
      services: options.services || {}
    });
  };
};
