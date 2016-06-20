'use strict';
var expect = require('expect.js');
var addAndPassSetup = require('./../lib/add-and-pass-setup');
var waterfall = require('async').waterfall;

var fatalError = new Error('Fatal');

describe('addAndPassSetup', function() {
  describe('error', function () {
    var setup = {};

    it('does not add the property to the setup', function (done) {
      addAndPassSetup('property', setup, function () {
        expect(setup).not.to.have.key('property');
        // expect(err).not.to.be.defined();
        done();
      })(fatalError, 'result');
    });
  });

  describe('success', function () {
    var setup = {};

    it('add the property to the setup', function (done) {
      addAndPassSetup('property', setup, function () {
        expect(setup.property).to.be('result');
        done();
      })(null, 'result');
    });
  });

  describe('used with async.waterfall', function () {
    describe('error', function () {
      var setup = {};

      it('does not add the property to the setup', function (done) {
        waterfall([
          function (cb) {
            cb(null, setup);
          },

          function (setupObj, cb) {
            addAndPassSetup('ok', setupObj, cb)(null, 'result');
          },

          function (setupObj, cb) {
            addAndPassSetup('notOk', setupObj, cb)(fatalError, 'result');
          },
        ], function (err) {
          expect(err).to.be.an('object');
          expect(setup.ok).to.be('result');
          expect(setup.notOk).to.be(undefined);
          done();
        });
      });
    });

    describe('success', function () {
      var setup = {};

      it('adds the properties to the setup', function (done) {
        waterfall([
          function (cb) {
            cb(null, setup);
          },

          function (setupObj, cb) {
            addAndPassSetup('ok', setupObj, cb)(null, 'result');
          },

          function (setupObj, cb) {
            addAndPassSetup('alsoOk', setupObj, cb)(null, 'result');
          },
        ], function (err) {
          expect(err).to.be(null);
          expect(setup.ok).to.be('result');
          expect(setup.alsoOk).to.be('result');
          done();
        });
      });
    });
  });
});