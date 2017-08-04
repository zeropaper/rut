/*jshint browser: true*/
/*global mdc: false, hljs: false*/
(function() {
'use strict';
mdc.autoInit();
hljs.initHighlightingOnLoad();

const drawer = new mdc.drawer.MDCTemporaryDrawer(document.querySelector('.mdc-temporary-drawer'));
document.getElementById('mdc-temporary-drawer-toggle').addEventListener('click', () => drawer.open = !drawer.open);

const snackbarElement = document.querySelector('.mdc-snackbar');
const MDCSnackbar = mdc.snackbar.MDCSnackbar;
const snackbar = new MDCSnackbar(snackbarElement);
var messages = JSON.parse(snackbarElement.getAttribute('data-snackbar-messages') || '{}');
var messageTypes = Object.keys(messages);

messageTypes.forEach(function(type, t) {
  messages[type].forEach(function(message, m) {
    var info = {
      message: message
    };
    // don't ask...
    if (!t && !m) {
      snackbar.show(info);
    }
    else {
      snackbar.foundation_.queue_.push(info);
    }
  });
});
var socket = io.connect(location.protocol + '//' + location.host);
socket.on('news', function (data) {
  console.log(data);
  socket.emit('my other event', { my: 'data' });
});
// let dialog = mdc.dialog.MDCDialog(document.querySelector('#dialog'));
// dialog.listen('MDCDialog:accept', function() {
//   console.log('accepted');
// });
// dialog.listen('MDCDialog:cancel', function() {
//   console.log('canceled');
// });
// document.querySelector('#default-dialog-activation').addEventListener('click', function (evt) {
//   dialog.lastFocusedTarget = evt.target;
//   dialog.show();
// });


// var dialogScrollable = new mdc.dialog.MDCDialog(document.querySelector('#listdialog'));
// document.querySelector('#dialog-with-list-activation').addEventListener('click', function (evt) {
//   dialogScrollable.lastFocusedTarget = evt.target;
//   dialogScrollable.show();
// });

})(this);