'use strict';
/*jshint node:true*/

var menu = module.exports = {
  'getting-started': {
    title: 'Guetting Started'
  },
  'extending': {
    title: 'Extending',
    children: {
      'db': {
        title: 'Database Model'
      },
      'routing': {
        title: 'Routing'
      },
      'views': {
        title: 'Views and Rendering'
      }
    }
  }
};
