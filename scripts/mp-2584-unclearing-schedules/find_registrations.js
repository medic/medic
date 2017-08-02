/*jshint esversion: 6 */
'use strict';

const PouchDB = require('pouchdb');
const dbUrl = process.env.COUCH_URL;
const db = new PouchDB(dbUrl);

const pCode = 'द';

const findRegistrations = () => {
  return db.query(
    'medic-client/reports_by_form',
    {
      startkey: [ pCode ],
      endkey: [ pCode + '\ufff0'],
      include_docs: true,
      limit: 5000
    }).then(data => {
      return data.rows.map(row => row.id);
    });
};

findRegistrations()
  .then(registrations => {
    console.log(JSON.stringify(registrations, null, 2));
    console.log('found', registrations.length, 'registrations');
  })
  .catch(console.log);
