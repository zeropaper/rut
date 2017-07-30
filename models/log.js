'use strict';
/*jshint node: true*/
module.exports = function(db, Schema) {
  var logSchema = new Schema({
    level: String,
    code: Number,
    message: String,
    info: Schema.Types.Mixed,
    user: {type: Schema.Types.ObjectId, ref: 'User'}
  }, {
    timestamps: {}
  });

  logSchema.static('labelFor', function(name) {
    return name;
  });

  logSchema.static('logError', function(err, req, done) {
    err = typeof err === 'string' ? new Error(err) : err;
    req = req || {};
    done = done || function(){};

    db.model('Log').create({
      level: 'error',
      message: err.message,
      info: err,
      code: err.code || req.res.statusCode,
      user: req.user
    }, done);
  });

  db.model('Log', logSchema);
};