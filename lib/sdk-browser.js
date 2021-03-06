'use strict';
var SDK = module.exports = {};
SDK.State = require('ampersand-state');
SDK.Collection = require('ampersand-collection');
SDK.BigCollection = require('big-collection');
SDK.factory = require('./sdk-factory');
var SwaggerClient = require('swagger-client');
SDK.Client = SwaggerClient;
SDK.client = function(url, options) {
  if (options.accessToken) {
    options.authorizations = {
      implicitOauth2: new SwaggerClient.ApiKeyAuthorization('Authorization', 'Bearer ' + options.accessToken, 'header')
    };
    delete options.accessToken;
  }
  return new SwaggerClient(url, options);
};