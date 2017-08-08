'use strict';
/*jshint node: true*/
const hljs         = require('highlight.js'),
      markdownIt   = require('markdown-it');
module.exports = markdownIt({
  linkify: true,
  typographer: false,
  // quotes: '“”‘’',

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