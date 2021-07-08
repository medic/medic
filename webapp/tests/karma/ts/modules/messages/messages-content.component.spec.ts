import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { provideMockStore } from '@ngrx/store/testing';
import sinon from 'sinon';
import { assert, expect } from 'chai';
import { Observable } from 'rxjs';

import { MessagesContentComponent } from '@mm-modules/messages/messages-content.component';
import { MessageContactService } from '@mm-services/message-contact.service';
import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { MarkReadService } from '@mm-services/mark-read.service';
import { SendMessageService } from '@mm-services/send-message.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { ActivatedRoute } from '@angular/router';
import { MessagesActions } from '@mm-actions/messages';
import { PipesModule } from '@mm-pipes/pipes.module';

describe('MessagesContentComponent', () => {
  let component: MessagesContentComponent;
  let fixture: ComponentFixture<MessagesContentComponent>;
  let messageContactService;
  let changesService;
  let sessionService;
  let lineageModelGeneratorService;
  let markReadService;
  let sendMessageService;
  let modalService;
  let changesFilter;
  let changesCallback;
  let activatedRoute;
  let activatedRouteParams;

  beforeEach(async(() => {
    messageContactService = {
      getConversation: sinon.stub().resolves([]),
      isRelevantChange: sinon.stub()
    };
    changesService = {
      subscribe: sinon.stub().callsFake((opts) => {
        changesCallback = opts.callback;
        changesFilter = opts.filter;
        return { unsubscribe: sinon.stub() };
      })
    };
    sessionService = { userCtx: sinon.stub().returns({ name: 'Sarah' }) };
    lineageModelGeneratorService = { contact: sinon.stub().resolves() };
    markReadService = { markAsRead: sinon.stub().resolves() };
    sendMessageService = { send: sinon.stub().resolves() };
    modalService = { show: sinon.stub() };
    const mockedSelectors = [
      { selector: 'getSelectedConversation', value: {} },
      { selector: 'getLoadingContent', value: false },
    ];
    activatedRoute = {
      params: new Observable(subscriber => activatedRouteParams = subscriber),
    };


    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          PipesModule,
        ],
        declarations: [
          MessagesContentComponent
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ChangesService, useValue: changesService },
          { provide: MessageContactService, useValue: messageContactService },
          { provide: SettingsService, useValue: {} }, // Needed because of ngx-translate provider's constructor.
          { provide: SessionService, useValue: sessionService },
          { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
          { provide: MarkReadService, useValue: markReadService },
          { provide: SendMessageService, useValue: sendMessageService },
          { provide: ModalService, useValue: modalService },
          { provide: ActivatedRoute, useValue: activatedRoute }
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(MessagesContentComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  describe('Messages without contact', () => {
    it('should pull the contact phone number from the first message and show empty user name', async () => {
      const id = '12';
      const type = 'contact';
      const phone = '+12';
      const res = {
        doc: {
          tasks: [
            { messages: [ { to: phone, contact: { _id: id }} ] },
            { messages: [ { to: phone, contact: { _id: id }} ] }
          ]
        }
      };
      activatedRouteParams.next(`${type}:${id}`);
      lineageModelGeneratorService.contact.rejects({ code: 404 });
      messageContactService.getConversation.resolves([res]);
      const updateSelectedConversationSpy = sinon.spy(MessagesActions.prototype, 'updateSelectedConversation');

      await component.selectContact(id, type);

      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.getCall(0).args[0]).to.equal(id);
      expect(messageContactService.getConversation.callCount).to.equal(1);
      expect(messageContactService.getConversation.getCall(0).args[0]).to.equal(id);
      expect(updateSelectedConversationSpy.callCount).to.equal(1);
      expect(updateSelectedConversationSpy.getCall(0).args[0].contact.doc.name).to.equal('');
      expect(updateSelectedConversationSpy.getCall(0).args[0].contact.doc.phone).to.equal(phone);
    });

    it('should not fail when no contact and no conversation', () => {
      const id = '12';
      const type = 'contact';
      activatedRouteParams.next(`${type}:${id}`);
      lineageModelGeneratorService.contact.rejects({ code: 404 });
      messageContactService.getConversation.resolves([]);
      const updateSelectedConversationSpy = sinon.spy(MessagesActions.prototype, 'updateSelectedConversation');

      return component
        .selectContact(id, type)
        .then(() => {
          expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
          expect(lineageModelGeneratorService.contact.getCall(0).args[0]).to.equal(id);
          expect(messageContactService.getConversation.callCount).to.equal(1);
          expect(messageContactService.getConversation.getCall(0).args[0]).to.equal(id);
          expect(updateSelectedConversationSpy.callCount).to.equal(1);
          expect(updateSelectedConversationSpy.args[0][0]).to.deep.include({ contact: undefined, messages: [] });
        })
        .catch(() => assert.fail('Should not fail'));
    });
  });

  describe('Watching changesService.subscribe', () => {
    it('should start watching changesService.subscribe', () => {
      component.ngOnInit();

      expect(changesService.subscribe.callCount).to.equal(2);
      expect(changesService.subscribe.args[0][0].key).to.equal('messages-content');
      expect(changesService.subscribe.args[0][0].callback).to.be.a('function');
      expect(changesService.subscribe.args[0][0].filter).to.be.a('function');
      expect(sessionService.userCtx.callCount).to.equal(2);
    });

    it('should filter relevant changesService.subscribe', () => {
      const change = { id: 'id' };
      const change2 = { id: 'id' };
      const selectedConversation = {
        contact: { name: 'peter' },
        messages: [
          { id: 'message1' },
          { id: 'message2' },
          { id: 'message3' }
        ]
      };
      component.selectedConversation = selectedConversation;

      messageContactService.isRelevantChange.returns(false);
      expect(!!changesFilter(change)).to.equal(false);
      expect(messageContactService.isRelevantChange.callCount).to.deep.equal(1);
      expect(messageContactService.isRelevantChange.args[0]).to.deep.equal([change, selectedConversation]);
      messageContactService.isRelevantChange.returns(true);
      expect(!!changesFilter(change2)).to.equal(true);
      expect(messageContactService.isRelevantChange.callCount).to.deep.equal(2);
      expect(messageContactService.isRelevantChange.args[1]).to.deep.equal([change2, selectedConversation]);
    });
  });

  describe('Update Conversation', () => {
    it('should not do anything when no conversation is selected', () => {
      component.selectedConversation = null;
      const change = { id: 'id', deleted: true };

      component.ngOnInit();

      expect(messageContactService.getConversation.callCount).to.equal(0);
      changesCallback(change);
      expect(messageContactService.getConversation.callCount).to.equal(0);
    });

    it('should update the conversation when conversation is selected', async () => {
      const change = { id: 'message3' };
      const contact = { name: 'contact', _id: 'c1' };
      const messages = [ { doc: { _id: 'message1' } }, { doc: { _id: 'message2' } } ];
      lineageModelGeneratorService.contact.resolves(contact);
      const updateSelectedConversationSpy = sinon.spy(MessagesActions.prototype, 'updateSelectedConversation');
      messageContactService.getConversation.resolves([...messages, { doc: { _id: 'message3' } }]);
      component.selectedConversation = { contact, messages, id: contact._id };
      activatedRouteParams.next('contact:c1');

      await changesCallback(change);

      expect(messageContactService.getConversation.callCount).to.equal(1);
      expect(messageContactService.getConversation.args[0]).to.deep.equal(['c1', undefined, messages.length]);
      expect(updateSelectedConversationSpy.callCount).to.equal(1);
      expect(updateSelectedConversationSpy.args[0]).to.deep.equal([
        { messages: [...messages, { doc: { _id: 'message3' } }] }
      ]);
    });

    it('should remove deleted messages from selected conversation', () => {
      const change = { id: 'message2', deleted: true };
      const contact = { name: 'contact', _id: 'c1' };
      const messages = [{ doc: { _id: 'message1' } }, { doc: { _id: 'message2' } } ];
      const updateSelectedConversationSpy = sinon.spy(MessagesActions.prototype, 'updateSelectedConversation');
      const removeMessageFromSelectedConversationSpy =
        sinon.spy(MessagesActions.prototype, 'removeMessageFromSelectedConversation');
      messageContactService.getConversation.resolves(messages);
      lineageModelGeneratorService.contact.resolves(contact);
      component.selectedConversation = { contact, messages, id: contact._id };
      activatedRouteParams.next('contact:c1');

      changesCallback(change);

      expect(messageContactService.getConversation.callCount).to.equal(0);
      expect(updateSelectedConversationSpy.callCount).to.equal(0);
      expect(removeMessageFromSelectedConversationSpy.callCount).to.equal(1);
      expect(removeMessageFromSelectedConversationSpy.args[0]).to.deep.equal(['message2']);
    });
  });

  describe('New message section', () => {
    it('should display the "new message" section in a conversation with a known recipient', async () => {
      component.selectedConversation = {
        'id': '7aeaa4bc-ae5e-4964-8771-697209d2c6dd',
        'messages': [
          { 'id': '68e4ae1a-bb6c-4561-98e7-3f7cdfd00486' }
        ],
        'contact': {
          'doc': { 'name': 'Groot' }
        }
      };

      fixture.detectChanges();
      await fixture.whenStable();

      const footer = fixture.debugElement.query(By.css('#message-footer'))?.nativeElement;
      expect(footer).to.not.be.undefined;
    });

    it('should hide the "new message" section in a conversation with an unknown recipient', async () => {
      component.selectedConversation = {
        'id': '52c1de4a-33dd-4d22-9916-24e7c77451f5',
        'messages': [
          { 'id': '40b0678a-0f16-47cb-8591-fb3eab3b81d2' }
        ],
        'contact': {
          'doc': {
            'name': ''
          }
        }
      };

      fixture.detectChanges();
      await fixture.whenStable();

      const footer = fixture.debugElement.query(By.css('#message-footer'))?.nativeElement;
      expect(footer).to.be.undefined;
    });
  });
});

