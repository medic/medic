var _ = require('underscore');

// In this context $stateParams.id (the id in the url) can be:
//  - the _id of the contact who is sending these messages
//  - the phone number if it couldn't be resolved into a contact
//  - the _id of the data_record if there is no discernable phone number
//  This is determined by its $stateParams.type: 'contact', 'phone' or 'unknown'
//  respectively
angular.module('inboxControllers').controller('MessagesContentCtrl',
  function (
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    $stateParams,
    $timeout,
    GlobalActions,
    LineageModelGenerator,
    MessageContacts,
    MessagesActions,
    Modal,
    Selectors,
    SendMessage,
    Session
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        currentTab: Selectors.getCurrentTab(state),
        loadingContent: Selectors.getLoadingContent(state),
        selectedMessage: Selectors.getSelectedMessage(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const messagesActions = MessagesActions(dispatch);
      return {
        addSelectedMessage: messagesActions.addSelectedMessage,
        deleteDoc: globalActions.deleteDoc,
        markConversationRead: messagesActions.markConversationRead,
        unsetSelected: globalActions.unsetSelected,
        removeSelectedMessage: messagesActions.removeSelectedMessage,
        setLoadingContent: globalActions.setLoadingContent,
        setLoadingShowContent: globalActions.setLoadingShowContent,
        setMessagesError: messagesActions.setMessagesError,
        setSelected: messagesActions.setSelected,
        setTitle: globalActions.setTitle,
        updateSelectedMessage: messagesActions.updateSelectedMessage
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    ctrl.send = {
      message: ''
    };
    ctrl.allLoaded = false;

    const userCtx = Session.userCtx();

    var checkScroll = function() {
      if (this.scrollTop === 0 && !ctrl.allLoaded) {
        updateConversation({ skip: true });
      }
    };

    var scrollToUnread = function() {
      var content = $('.message-content-wrapper');
      var markers = content.find('.marker');
      var scrollTo;
      if (markers.length) {
        scrollTo = markers[0].offsetTop - 50;
      } else {
        scrollTo = content[0].scrollHeight;
      }
      content.scrollTop(scrollTo);
      $('.message-content-wrapper').on('scroll', checkScroll);
    };

    // See $stateParams.id note at top of file
    var getContactable = function(id, type) {
      if (type === 'contact') {
        return LineageModelGenerator.contact(id).catch(err => {
          if (err.code === 404) {
            return Promise.resolve();
          }
          throw err;
        });
      } else if (type === 'phone') {
        return {name: id};
      } else {
        return {};
      }
    };

    const selectContact = function(id, type) {
      if (!id) {
        ctrl.setMessagesError(false);
        ctrl.setLoadingContent(false);
        ctrl.unsetSelected();
        return;
      }
      $('.message-content-wrapper').off('scroll', checkScroll);
      ctrl.setSelected({ id: id, messages: [] });
      ctrl.setLoadingShowContent(id);

      return $q.all([
        getContactable(id, type),
        MessageContacts.conversation(id)
      ])
        .then(function(results) {
          let contactModel = results[0];
          const conversation = results[1];
          if (!contactModel) {
            const firstTaskWithContact = conversation[0].doc.tasks.find( 
              function(task) {
                const message = task.messages && task.messages[0];
                return message && message.contact && message.contact._id === id;
              }
            );
            const firstMessageWithContact = firstTaskWithContact.messages.find( 
              function(message) {
                return message.contact._id === id;
              }
            );
            contactModel = {
              doc: {
                name: '',
                phone: firstMessageWithContact.to
              }
            };
          }
          if (ctrl.selectedMessage && ctrl.selectedMessage.id !== id) {
            // ignore response for previous request
            return;
          }

          ctrl.setLoadingShowContent(false);
          ctrl.setMessagesError(false);
          const unread = conversation.filter(message => !message.read);
          ctrl.firstUnread = _.min(unread, message => message.doc.reported_date);
          ctrl.updateSelectedMessage({ contact: contactModel, messages: conversation });
          ctrl.setTitle((contactModel.doc && contactModel.doc.name) || id);
          ctrl.markConversationRead();
          $timeout(scrollToUnread);
        })
        .catch(function(err) {
          ctrl.setLoadingContent(false);
          ctrl.setMessagesError(true);
          $log.error('Error fetching contact conversation', err);
        });
    };

    var updateConversation = (options={}) => {
      var selectedId = ctrl.selectedMessage && ctrl.selectedMessage.id;
      if (selectedId) {
        var skip = options.skip && ctrl.selectedMessage.messages.length;
        if (skip) {
          $timeout(function() {
            ctrl.loadingMoreContent = true;
          });
        }

        MessageContacts.conversation(selectedId, skip)
          .then(function(conversation) {
            ctrl.loadingMoreContent = false;
            var contentElem = $('.message-content-wrapper');
            var scrollToBottom = contentElem.scrollTop() + contentElem.height() + 30 > contentElem[0].scrollHeight;
            var first = $('.item-content .body > ul > li').filter(':first');
            conversation.forEach(function(updated) {
              var match = _.findWhere(ctrl.selectedMessage.messages, { id: updated.id });
              if (match) {
                angular.extend(match, updated);
              } else {
                ctrl.addSelectedMessage(updated);
                if (updated.doc.sent_by === userCtx.name) {
                  scrollToBottom = true;
                }
              }
            });
            if (options.skip) {
              ctrl.allLoaded = conversation.length < 50;
              delete ctrl.firstUnread;
            }
            ctrl.markConversationRead();
            $timeout(function() {
              var scroll = false;
              if (options.skip) {
                var spinnerHeight = 102;
                scroll = $('.message-content-wrapper li')[conversation.length].offsetTop - spinnerHeight;
              } else if (first.length && scrollToBottom) {
                scroll = $('.message-content-wrapper')[0].scrollHeight;
              }
              if (scroll) {
                $('.message-content-wrapper').scrollTop(scroll);
              }
            });
          })
          .catch(err => $log.error('Error fetching contact conversation', err));
      }
    };

    ctrl.sendMessage = () => {
      if (!ctrl.selectedMessage) {
        $log.error('Error sending message', new Error('No facility selected'));
        return;
      }
      let recipient;
      if (ctrl.selectedMessage.contact.doc) { // known contact
        recipient = { doc: ctrl.selectedMessage.contact.doc };
      } else { // unknown sender
        recipient = { doc: { contact: { phone: ctrl.selectedMessage.id } } };
      }
      SendMessage(recipient, ctrl.send.message)
        .then(() => {
          ctrl.send.message = '';
        })
        .catch(err => {
          $log.error('Error sending message', err);
        });
    };

    ctrl.addRecipients = function() {
      Modal({
        templateUrl: 'templates/modals/send_message.html',
        controller: 'SendMessageCtrl',
        controllerAs: 'sendMessageCtrl',
        model: {
          to: ctrl.selectedMessage.id,
          message: ctrl.send.message
        }
      });
      ctrl.send.message = '';
    };

    $scope.$on('$destroy', function() {
      unsubscribe();
      if (!$state.includes('messages.detail')) {
        $('body').off('focus', '#message-footer textarea');
        $('body').off('blur', '#message-footer textarea');
      }
    });

    $('.tooltip').remove();

    // See $stateParams.id note at top of file
    // Promise exposed solely for testing purposes
    ctrl._testSelect = selectContact($stateParams.id, $stateParams.type);

    $('body')
      .on('focus', '#message-footer textarea', function() {
        $('#message-footer').addClass('sending');
      })
      .on('blur', '#message-footer textarea', function() {
        $('#message-footer').removeClass('sending');
      });

  }
);
