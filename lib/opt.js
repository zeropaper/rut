'use strict';
module.exports = function (options) {
  return function (wanted, def) {
    return typeof options.wanted !== 'undefined' ? options.wanted : def;
  };
};