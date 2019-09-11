const _ = require('underscore'),
  chai = require('chai'),
  path = require('path'),
  sinon = require('sinon'),
  config = require('../../src/config'),
  db = require('../../src/db'),
  logger = require('../../src/logger'),
  environment = require('../../src/environment'),
  ddocExtraction = require('../../src/ddoc-extraction'),
  defaults = require('./../../../build/ddocs/medic/_attachments/default-docs/settings.doc.json'),
  resourceExtraction = require('../../src/resource-extraction'),
  settingsService = require('../../src/services/settings'),
  translations = require('../../src/translations'),
  viewMapUtils = require('@medic/view-map-utils');

let on;

describe('Config', () => {
  beforeEach(() => {
    on = sinon.stub();
    on.returns({ on: on });

    sinon.stub(db.medic, 'get');
    sinon.stub(db.medic, 'query');
    sinon.stub(db.medic, 'changes').returns({ on: on });
    sinon.stub(viewMapUtils, 'loadViewMaps');
    sinon.stub(ddocExtraction, 'run').resolves();
    sinon.stub(resourceExtraction, 'run').resolves();
    sinon.stub(translations, 'run').resolves();
    sinon.stub(settingsService, 'get').resolves();
    sinon.stub(settingsService, 'update').resolves();
    sinon.stub(environment, 'getExtractedResourcesPath').returns(path.resolve(__dirname, './../../../build/ddocs/medic/_attachments'));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('load', () => {
    it('calls back with error when db errors', () => {
      db.medic.query.resolves({ rows: [] });
      settingsService.get.returns(Promise.reject('someError'));
      return config.load().catch(err => {
        chai.expect(err).to.equal('someError');
        chai.expect(settingsService.update.callCount).to.equal(0);
      });
    });

    it('loads app settings combining with default config, loads views into ViewMaps, loads translations', () => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get
        .withArgs('_design/medic')
        .callsArgWith(1, null, { _id: '_design/medic' });
      db.medic.query.resolves({ rows: [] });

      return config.load().then(() => {
        chai.expect(settingsService.get.callCount).to.equal(1);
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai
          .expect(settingsService.update.args[0][0])
          .to.deep.equal(_.extend({ foo: 'bar' }, { permissions: defaults.permissions }));

        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
        chai.expect(viewMapUtils.loadViewMaps.callCount).to.equal(1);
        chai
          .expect(viewMapUtils.loadViewMaps.args[0])
          .to.deep.equal([
          { _id: '_design/medic' },
          'docs_by_replication_key',
          'contacts_by_depth',
        ]);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai
          .expect(
            db.medic.query.withArgs('medic-client/doc_by_type', {
              key: ['translations', true],
              include_docs: true,
            }).callCount
          )
          .to.equal(1);
      });
    });

    it('does not update ddoc if no changes are detected', () => {
      const ddoc = {
        _id: '_design/medic',
        app_settings: defaults,
      };

      settingsService.get.resolves(defaults);
      db.medic.query.resolves({ rows: [] });
      db.medic.get.withArgs('_design/medic').callsArgWith(1, null, ddoc);

      return config.load().then(() => {
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
        chai.expect(settingsService.update.callCount).to.equal(0);
      });
    });

    it('should not crash if getting translation docs is unsuccessful', () => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').callsArgWith(1, null, { _id: '_design/medic' });
      db.medic.query.rejects('errors nooo');

      return config.load().then(() => {
        chai.expect(settingsService.get.callCount).to.equal(1);
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(viewMapUtils.loadViewMaps.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);
      });
    });

    it('should crash if translations are malformed', () => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').callsArgWith(1, null, { _id: '_design/medic' });
      db.medic.query.resolves({
        rows: [
          { doc: { generic: 'something', code: 'en' }},
          { doc: { custom: 'or other', code: 'fr', values: 'true' }},
          { doc: { code: 'hi' }}
        ]
      });

      return config
        .load()
        .then(() => chai.expect(true).to.equal('should have crashed'))
        .catch((err) => {
          chai.expect(err).to.be.an.instanceof(TypeError);
      });
    });
  });

  describe('listen', () => {
    it('initializes the Continuous changes feed', () => {
      config.listen();
      chai.expect(db.medic.changes.callCount).to.equal(1);
      chai
        .expect(db.medic.changes.args[0])
        .to.deep.equal([{ live: true, since: 'now', return_docs: false }]);
    });

    it('does nothing for irrelevant change', () => {
      config.listen();
      const change = { id: 'someDoc' };
      on.callCount.should.equal(2);
      const changeCallback = on.args[0][1];

      logger.info(changeCallback);
      changeCallback(change);
      chai.expect(db.medic.query.callCount).to.equal(0);
      chai.expect(db.medic.get.callCount).to.equal(0);
    });

    it('reloads settings, runs translations and ddoc extraction when _design/medic is updated', () => {
      config.listen();
      const change = { id: '_design/medic' };
      const changeCallback = on.args[0][1];
      changeCallback(change);
      chai.expect(translations.run.callCount).to.equal(1);
      chai.expect(ddocExtraction.run.callCount).to.equal(1);
      chai.expect(resourceExtraction.run.callCount).to.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
    });

    it('reloads translations when translations are updated', () => {
      config.listen();
      db.medic.query.resolves({ rows: [] });
      const change = { id: 'messages-test' };
      const changeCallback = on.args[0][1];
      changeCallback(change);
      chai.expect(translations.run.callCount).to.equal(0);
      chai.expect(ddocExtraction.run.callCount).to.equal(0);
      chai.expect(resourceExtraction.run.callCount).to.equal(0);
      chai.expect(db.medic.get.callCount).to.equal(0);

      chai.expect(db.medic.query.callCount).to.equal(1);
      chai
        .expect(
          db.medic.query.withArgs('medic-client/doc_by_type', {
            key: ['translations', true],
            include_docs: true,
          }).callCount
        )
        .to.equal(1);
    });
  });
});
