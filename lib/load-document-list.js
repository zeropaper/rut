'use strict';
/*jshint node: true*/
module.exports = function loadDocumentList(db, modelName) {
  return function(req, res, next) {
    var query = db.model(modelName).find();
    if (req.query.sort) {
      query.sort(req.query.sort);
    }

    query.exec(function(err, documents) {
      if (err) return next(err);
      res.locals.modelName = modelName;
      res.locals.documents = documents;
      next();
    });
  };
};