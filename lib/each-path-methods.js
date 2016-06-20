'use strict';

module.exports = function eachPathMethods(swaggerDoc, iterator) {
  var paths = swaggerDoc.paths;
  var pns = Object.keys(paths);
  pns.forEach(function (pn) {
    var mns = Object.keys(paths[pn]);
    mns.forEach(function (mn) {
      iterator(pn, mn);
    });
  });
};
