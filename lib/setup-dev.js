'use strict';
/*jshint node: true*/
module.exports = function setupDev(app/*, db*/) {
  if (app.locals.productionMode) return;



  app.get('/kitchen-sink', function(req, res) {
    var msgs = res.locals.messages = res.locals.messages || {};
    msgs.error = msgs.error || [];
    msgs.error.push('1. Error message... for the example');

    msgs.info = msgs.info || [];
    msgs.info.push('2. Info message');
    msgs.info.push('3. Other info message');

    msgs.success = msgs.success || [];
    msgs.success.push('4. Success message');

    res.render('dev/kitchen-sink', {
      pageTitle: 'Kitchen Sink',
      fields: [
        {
          type: 'fieldset',
          label: 'Group 1',
          fields: [
            {
              type: 'text',
              label: 'Text',
              helpText: false,
              required: true
            },
            {
              type: 'text',
              label: 'Disabled',
              helpText: false,
              disabled: true
            },
            {
              type: 'text',
              label: 'Read Only',
              helpText: false,
              readonly: true,
              value: 'just for your eyes'
            },
            {
              type: 'textarea',
              label: 'Long Text',
              helpText: 'Start writing a roman if you want',
              required: false
            },
            {
              type: 'email',
              label: 'Email',
              helpText: false,
              required: true
            },
            {
              type: 'number',
              label: 'Number',
              helpText: false,
              required: true
            },
            {
              type: 'search',
              label: 'Search',
              helpText: false,
              required: true
            },
            {
              type: 'date',
              label: 'Date',
              helpText: false,
              required: true
            },
            {
              type: 'checkbox',
              label: 'Checkbox',
              helpText: 'Just to be clear'
            },
            {
              type: 'radio',
              label: 'Choice 1',
              value: '1',
              name: 'radios'
            },
            {
              type: 'radio',
              label: 'Choice 2',
              value: '2',
              name: 'radios'
            }
          ]
        },

        {
          type: 'fieldset',
          label: 'Full Width',
          fields: [
            {
              fullwidth: true,
              type: 'text',
              label: 'Text',
              helpText: false,
              required: true
            },
            {
              fullwidth: true,
              type: 'text',
              label: 'Disabled',
              helpText: false,
              disabled: true
            },
            {
              fullwidth: true,
              type: 'text',
              label: 'Read Only',
              helpText: false,
              readonly: true,
              value: 'just for your eyes'
            },
            {
              fullwidth: true,
              type: 'textarea',
              label: 'Long Text',
              helpText: 'Start writing a roman if you want',
              required: false
            },
            {
              fullwidth: true,
              type: 'email',
              label: 'Email',
              helpText: false,
              required: true
            },
            {
              fullwidth: true,
              type: 'number',
              label: 'Number',
              helpText: false,
              required: true
            },
            {
              fullwidth: true,
              type: 'search',
              label: 'Search',
              helpText: false,
              required: true
            },
            {
              fullwidth: true,
              type: 'date',
              label: 'Date',
              helpText: false,
              required: true
            },
            {
              fullwidth: true,
              type: 'checkbox',
              label: 'Checkbox',
              helpText: 'Just to be clear'
            },
            {
              fullwidth: true,
              type: 'radio',
              label: 'Choice 1',
              value: '1',
              name: 'radios'
            },
            {
              fullwidth: true,
              type: 'radio',
              label: 'Choice 2',
              value: '2',
              name: 'radios'
            }
          ]
        }
      ]
    });
  });

  app.get('/form-test', function(req, res) {
    res.render('dev/form-test', {
      pageTitle: 'Form Test',
      fields: [
        {
          name:'multi[]',
          label: 'Multi 1',
          value: 'a'
        },
        {
          name:'multi[]',
          label: 'Multi 2',
          value: 'b'
        },

        {
          type: 'fieldset',
          label: 'Group 1',
          helpText: 'A group of things',
          fields: [
            {
              name:'nested[0][]',
              label: 'Nested 1 1',
              value: 'aa'
            },
            {
              name:'nested[0][]',
              label: 'Nested 1 2',
              value: 'ab'
            },
            {
              name:'nested[1][]',
              label: 'Nested 1 1',
              value: 'ba'
            },
            {
              name:'nested[1][]',
              label: 'Nested 1 2',
              value: 'bb'
            }
          ]
        },

        {
          name:'obj[0][prop][]',
          label: 'Object 1 1',
          value: 'xx'
        },
        {
          name:'obj[0][prop][]',
          label: 'Object 1 2',
          value: 'xy'
        },
        {
          name:'obj[1][prop][]',
          label: 'Object 1 1',
          value: 'yx'
        },
        {
          name:'obj[1][prop][]',
          label: 'Object 1 2',
          value: 'yy'
        }
      ]
    });
  });

  app.post('/form-test', function(req, res) {
    console.info('req.body', JSON.stringify(req.body, null, 2));
    res.redirect('/form-test');
  });
};