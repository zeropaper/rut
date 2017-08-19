'use strict';
/*jshint node: true*/
module.exports = function passGenerator() {
  return require('./random-string')(16, '1234567890qwertzuiopasdfghjklyxcvbnm+"*_:-.%&/()');
};