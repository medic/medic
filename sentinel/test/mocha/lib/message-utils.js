const sinon = require('sinon').sandbox.create(),
      moment = require('moment'),
      expect = require('chai').expect,
      uuid = require('uuid'),
      utils = require('../../../lib/message-utils');

const MAX_GSM_LENGTH = 160;
const MAX_UNICODE_LENGTH = 70;

var generateMessage = function(length, unicode) {
  var result = [];
  for (var i = 0; i < length; i++) {
    result[i] = unicode ? '☃' : 'o';
  }
  return result.join('');
};

describe('messageUtils', () => {

  beforeEach(done => {
    sinon.restore();
    done();
  });

  describe('generate', () => {

    it('adds uuid', done => {
      sinon.stub(uuid, 'v4').returns('some-uuid');
      const config = {};
      const translate = null;
      const doc = {};
      const content = { message: 'xxx' };
      const recipient = '+1234';
      const messages = utils.generate(config, translate, doc, content, recipient);
      expect(messages.length).to.equal(1);
      const message = messages[0];
      expect(message.message).to.equal('xxx');
      expect(message.to).to.equal('+1234');
      expect(message.uuid).to.equal('some-uuid');
      done();
    });

    describe('truncation', () => {

      it('does not truncate short sms', done => {
        const sms = generateMessage(MAX_GSM_LENGTH);
        const config = { multipart_sms_limit: 10 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(sms);
        expect(messages[0].original_message).to.equal(undefined);
        done();
      });

      it('does not truncate short unicode sms', done => {
        const sms = generateMessage(MAX_UNICODE_LENGTH, true);
        const config = { multipart_sms_limit: 10 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(sms);
        expect(messages[0].original_message).to.equal(undefined);
        done();
      });

      it('truncates long sms', done => {
        const sms = generateMessage(1000);
        const expected = sms.substr(0, 150) + '...';
        const config = { multipart_sms_limit: 1 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(expected);
        expect(messages[0].original_message).to.equal(sms);
        done();
      });

      it('truncates long unicode sms', done => {
        const sms = generateMessage(1000, true);
        const expected = sms.substr(0, 64) + '...';
        const config = { multipart_sms_limit: 1 };
        const translate = null;
        const doc = {};
        const content = { message: sms };
        const recipient = '+1234';
        const messages = utils.generate(config, translate, doc, content, recipient);
        expect(messages.length).to.equal(1);
        expect(messages[0].message).to.equal(expected);
        expect(messages[0].original_message).to.equal(sms);
        done();
      });

    });

    describe('resolve recipient', () => {
      
      it('resolves "clinic" correctly', done => {
        const phone = '+13125551213';
        const doc = {
          form: 'x',
          contact: {
            phone: phone,
            parent: {
              contact: {
                phone: phone
              }
            }
          }
        };
        const actual = utils.generate({}, null, doc, { message: 'hello' }, 'clinic');
        expect(actual[0].to).to.equal(phone);
        done();
      });

      it('defaults to doc.from if no recipient', done => {
        const phone = '+13125551213';
        const doc = {
          form: 'x',
          from: phone
        };
        const actual = utils.generate({}, null, doc, { message: 'hello' });
        expect(actual[0].to).to.equal(phone);
        done();
      });

      it('defaults to doc.from if no known recipient', done => {
        const phone = '+13125551213';
        const doc = {
          form: 'x',
          from: phone
        };
        const actual = utils.generate({}, null, doc, { message: 'hello' }, 'greatgrandparent');
        expect(actual[0].to).to.equal(phone);
        done();
      });

    });

  });

  describe('template', () => {

    it('plain text', done => {
      const actual = utils.template({}, null, {}, { message: 'hello' });
      expect(actual).to.equal('hello');
      done();
    });

    it('variables', done => {
      const actual = utils.template({}, null, { name: 'george' }, { message: 'hello {{name}}' });
      expect(actual).to.equal('hello george');
      done();
    });

    describe('dates', () => {

      it('string', done => {
        const date = '2016-03-06T03:45:41.000Z';
        const input = '{{#date}}{{reported_date}}{{/date}}';
        const doc = { reported_date: date };
        const config = { date_format: 'DD-MMM-YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.date_format));
        done();
      });

      it('integer', done => {
        const date = 1457235941000;
        const input = '{{#date}}{{reported_date}}{{/date}}';
        const doc = { reported_date: date };
        const config = { date_format: 'DD-MMM-YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.date_format));
        done();
      });

      it('Date object', done => {
        const date = 1457235941000;
        const input = '{{#date}}Date({{reported_date}}){{/date}}';
        const doc = { reported_date: date };
        const config = { date_format: 'DD-MMM-YYYY' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.date_format));
        done();
      });

    });

    describe('datetimes', () => {

      it('integer', done => {
        const date = 1457235941000;
        const input = '{{#datetime}}{{reported_date}}{{/datetime}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
        done();
      });

      it('Date object', done => {
        const date = 1457235941000;
        const input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(moment(date).format(config.reported_date_format));
        done();
      });

    });

    describe('bikram sambat', () => {

      it('integer', done => {
        const date = 1457235941000;
        const expected = '२३ फाल्गुन २०७२';
        const input = '{{#bikram_sambat_date}}{{reported_date}}{{/bikram_sambat_date}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(expected);
        done();
      });

      it('Date object', done => {
        const date = 1457235941000;
        const expected = '२३ फाल्गुन २०७२';
        const input = '{{#bikram_sambat_date}}Date({{reported_date}}){{/bikram_sambat_date}}';
        const doc = { reported_date: date };
        const config = { reported_date_format: 'DD-MMMM-YYYY HH:mm:ss' };
        const actual = utils.template(config, null, doc, { message: input });
        expect(actual).to.equal(expected);
        done();
      });

    });

    describe('template context', () => {

      it('supports template variables on doc', done => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          governor: 'arnold',
          contact: {
            phone: '123',
            parent: {
              contact: {
                phone: '123'
              }
            }
          }
        };
        const actual = utils.template({}, null, doc, { message: '{{contact.phone}}, {{governor}}' });
        expect(actual).to.equal('123, arnold');
        done();
      });

      it('internal fields always override form fields', done => {
        const doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z',
          chw_name: 'Arnold',
          contact: {
            name: 'Sally',
            parent: {
              contact: {
                name: 'Sally'
              }
            }
          }
        };
        const actual = utils.template({}, null, doc, { message: '{{contact.name}}, {{chw_name}}' });
        expect(actual).to.equal('Sally, Arnold');
        done();
      });

    });

  });

});
