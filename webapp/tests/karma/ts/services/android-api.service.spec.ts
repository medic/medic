import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { AndroidApiService } from '@mm-services/android-api.service';
import { SessionService } from '@mm-services/session.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { MRDTService } from '@mm-services/mrdt.service';
import { SimprintsService } from '@mm-services/simprints.service';
import { HeaderTabsService } from '@mm-services/header-tabs.service';
import { Selectors } from '@mm-selectors/index';

describe('AndroidApi service', () => {

  let service;
  let sessionService;
  let router;
  let feedbackService;
  let mrdtService;
  let geolocationService;
  let simprintsService;
  let consoleErrorMock;
  let headerTabsService;
  let store;

  beforeEach(() => {
    sessionService = {
      userCtx: sinon.stub(),
      isOnlineOnly: sinon.stub(),
      logout: sinon.stub(),
    };

    router = {
      navigate: sinon.stub(),
      routerState: {
        root: {
          snapshot: {  }
        }
      }
    };

    feedbackService = {
      init: sinon.stub(),
      submit: sinon.stub(),
    };

    mrdtService = {
      respond: sinon.stub(),
      respondTimeTaken: sinon.stub(),
    };

    geolocationService = {
      permissionRequestResolved: sinon.stub()
    };

    simprintsService = {
      identifyResponse: sinon.stub(),
      registerResponse: sinon.stub()
    };

    headerTabsService = {
      getPrimaryTab: sinon.stub().resolves()
    };

    const mockedSelectors = [
      { selector: Selectors.getCurrentTab, value: null },
    ];

    consoleErrorMock = sinon.stub(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: SessionService, useValue: sessionService },
        { provide: GeolocationService, useValue: geolocationService },
        { provide: SimprintsService, useValue: simprintsService },
        { provide: FeedbackService, useValue: feedbackService },
        { provide: Router, useValue: router },
        { provide: MRDTService, useValue: mrdtService },
        { provide: HeaderTabsService, useValue: headerTabsService },
      ],
    });

    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('simprintsResponse', () => {
    beforeEach(() => {
      service = TestBed.inject(AndroidApiService);
    });

    it('errors when given string id', () => {
      service.v1.simprintsResponse(null, 'hello', null);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message).to.equal('Unable to parse requestId: "hello"');
      expect(simprintsService.identifyResponse.callCount).to.equal(0);
      expect(simprintsService.registerResponse.callCount).to.equal(0);
    });

    it('errors when given invalid response', () => {
      service.v1.simprintsResponse(null, '1', 'not json');
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message).to.equal(
        'Unable to parse JSON response from android app: "not json"'
      );
      expect(simprintsService.identifyResponse.callCount).to.equal(0);
      expect(simprintsService.registerResponse.callCount).to.equal(0);
    });

    it('errors when given unknown request type', () => {
      service.v1.simprintsResponse('query', '1', '{ "id": 153 }');
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message).to.equal('Unknown request type: "query"');
      expect(simprintsService.identifyResponse.callCount).to.equal(0);
      expect(simprintsService.registerResponse.callCount).to.equal(0);
    });

    it('calls identify', () => {
      const expectedRequestId = 55498890;
      const expectedResponse = [
        { id: 153, tier: 'TIER_1' },
        { id: 486, tier: 'TIER_5' }
      ];
      service.v1.simprintsResponse('identify', expectedRequestId.toString(), JSON.stringify(expectedResponse));
      expect(consoleErrorMock.callCount).to.equal(0);
      expect(simprintsService.identifyResponse.callCount).to.equal(1);
      expect(simprintsService.identifyResponse.args[0][0]).to.equal(expectedRequestId);
      expect(simprintsService.identifyResponse.args[0][1]).to.deep.equal(expectedResponse);
      expect(simprintsService.registerResponse.callCount).to.equal(0);
    });

    it('calls register', () => {
      const expectedRequestId = 54895590;
      const expectedResponse = { id: 849556216 };
      service.v1.simprintsResponse('register', expectedRequestId.toString(), JSON.stringify(expectedResponse));
      expect(consoleErrorMock.callCount).to.equal(0);
      expect(simprintsService.identifyResponse.callCount).to.equal(0);
      expect(simprintsService.registerResponse.callCount).to.equal(1);
      expect(simprintsService.registerResponse.args[0][0]).to.equal(expectedRequestId);
      expect(simprintsService.registerResponse.args[0][1]).to.deep.equal(expectedResponse);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      service = TestBed.inject(AndroidApiService);
    });

    it('should call sessionService logout', () => {
      service.logout();
      expect(sessionService.logout.callCount).to.equal(1);
    });
  });

  describe('back', () => {
    it('should route to contacts from deceased', () => {
      router.routerState.root.snapshot = {
        data: { name: 'contacts.deceased' },
        params: { id: 'my-contact-id' },
      };
      service = TestBed.inject(AndroidApiService);

      service.back();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'my-contact-id']]);
    });

    it('should route to contacts from contact detail', () => {
      router.routerState.root.snapshot = {
        params: { id: 'my-contact-id' },
        parent: { routeConfig: { path: 'contacts' } },
      };
      service = TestBed.inject(AndroidApiService);

      service.back();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'contacts']]);
    });

    it('should route to reports from report detail', () => {
      router.routerState.root.snapshot = {
        params: { id: 'my-report-id' },
        parent: { routeConfig: { path: 'reports' } },
      };
      service = TestBed.inject(AndroidApiService);

      service.back();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'reports']]);
    });

    it('should route to reports from random child route', () => {
      router.routerState.root.snapshot = {
        params: { id: 'my-random-id' },
        parent: { routeConfig: { path: 'something' } },
      };
      service = TestBed.inject(AndroidApiService);

      service.back();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'something']]);
    });

    it('should navigate to primaryTab if it is not the current tab', fakeAsync(() => {
      store.overrideSelector(Selectors.getCurrentTab, 'tasks');
      store.refreshState();
      headerTabsService.getPrimaryTab.resolves({ name: 'messages', route: 'messages' });
      service = TestBed.inject(AndroidApiService);
      tick();

      const result = service.back();

      expect(result).to.be.true;
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([ ['messages'] ]);
      expect(feedbackService.submit.callCount).to.equal(0);
      expect(headerTabsService.getPrimaryTab.callCount).to.equal(1);
    }));

    it('should submit feedback if routes is missing', fakeAsync(() => {
      feedbackService.submit.resolves();
      store.overrideSelector(Selectors.getCurrentTab, 'tasks');
      store.refreshState();
      headerTabsService.getPrimaryTab.resolves({ name: 'messages', route: null });
      service = TestBed.inject(AndroidApiService);
      tick();

      service.back();
      // this test is temporary
      // issue: https://github.com/medic/cht-core/issues/6698
      expect(feedbackService.submit.callCount).to.equal(1);
      expect(feedbackService.submit.args[0]).to.deep.equal(
        ['Attempt to back to an undefined state [AndroidApi.back()]']
      );
      expect(router.navigate.callCount).to.equal(0);
    }));

    it('should return false if primaryTab is the current tab', fakeAsync(() => {
      store.overrideSelector(Selectors.getCurrentTab, 'messages');
      store.refreshState();
      headerTabsService.getPrimaryTab.resolves({ name: 'messages', route: 'messages' });
      service = TestBed.inject(AndroidApiService);
      tick();

      const result = service.back();

      expect(result).to.be.false;
      expect(feedbackService.submit.callCount).to.equal(0);
      expect(headerTabsService.getPrimaryTab.callCount).to.equal(1);
      expect(router.navigate.callCount).to.equal(0);
    }));
  });

  describe('mrdtResponse', () => {
    beforeEach(() => {
      service = TestBed.inject(AndroidApiService);
    });

    it('should call mrdt.respond with parsed json', () => {
      const response = JSON.stringify({ some: 'response' });
      service.mrdtResponse(response);
      expect(mrdtService.respond.callCount).to.equal(1);
      expect(mrdtService.respond.args[0]).to.deep.equal([{ some: 'response' }]);
    });

    it('should catch parse errors', () => {
      const response = '{ this:  }is not valid json';
      service.mrdtResponse(response);
      expect(mrdtService.respond.callCount).to.equal(0);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message.startsWith('Unable to parse JSON response')).to.be.true;
    });
  });

  describe('mrdtTimeTakenResponse', () => {
    beforeEach(() => {
      service = TestBed.inject(AndroidApiService);
    });

    it('should call mrdt.respondTimeTaken with parsed json', () => {
      const response = JSON.stringify({ some: 'response' });
      service.mrdtTimeTakenResponse(response);
      expect(mrdtService.respondTimeTaken.callCount).to.equal(1);
      expect(mrdtService.respondTimeTaken.args[0]).to.deep.equal([{ some: 'response' }]);
    });

    it('should catch parse errors', () => {
      const response = '{ this:  }is not valid json';
      service.mrdtTimeTakenResponse(response);
      expect(mrdtService.respondTimeTaken.callCount).to.equal(0);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0].message.startsWith('Unable to parse JSON response')).to.be.true;
    });
  });

  describe('locationPermissionRequestResolve', () => {
    beforeEach(() => {
      service = TestBed.inject(AndroidApiService);
    });

    it('should call geolocation permissionRequestResolved', () => {
      service.locationPermissionRequestResolve();
      expect(geolocationService.permissionRequestResolved.callCount).to.equal(1);
    });
  });

  describe('v1 api runs everything in zone', () => {
    let ngZoneRun;
    beforeEach(() => {
      ngZoneRun = sinon.stub(NgZone.prototype, 'run').callsArg(0);
      service = TestBed.inject(AndroidApiService);
    });

    it('should not run in zone if already in zone', () => {
      sinon.stub(NgZone, 'isInAngularZone').returns(true);
      service.v1.logout();
      //@ts-ignore
      expect(NgZone.isInAngularZone.callCount).to.equal(1);
      expect(ngZoneRun.callCount).to.equal(0);
      expect(sessionService.logout.callCount).to.equal(1);
    });

    it('should run in zone if not already in zone', () => {
      sinon.stub(NgZone, 'isInAngularZone').returns(false);
      service.v1.logout();
      //@ts-ignore
      expect(NgZone.isInAngularZone.callCount).to.equal(1);
      expect(ngZoneRun.callCount).to.equal(1);
      expect(sessionService.logout.callCount).to.equal(1);
    });

    it('should pass parameters correctly when in zone', () => {
      sinon.stub(console, 'debug');
      sinon.stub(NgZone, 'isInAngularZone').returns(true);
      service.v1.smsStatusUpdate('the_id', 'the_dest', 'the_content', 'the_status', 'the_detail');
      //@ts-ignore
      expect(NgZone.isInAngularZone.callCount).to.equal(1);
      expect(ngZoneRun.callCount).to.equal(0);
      //@ts-ignore
      expect(console.debug.callCount).to.equal(1);
      //@ts-ignore
      expect(console.debug.args[0]).to.deep.equal([
        'smsStatusUpdate() :: ' +
        ' id=the_id,' +
        ' destination=the_dest,' +
        ' content=the_content,' +
        ' status=the_status,' +
        ' detail=the_detail'
      ]);
    });

    it('should pass parameters correctly when outside zone', () => {
      sinon.stub(console, 'debug');
      sinon.stub(NgZone, 'isInAngularZone').returns(false);
      service.v1.smsStatusUpdate('an_id', 'a_dest', 'a_content', 'a_status', 'a_detail');
      //@ts-ignore
      expect(NgZone.isInAngularZone.callCount).to.equal(1);
      expect(ngZoneRun.callCount).to.equal(1);
      //@ts-ignore
      expect(console.debug.callCount).to.equal(1);
      //@ts-ignore
      expect(console.debug.args[0]).to.deep.equal([
        'smsStatusUpdate() :: ' +
        ' id=an_id,' +
        ' destination=a_dest,' +
        ' content=a_content,' +
        ' status=a_status,' +
        ' detail=a_detail'
      ]);
    });
  });
});
