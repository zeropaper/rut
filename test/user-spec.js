'use strict';
var expect = require('expect.js');
var utils = require('./utils');

describe('User model', function () {
  var setup = {}, User, debug;

  before(function (done) {
    this.timeout(2000);
    utils.cleanRut(utils.options({
      serviceYamlPattern: 'simple/*.yaml',
      apiDir: './test/test-services/',
      userSchemaDef: {
        someProperty: String
      }
    }), function (err, result) {
      setup = result;
      User = setup.db.model('User');
      debug = setup.testUtils.debug;
      done(err);
    });
  });

  it('is registered by the core', function () {
    expect(User).not.to.be(undefined);
  });

  it('can have custom properties', function () {
    expect(User.schema.paths.someProperty).not.to.be(undefined);
  });

  describe('rutUser', function () {
    var verifUser;
    before(function (done) {
      User.findByUsername(setup.rutUsername, function (err, user) {
        if (err) { return done(err); }
        verifUser = user;
        done();
      });
    });


    it('is created or update at boot', function () {
      expect(setup.rutUser).not.to.be(null);
      expect(setup.rutUser).not.to.be(undefined);
      expect(setup.rutUser.username).to.be(setup.rutUsername);
    });

    it('always sets the _id of rut user to "000000000000000000000000"', function () {
      expect(setup.rutUser._id.toString()).to.be('000000000000000000000000');
      expect(verifUser._id.toString()).to.be('000000000000000000000000');
    });
  });

  describe('username', function () {
    var rutUser;

    before(function (done) {
      User.findByUsername(setup.rutUsername, function (err, user) {
        rutUser = user;
        done(err);
      });
    });

    it('will pass an error at registration if already used', function (done) {
      User.register({
        username: setup.rutUsername
      }, 'passwordpassword', function (err) {
        expect(err).not.to.be(null);
        expect(err).not.to.be(undefined);
        done();
      });
    });

    it('will pass an error at creation if already used', function (done) {
      User.create({
        username: setup.rutUsername
      }, function (err) {
        expect(err).not.to.be(null);
        expect(err).not.to.be(undefined);
        done();
      });
    });

    it('can be changed', function (done) {
      rutUser.username = 'newrut';
      rutUser.save(function (err) {
        if (err) { return done(err); }

        rutUser.save(function (err) {
          done(err);
        });
      });
    });

    it('can be changed only if the name is not already used', function (done) {
      this.timeout(2000);

      User.register({
        username: 'samename'
      }, 'passwordpassword', function (err) {
        if (err) { return done(err); }

        rutUser.username = 'samename';
        rutUser.save(function (err) {
          expect(err).not.to.be(null);
          expect(err).not.to.be(undefined);
          done();
        });
      });
    });
  });
});
