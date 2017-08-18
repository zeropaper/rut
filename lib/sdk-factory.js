'use strict';

var _collections = {};
var _models = {};

function factoryState(model, name) {
  var State = require('ampersand-state');
  var Collection = require('ampersand-collection');
  var props = {};
  var modelCollections = {};

  Object.keys(model.properties || {}).forEach(function (key) {
    var prop = model.properties[key];
    var ampProp = {type: 'any'};
    props[key] = ampProp;
    // http://swagger.io/specification/ > Data Types
    // to
    // string, number, boolean, array, object, date, or any



    if (prop.type === 'number' || prop.type === 'integer') {
      ampProp.type = 'number';
      if (typeof prop.default !== 'undefined') {
        ampProp.default = prop.default;
      }
    }
    else if (prop.type === 'boolean') {
      ampProp.type = 'boolean';
      if (typeof prop.default !== 'undefined') {
        ampProp.default = prop.default;
      }
    }
    else if (prop.type === 'array') {
      ampProp.type = 'array';
      if (typeof prop.default !== 'undefined') {
        ampProp.default = prop.default;
      }

      if (prop.items && prop.items.$ref) {
        ampProp = false;

        var collectionModelName = prop.items.$ref.split('/').pop();

        modelCollections[key] = _collections[collectionModelName] || Collection.extend({
          model: _models[collectionModelName] || Collection.extend({})
        });
        console.info('array', key, collectionModelName, modelCollections[key]);
      }
    }
    else if (prop.type === 'string') {
      if (prop.format === 'date' || prop.format === 'date-time') {
        ampProp.type = 'date';
      }
      else {
        ampProp.type = 'string';
      }

      if (typeof prop.default !== 'undefined') {
        ampProp.default = prop.default;
      }
    }
    else {
      console.info('unsolved type', prop.type);
    }

    if (ampProp) {
      props[key] = ampProp;
    }
  });

  var ModelState = _models[name] = _models[name] || State.extend({
    props: props,
    collections: modelCollections
  });
  return ModelState;
}

function factoryCollection(model, name) {
  var Collection = require('ampersand-collection');
  var ModelCollection = _collections[name] = _collections[name] || Collection.extend({
    model: factoryState(model, name)
  });
  return ModelCollection;
}

function factory(client, options) {
  options = options || {};
  if (options.clear) {
    _collections = {};
    _models = {};
  }

  Object.keys(client.definitions).forEach(function (name) {
    var model = client.definitions[name];
    factoryCollection(model, name);
  });
}

factory.state = factoryState;
factory.collection = factoryCollection;

module.exports = factory;