'use strict';
var debug = require('debug')('rut:error-handler   ');

module.exports = function makeErrorHandler(options) {
  return function errorHandler(err, req, res, next) {
    // if (options.env === 'production') {
    //   console.info('%s request error "%s"\n%s\n%s', new Date(), req.originalUrl, req.get('user-agent'), err.stack);
    // }

    if (res.headersSent) {
      debug('  headers already sent');
      return next();
    }

    res.status((res.statusCode > 399 ? res.statusCode : false) || err.code || 500);
    debug('request (%s) %s %s error %s\n%s', req.accepts(['html', 'json']), req.method, req.url, res.statusCode, err.stack);
    if (req.accepts('html') === 'html') {
      res.type('text/html');
      return res.send('<!DOCTYPE html><html><head><title>' +
        res.statusCode +
        ' ' +
        err.message +
        '</title></head><body><h1>' +
        res.statusCode +
        ' ' +
        err.message +
        '</h1>' +
        (options.env === 'development' ? ('<pre>' + err.stack + '</pre>') : '') +
        '</body></html>');
    }

    res.type('application/json');
    res.send({
      code: res.statusCode,
      message: err.message,
      error: options.env === 'development' ? err : {}
    });
  };
};