'use strict';
/*jshint node: true*/
const ensureAuthenticated = require('./ensure-authenticated'),
      loadDocumentList    = require('./load-document-list'),
      ensureAuthorization = require('./ensure-authorization'),
      ensureAdmin         = ensureAuthorization('admin'),
      redirectDestination = require('./redirect-destination'),
      path                = require('path'),
      fs                  = require('fs');

module.exports = function setupModelGenerics(app, db) {
  // if (app.locals.productionMode) return;

  const settings = app.locals.settings;
  const _templateCache = {};
  function templateExists(wanted, fallback, next) {
    if (_templateCache[wanted] && app.locals.productionMode) {
      return next(null, _templateCache[wanted]);
    }

    var fullPath = path.join(settings.views, wanted + '.' + settings['view engine']);
    fs.stat(fullPath, function(err) {
      _templateCache[wanted] = err ? fallback : wanted;
      next(null, _templateCache[wanted]);
    });
  }


  const modelNames = Object.keys(db.models);
  app.get('/models', function(req, res) {
    res.locals.user = req.user;
    res.locals.modelNames = modelNames;
    res.locals.pageTitle = 'Models';
    res.render('index');
  });



  function modelProperties(modelName) {
    var Model = db.model(modelName);
    return Object.keys(Model.schema.paths);
  }


  function _pathIsField(description, name) {
    var excludedInstanceTypes = ['Array', 'ObjectId'];
    var excludedPaths = ['hash', 'salt'];
    return description.path.indexOf('_') !== 0 &&
            excludedInstanceTypes.indexOf(description.instance) < 0 &&
            excludedPaths.indexOf(name) < 0;
  }

  function modelFormFields(modelName/*, doc*/) {
    var Model = db.model(modelName);
    var paths = Model.schema.paths;
    return modelProperties(modelName)
            .filter(name => _pathIsField(paths[name], name))
            .map(function(name) {
              var parts = name.split('.');
              return {
                fullwidth: true,
                // value: doc ? atPath(doc, name) : null,
                name: parts.map(function(part, p) {
                  return !p ? part : '[' + part + ']';
                }).join(''),
                path: name,
                label: Model.labelFor(name)
              };
            });
  }


  modelNames.forEach(function(modelName) {
    const docName = modelName[0].toLowerCase() + modelName.slice(1);
    const modelRoute = modelName.toLowerCase();
    const Model = db.model(modelName);

    function docId(req, res, next, id) {
      Model.findById(id).exec(function(err, doc) {
        if (err) return next(err);
        if(!doc) {
          res.status(404);
          return next(new Error('Not Found'));
        }

        res.locals.params = res.locals.params || [];
        res.locals.params.push({
          docName: docName,
          modelName: modelName,
          modelRoute: modelRoute,
          docId: id
        });

        res.locals[docName + 'Param'] = doc;
        next();
      });
    }
    // don't override a potentially better implementation
    if (!app._router.params[docName + 'Id']) app.param(docName + 'Id', docId);



    var route = '/' + modelRoute;

    function listDocs(req, res) {
      templateExists(docName + '/list', 'generic/list', function(err, template) {
        res.render(template, {
          count: (res.locals[modelName] || []).length,
          docName: docName,
          modelName: modelName,
          modelRoute: modelRoute,
          pageTitle: modelName + ' Description',
          properties: modelProperties(modelName),
          formFields: modelFormFields(modelName),
          schema: Model.schema
        });
      });
    }
    app.get(route, ensureAuthenticated, loadDocumentList(db, modelName), listDocs);


    route +=  '/:'  + docName + 'Id';

    function getDoc(req, res) {
      var doc = res.locals[docName + 'Param'];
      templateExists(docName + '/details', 'generic/details', function(err, template) {
        res.render(template, {
          instance: doc,
          docName: docName,
          modelName: modelName,
          modelRoute: modelRoute,
          pageTitle: modelName + ' "' + doc.id + '" Details',
          properties: modelProperties(modelName),
          formFields: modelFormFields(modelName),
          schema: Model.schema
        });
      });
    }
    app.get(route, ensureAuthenticated, getDoc);


    function updateDoc(req, res, next) {
      console.info('updateDoc', req.body);
      Model.findByIdAndUpdate(res.locals[docName + 'Param'].id, req.body, function(err) {
        if (err) return next(err);
        req.flash('success', modelName + ' has been updated');
        res.redirect('/' + modelRoute + '/' + res.locals[docName + 'Param'].id);
      });
    }
    app.post(route + '/edit', ensureAdmin, updateDoc);
    app.put(route + '/edit', ensureAdmin, updateDoc);


    function deleteDoc(req, res, next) {
      Model.findByIdAndRemove(res.locals[docName + 'Param'].id, function(err) {
        if (err) return next(err);
        req.flash('success', modelName + ' has been deleted');
        redirectDestination(req, res, '/' + modelRoute);
      });
    }
    app.post(route + '/delete', ensureAdmin, deleteDoc);
    app.delete(route + '/delete', ensureAdmin, deleteDoc);
  });
};