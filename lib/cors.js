'use strict';
var debug = require('debug')('rut:cors');

module.exports = function () {
  return function corsHandler(req, res, next) {
    if (!req.headers.origin) { return next(); }

    debug('from %s on %s (%s)', req.headers.origin, req.headers.host, req.originalUrl);

    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS, HEAD, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept, Bearer');

    if (req.method === 'OPTIONS') {
      return res.end();
    }

    next();
  };
};
