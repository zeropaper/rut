'use strict';
/*jshint node: true*/
const path              = require('path'),
      debug             = require('debug')('rut:md'),
      fs                = require('fs'),
      markdownRenderer  = require('./markdown-renderer');

module.exports = function setupMDContent(app, contentPath) {
  function renderMd(absPath, res, next) {
    fs.readFile(absPath, {encoding: 'utf8'}, function(err, mdContent) {
      if (err) return next(err);

      var mdContentH1less = mdContent.split('\n');
      var pageTitle = mdContentH1less.shift().split('#').pop().trim();
      mdContentH1less = mdContentH1less.join('\n').trim();

      var rendered = markdownRenderer.render(mdContentH1less);
      res.render('md', {
        pageTitle: pageTitle,
        body: rendered
      });
    });
  }

  app.get('*', function(req, res, next) {
    if (req.isAuthenticated()) {
      res.locals.user = req.user;
    }


    var parts = req.originalUrl.split('/');
    var absPath = path.join(contentPath, ...parts);


    function finalCheck(err, stats) {
      if (err || !stats) debug('Could not find markdown for ' + req.originalUrl);
      if (stats && stats.isFile()) return renderMd(absPath, res, next);
      next();
    }

    fs.stat(absPath, function(err, stats) {
      if (stats && stats.isDirectory()) {
        absPath = path.join(absPath, 'index.md');

        return fs.stat(absPath, finalCheck);
      }

      absPath += '.md';

      return fs.stat(absPath, finalCheck);
    });
  });
};