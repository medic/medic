(function () {

  'use strict';

  angular.module('inboxServices', ['ngResource']);

  require('./analytics-modules');
  require('./app-info');
  require('./auth');
  require('./base');
  require('./cache');
  require('./changes');
  require('./conflict-resolution');
  require('./contact-form');
  require('./contact-schema');
  require('./count-messages');
  require('./db');
  require('./db-sync');
  require('./db-view');
  require('./debug');
  require('./delete-doc');
  require('./download-url');
  require('./edit-group');
  require('./enketo');
  require('./enketo-prepopulation-data');
  require('./enketo-translation');
  require('./facility');
  require('./facility-hierarchy');
  require('./file-reader');
  require('./form');
  require('./format-data-record');
  require('./format-date');
  require('./generate-search-query');
  require('./generate-search-requests');
  require('./http-wrapper');
  require('./import-contacts');
  require('./kanso-packages');
  require('./language');
  require('./markdown');
  require('./mark-read');
  require('./message-contacts');
  require('./message-state');
  require('./moment-locale-data');
  require('./outgoing-messages-configuration');
  require('./properties');
  require('./read-messages');
  require('./search');
  require('./send-message');
  require('./session');
  require('./settings');
  require('./snackbar');
  require('./task-generator');
  require('./translate-from');
  require('./update-contact');
  require('./update-facility');
  require('./update-settings');
  require('./user');
  require('./verified');
  require('./xslt');

}());
