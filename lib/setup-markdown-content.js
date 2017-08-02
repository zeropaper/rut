'use strict';
/*jshint node: true*/
const path         = require('path'),
      fs           = require('fs'),
      hljs         = require('highlight.js'),
      markdownIt   = require('markdown-it');

module.exports = function setupMDContent(app, dataPath) {
  var md = markdownIt({
    linkify: true,
    typographer: true,
    quotes: '“”‘’',

    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value;
        }
        catch (err) {}
      }

      return '';
    }
  });

  function renderMd(absPath, res, next) {
    console.info('markdown middleware, absPath', absPath);
    fs.readFile(absPath, {encoding: 'utf8'}, function(err, mdContent) {
      if (err) return next(err);

      var mdContentH1less = mdContent.split('\n');
      var pageTitle = mdContentH1less.shift().split('#').pop().trim();
      mdContentH1less = mdContentH1less.join('\n').trim();

      var rendered = md.render(mdContentH1less);
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
    var absPath = path.join(dataPath, ...parts);

    function finalCheck(err, stats) {
      if (err || !stats) console.info('Could not find markdown for ' + req.originalUrl);
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