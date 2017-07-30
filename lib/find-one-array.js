'use strict';
/*jshint node:true*/
module.exports = function findOneArray(wanted, given) {
  wanted = typeof wanted === 'string' ? wanted.split(' ') : wanted;
  for (var r = 0; r < wanted.length; r++) {
    if((given || []).indexOf(wanted[r]) > -1) return true;
  }
};