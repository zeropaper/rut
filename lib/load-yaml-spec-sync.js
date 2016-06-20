'use strict';
var camelCase = require('lodash.camelcase');
                           // api:load-controllers
var debug = require('debug')('rut:load-yaml-spec  ');
var forEachPathMethods = require('./each-path-methods');
function ensureOperationIds(swaggerDoc) {
  forEachPathMethods(swaggerDoc, function (pn, mn) {
    if (!swaggerDoc.paths[pn][mn].operationId) {
      /*
      var className = swaggerDoc.paths[pn][mn]['x-swagger-router-controller'] || '';
      className = className ? className + '_' : '';
      swaggerDoc.paths[pn][mn].operationId = className + camelCase(pn +' '+ mn);
      */
      swaggerDoc.paths[pn][mn].operationId = camelCase(pn +' '+ mn);
      debug('  new operationId %s', swaggerDoc.paths[pn][mn].operationId);
      debug('    method   %s', mn);
      debug('    path     %s', pn);
    }
  });
  return swaggerDoc;
}

module.exports = function loadYamlSpecSync(filepath) {
  debug('load yaml spec document %s', filepath);
  return ensureOperationIds(require('yaml-js').load(require('fs').readFileSync(filepath, 'utf8')));
};
