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


  app.get('*', function(req, res, next) {
    if (req.isAuthenticated()) {
      res.locals.user = req.user;
    }

    var parts = req.originalUrl.split('/');
    var absPath = path.join(dataPath, ...parts);
    fs.stat(absPath, function(err, stats) {
      if (err) return next();

      if (stats.isDirectory()) {
        absPath = path.join(absPath, 'index.md');
        stats = fs.statSync(absPath);
      }

      if (!stats.isFile()) {
        return next();
      }

      var mdContent = fs.readFileSync(absPath, {encoding: 'utf8'}).trim();
      // var mdToc = toc(mdContent);

      var mdContentH1less = mdContent.split('\n');
      var pageTitle = mdContentH1less.shift().split('#').pop().trim();
      mdContentH1less = mdContentH1less.join('\n').trim();

      var rendered = md.render(mdContentH1less);
      res.render('md', {
        // pageTitle: (mdToc.json[0] || {}).content || '',
        // highest: mdToc.highest,
        // toc: md.render(mdToc.content),
        pageTitle: pageTitle,
        body: rendered
      });
    });
  });
};