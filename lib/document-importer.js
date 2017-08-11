'use strict';
const async = require('async');
module.exports = function importDB(Model, where, data, done) {
  async.each(data, function(info, next) {
    var query = {};
    query[where] = info[where];
    Model.findOne(query, info, function(err, doc) {
      if (err || doc) return next(err, doc);
      Model.create(info, next);
    });
  }, done);
};