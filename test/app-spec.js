'use strict';
var expect = require('expect.js');
// var mongoose = require('mongoose');
var request = require('supertest');
var utils = require('./utils');
var request = require('supertest');


describe('rut server', function () {
  var validTestYaml = {
    serviceYamlPattern: '{simple,implicit}/*.yaml',
    apiDir: './test/test-services/'
  };
  this.timeout(10000);
  this.slow(4000);

  describe('basic initialization', function () {
    var setup;

    it('initializes', function (done) {
      utils.cleanRut(utils.options(validTestYaml), done);
    });

    it('can be reset', function (done) {
      utils.cleanRut(utils.options(validTestYaml), function (err, result) {
        setup = result;
        done(err);
      });
    });

    xit('can be reset (again)', function (done) {
      utils.cleanRut(utils.options(validTestYaml), function (err, result) {
        setup = result;
        done(err);
      });
    });

    describe('the setup result', function () {
      it('has an express application `app`', function () {
        expect(setup.app).to.be.a('function');
        expect(setup.app.route).to.be.a('function');
        expect(setup.app.use).to.be.a('function');
        expect(setup.app.get).to.be.a('function');
        expect(setup.app.post).to.be.a('function');
        expect(setup.app.put).to.be.a('function');
        expect(setup.app.del).to.be.a('function');
      });

      it('has a mongoose connection `db`', function () {
        expect(setup.db).to.be.an('object');
        expect(setup.db.model).to.be.a('function');
      });

      it('has a session middleware `sessionMiddleware`', function () {
        expect(setup.sessionMiddleware).to.be.a('function');
      });
    });
  });



  describe('development environment', function () {
    var app;

    before(function (done) {
      utils.cleanRut(utils.options(validTestYaml), function (err, result) {
        app = result.app;
        done(err);
      });
    });

    it('serves a landing page', function (done) {
      request(app)
        .get('/')
        .set('Accept', 'text/html')
        .expect('Content-Type', /html/)
        .expect(200, done);
    });
  });

  describe.skip('production environment', function () {
    var app;

    before(function (done) {
      utils.cleanRut(utils.options({
        serviceYamlPattern: '{simple,implicit}/*.yaml',
        apiDir: './test/test-services/',
        env: 'production'
      }), function (err, result) {
        app = result.app;
        done(err);
      });
    });

    it('does not serve a landing page', function (done) {
      request(app)
        .get('/')
        .set('Accept', 'text/html')
        .expect(404, done);
    });
  });
});
