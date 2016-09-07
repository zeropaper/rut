'use strict';
// var expect = require('expect.js');
// var utils = require('./utils');
// var serviceLib = require('./../lib/service');


describe('rut service', function () {
  this.timeout(3000);

  // describe('discover(setup)', function () {
  //   var setup;

  //   it('discovers YALM files', function (done) {
  //     setup = utils.options({
  //       serviceYamlPattern: './../admin/1.yaml'
  //     });

  //     serviceLib.discover(setup, done);
  //   });


  //   it('adds a swaggerFiles property to the setup object', function () {
  //     expect(setup.swaggerFiles).to.be.an('array');
  //     expect(setup.swaggerFiles.length).to.be(2);
  //   });

  //   describe('with invalid YAML', function () {
  //     it('pass the validation error', function (done) {
  //       var invalid;

  //       invalid = utils.options({
  //         serviceYamlPattern: 'invalid-yaml/*.yaml',
  //         apiDir: './test/test-services/'
  //       });

  //       serviceLib.discover(invalid, function (err) {
  //         expect(err).not.to.be(undefined);
  //         done();
  //       });
  //     });
  //   });
  // });

  // describe('Models(setup)', function () {
  //   var setup;

  //   before(function (done) {
  //     setup = utils.options({
  //       serviceYamlPattern: 'simple/*.yaml',
  //       apiDir: './test/test-services/'
  //     });

  //     serviceLib.discover(setup, function (err) {
  //       if (err) { return done(err); }
  //       serviceLib.Models(setup, done);
  //     });
  //   });


  //   it('adds a serviceModels property to the setup object', function () {
  //     expect(setup.serviceModels).to.be.an('object');
  //   });
  // });


  // describe('Statics(setup)', function () {
  //   var setup;

  //   before(function (done) {
  //     setup = utils.options({
  //       serviceYamlPattern: 'simple/*.yaml',
  //       apiDir: './test/test-services/'
  //     });

  //     serviceLib.discover(setup, function (err) {
  //       if (err) { return done(err); }
  //       serviceLib.Statics(setup, done);
  //     });
  //   });


  //   it('adds a some paths to the setup.serveStatic object', function () {
  //     expect(setup.serviceStatics).to.be(undefined);
  //     expect(setup.serveStatic).to.be.an('object');
  //     expect(Object.keys(setup.serveStatic).length).to.be(2);
  //   });
  // });


  // describe('in all environements', function () {
  //   var setup, request;

  //   before(function (done) {
  //     utils.cleanRut(utils.options({
  //       env: 'development',
  //       serviceYamlPattern: 'simple/*.yaml',
  //       apiDir: './test/test-services/'
  //     }), function (err, result) {
  //       setup = result;
  //       request = setup.testUtils.request;
  //       done(err);
  //     });
  //   });

  //   it('serves the definition as YAML', function (done) {
  //     request()
  //       .get('/simple/v1.yaml')
  //       .expect(200)
  //       .expect('Content-Type', /yaml/, done);
  //   });

  //   it('serves the definition as JSON', function (done) {
  //     request()
  //       .get('/simple/v1.json')
  //       .expect(200)
  //       .expect('Content-Type', /json/, done);
  //   });
  // });


  // describe('development environement', function () {
  //   var setup, request;

  //   before(function (done) {
  //     utils.cleanRut(utils.options({
  //       env: 'development',
  //       serviceYamlPattern: 'simple/*.yaml',
  //       apiDir: './test/test-services/'
  //     }), function (err, result) {
  //       setup = result;
  //       request = setup.testUtils.request;
  //       done(err);
  //     });
  //   });


  //   describe('Documentation', function () {
  //     it('is served prefixed by /docs', function (done) {
  //       request()
  //         .get('/docs/simple/v1/')
  //         .set('Accept', 'text/html')
  //         .expect('Content-Type', /html/)
  //         .expect(200, done);
  //     });
  //   });


  //   describe('Editors', function () {
  //     it('is served prefixed by /editor', function (done) {
  //       request()
  //         .get('/editor/simple/v1/')
  //         .set('Accept', 'text/html')
  //         .expect('Content-Type', /html/)
  //         .expect(200, done);
  //     });
  //   });
  // });
});
