'use strict';
var expect = require('expect.js');
var utils = require('./utils');


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
    var request;

    before(function (done) {
      utils.cleanRut(utils.options(validTestYaml), function (err, result) {
        request = result.testUtils.request;
        done(err);
      });
    });

    it('serves a landing page', function (done) {
      request()
        .get('/')
        .set('Accept', 'text/html')
        .expect('Content-Type', /html/)
        .expect(200, done);
    });
  });

  describe('production environment', function () {
    var request;

    before(function (done) {
      utils.cleanRut(utils.options({
        serviceYamlPattern: '{simple,implicit}/*.yaml',
        apiDir: './test/test-services/',
        env: 'production',
        rutPassword: 'atleasttwelvecharachterslong'
      }), function (err, result) {
        request = result.testUtils.request;
        done(err);
      });
    });

    it('redirects index to /account', function (done) {
      request()
        .get('/')
        .set('Accept', 'text/html')
        .set('Location', '/account')
        .expect(302, done);
    });
  });
});
