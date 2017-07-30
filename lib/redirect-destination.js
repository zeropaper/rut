'use strict';
/*jshint node: true*/
module.exports = function redirectDestination(req, res, defaultRedirect = '/') {
  var destination = req.body ? req.body.destination : false;
  res.redirect(destination || defaultRedirect);
};