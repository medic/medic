var controller = require('../../message-utils'),
    dbNano = require('../../db-nano'),
    dbPouch = require('../../db-pouch'),
    sinon = require('sinon').sandbox.create(),
    taskUtils = require('task-utils');
const USE_POUCH = true;

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

exports['getMessages returns errors'] = function(test) {
  test.expect(2);
  var getView = USE_POUCH ?
      sinon.stub(dbPouch.medic, 'query').callsArgWith(2, 'bang') :
      sinon.stub(dbNano.medic, 'view').callsArgWith(3, 'bang');
  controller.getMessages(null, function(err) {
    test.equals(err, 'bang');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['getMessages passes limit param value of 100 to view'] = function(test) {
  test.expect(2);
  var getView = USE_POUCH ?
    sinon.stub(dbPouch.medic, 'query').callsArgWith(2, null, { rows: [] }) :
    sinon.stub(dbNano.medic, 'view').callsArgWith(3, null, { rows: [] });
  controller.getMessages({ limit: 500 }, function() {
    test.equals(getView.callCount, 1);
    // assert query parameters on view call use right limit value
    test.deepEqual({ limit: 500 }, getView.getCall(0).args[USE_POUCH ? 1 : 2]);
    test.done();
  });
};

exports['getMessages returns 500 error if limit over 100'] = function(test) {
  test.expect(3);
  var getView = USE_POUCH ?
    sinon.stub(dbPouch.medic, 'query') :
    sinon.stub(dbNano.medic, 'view');
  controller.getMessages({ limit: 9999 }, function(err) {
    test.equals(err.code, 500);
    test.equals(err.message, 'Limit max is 1000');
    test.equals(getView.callCount, 0);
    test.done();
  });
};

exports['getMessages passes state param'] = function(test) {
  test.expect(4);
  if(USE_POUCH) {
    sinon.stub(dbPouch.medic, 'query').callsArgWith(2, null, { rows: [
      { key: 'yayaya', value: { sending_due_date: 456 } },
      { key: 'pending', value: { sending_due_date: 123 } },
      { key: 'pending', value: { sending_due_date: 789 } }
    ] });
  } else {
    sinon.stub(dbNano.medic, 'view').callsArgWith(3, null, { rows: [
      { key: 'yayaya', value: { sending_due_date: 456 } },
      { key: 'pending', value: { sending_due_date: 123 } },
      { key: 'pending', value: { sending_due_date: 789 } }
    ] });
  }

  controller.getMessages({}, function(err, messages) {
    test.ok(!err);
    test.equals(messages.length, 3);
    test.ok(messages[0].sending_due_date <= messages[1].sending_due_date);
    test.ok(messages[1].sending_due_date <= messages[2].sending_due_date);
    test.done();
  });
};

exports['getMessages passes states param'] = function(test) {
  test.expect(3);
  var getView = USE_POUCH ?
      sinon.stub(dbPouch.medic, 'query').callsArgWith(2, null, { rows: [] }) :
      sinon.stub(dbNano.medic, 'view').callsArgWith(3, null, { rows: [] });
  controller.getMessages({ states: ['happy', 'angry'] }, function(err) {
    console.log(err);
    test.ok(!err);
    test.equals(getView.callCount, 1);
    test.deepEqual(['happy', 'angry'], getView.getCall(0).args[USE_POUCH ? 1 : 2].keys);
    test.done();
  });
};

exports['getMessages sorts results'] = function(test) {
  test.expect(3);
  var getView = USE_POUCH ?
      sinon.stub(dbPouch.medic, 'query').callsArgWith(2, null, { rows: [] }) :
      sinon.stub(dbNano.medic, 'view').callsArgWith(3, null, { rows: [] });
  controller.getMessages({ states: ['happy', 'angry'] }, function(err) {
    console.log(err);
    test.ok(!err);
    test.equals(getView.callCount, 1);
    test.deepEqual(['happy', 'angry'], getView.getCall(0).args[USE_POUCH ? 1 : 2].keys);
    test.done();
  });
};

exports['updateMessageTaskStates takes a collection of state changes and saves it to docs'] = test => {
  if(USE_POUCH) {
    sinon.stub(dbPouch.medic, 'query').callsArgWith(2, null, {rows: [
      {id: 'testMessageId1'},
      {id: 'testMessageId2'}]});
  } else {
    sinon.stub(dbNano.medic, 'view').callsArgWith(3, null, {rows: [
      {id: 'testMessageId1'},
      {id: 'testMessageId2'}]});
  }

  if(USE_POUCH) {
    sinon.stub(dbPouch.medic, 'allDocs').callsArgWith(1, null, {rows: [
      {doc: {
        _id: 'testDoc',
        tasks: [{
          messages: [{
            uuid: 'testMessageId1'
          }]
        }],
        scheduled_tasks: [{
          messages: [{
            uuid: 'testMessageId2'
          }]
        }]
      }}
    ]});
  } else {
    sinon.stub(dbNano.medic, 'fetch').callsArgWith(1, null, {rows: [
      {doc: {
        _id: 'testDoc',
        tasks: [{
          messages: [{
            uuid: 'testMessageId1'
          }]
        }],
        scheduled_tasks: [{
          messages: [{
            uuid: 'testMessageId2'
          }]
        }]
      }}
    ]});
  }

  const bulk = USE_POUCH ?
      sinon.stub(dbPouch.medic, 'bulkDocs').callsArgWith(1, null, []) :
      sinon.stub(dbNano.medic, 'bulk').callsArgWith(1, null, []);
  const setTaskState = sinon.stub(taskUtils, 'setTaskState');

  controller.updateMessageTaskStates([
    {
      messageId: 'testMessageId1',
      state: 'testState1',
    },
    {
      messageId: 'testMessageId2',
      state: 'testState2',
      details: 'Just because.'
    }
  ], (err, result) => {
    test.equal(err, null);
    test.deepEqual(result, {success: true});
    test.equal(setTaskState.callCount, 2);
    test.deepEqual(setTaskState.getCall(0).args, [{ messages: [{uuid: 'testMessageId1'}]}, 'testState1', undefined]);
    test.deepEqual(setTaskState.getCall(1).args, [{ messages: [{uuid: 'testMessageId2'}]}, 'testState2', 'Just because.']);

    const doc = USE_POUCH ? bulk.args[0][0][0] : bulk.args[0][0].docs[0];
    test.equal(doc._id, 'testDoc');

    test.done();
  });
};

exports['updateMessageTaskStates DOES NOT throw an error if it cant find the message'] = test => {
  if(USE_POUCH) {
    sinon.stub(dbPouch.medic, 'query').callsArgWith(2, null, {rows: [
      {id: 'testMessageId1'}]});
  } else {
    sinon.stub(dbNano.medic, 'view').callsArgWith(3, null, {rows: [
      {id: 'testMessageId1'}]});
  }

  if(USE_POUCH) {
    sinon.stub(dbPouch.medic, 'allDocs').callsArgWith(1, null, {rows: [
      {doc: {
        _id: 'testDoc',
        tasks: [{
          messages: [{
            uuid: 'testMessageId1'
          }]
        }]
      }}
    ]});
  } else {
    sinon.stub(dbNano.medic, 'fetch').callsArgWith(1, null, {rows: [
      {doc: {
        _id: 'testDoc',
        tasks: [{
          messages: [{
            uuid: 'testMessageId1'
          }]
        }]
      }}
    ]});
  }

  if(USE_POUCH) {
    sinon.stub(dbPouch.medic, 'bulkDocs').callsArgWith(1, null, []);
  } else {
    sinon.stub(dbNano.medic, 'bulk').callsArgWith(1, null, []);
  }

  controller.updateMessageTaskStates([
    {
      messageId: 'testMessageId1',
      state: 'testState1',
    },
    {
      messageId: 'testMessageId2',
      state: 'testState2',
      details: 'Just because.'
    }
  ], (err, result) => {
    test.equal(err, null);
    test.deepEqual(result, {success: true});

    test.done();
  });
};

exports['updateMessageTaskStates re-applies changes if it errored'] = test => {
  const view = USE_POUCH ?
    sinon.stub(dbPouch.medic, 'query')
        .onFirstCall().callsArgWith(2, null, {rows: [
          {id: 'testMessageId1'},
          {id: 'testMessageId2'}]})
        .onSecondCall().callsArgWith(2, null, {rows: [
          {id: 'testMessageId2'}]}) :
    sinon.stub(dbNano.medic, 'view')
        .onFirstCall().callsArgWith(3, null, {rows: [
          {id: 'testMessageId1'},
          {id: 'testMessageId2'}]})
        .onSecondCall().callsArgWith(3, null, {rows: [
          {id: 'testMessageId2'}]});

  if(USE_POUCH) {
    sinon.stub(dbPouch.medic, 'allDocs')
        .onFirstCall().callsArgWith(1, null, {rows: [
          {doc: {
            _id: 'testDoc',
            tasks: [{
              messages: [{
                uuid: 'testMessageId1'
              }]
            }]
          }},
          {doc: {
            _id: 'testDoc2',
            tasks: [{
              messages: [{
                uuid: 'testMessageId2'
              }]
            }]
          }}
        ]})
        .onSecondCall().callsArgWith(1, null, {rows: [
          {doc: {
            _id: 'testDoc2',
            tasks: [{
              messages: [{
                uuid: 'testMessageId2'
              }]
            }]
          }}
        ]});
  } else {
    sinon.stub(dbNano.medic, 'fetch')
        .onFirstCall().callsArgWith(1, null, {rows: [
          {doc: {
            _id: 'testDoc',
            tasks: [{
              messages: [{
                uuid: 'testMessageId1'
              }]
            }]
          }},
          {doc: {
            _id: 'testDoc2',
            tasks: [{
              messages: [{
                uuid: 'testMessageId2'
              }]
            }]
          }}
        ]})
        .onSecondCall().callsArgWith(1, null, {rows: [
          {doc: {
            _id: 'testDoc2',
            tasks: [{
              messages: [{
                uuid: 'testMessageId2'
              }]
            }]
          }}
        ]});
  }

  const bulk = USE_POUCH ?
      sinon.stub(dbPouch.medic, 'bulkDocs')
          .onFirstCall().callsArgWith(1, null, [
              {id: 'testDoc', ok: true},
              {id: 'testDoc2', error: 'oh no!'}])
          .onSecondCall().callsArgWith(1, null, [
              {id: 'testDoc2', ok: true}]) :
      sinon.stub(dbNano.medic, 'bulk')
          .onFirstCall().callsArgWith(1, null, [
              {id: 'testDoc', ok: true},
              {id: 'testDoc2', error: 'oh no!'}])
          .onSecondCall().callsArgWith(1, null, [
              {id: 'testDoc2', ok: true}]);

  controller.updateMessageTaskStates([
    {
      messageId: 'testMessageId1',
      state: 'testState1',
    },
    {
      messageId: 'testMessageId2',
      state: 'testState2',
      details: 'Just because.'
    }
  ], (err, result) => {
    test.equal(err, null);
    test.deepEqual(result, {success: true});

    test.equal(view.callCount, 2);
    if(USE_POUCH) {
      test.deepEqual(view.args[0][1], {keys: ['testMessageId1', 'testMessageId2']});
      test.deepEqual(view.args[1][1], {keys: ['testMessageId2']});

      test.equal(bulk.args[0][0].length, 2);
      test.equal(bulk.args[0][0][0]._id, 'testDoc');
      test.equal(bulk.args[0][0][1]._id, 'testDoc2');
      test.equal(bulk.args[1][0].length, 1);
      test.equal(bulk.args[1][0][0]._id, 'testDoc2');
    } else {
      test.deepEqual(view.args[0][2], {keys: ['testMessageId1', 'testMessageId2']});
      test.deepEqual(view.args[1][2], {keys: ['testMessageId2']});

      test.equal(bulk.args[0][0].docs.length, 2);
      test.equal(bulk.args[0][0].docs[0]._id, 'testDoc');
      test.equal(bulk.args[0][0].docs[1]._id, 'testDoc2');
      test.equal(bulk.args[1][0].docs.length, 1);
      test.equal(bulk.args[1][0].docs[0]._id, 'testDoc2');
    }

    test.done();
  });
};
