'use strict';
/*jshint node: true*/
module.exports = function randomString(count = 6, chars = 'abcdefghijklmnopqrstuvwxyz') {
  chars = chars.split('');
  var str = '';
  for (var i = 0; i < count; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
};