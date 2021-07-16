import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { FeedbackService } from '@mm-services/feedback.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { MRDTService } from '@mm-services/mrdt.service';
import { SessionService } from '@mm-services/session.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';
import { SimprintsService } from '@mm-services/simprints.service';
import { HeaderTabsService } from '@mm-services/header-tabs.service';
import { Selectors } from '@mm-selectors/index';

/**
 * An API to provide integration with the medic-android app.
 *
 * This service must maintain backwards compatibility as we cannot
 * guarantee the all clients will be on a recent version of the app.
 */
@Injectable({
  providedIn: 'root',
})
export class AndroidApiService {
  private primaryTab;
  private currentTab;

  constructor(
    private store:Store,
    private feedbackService:FeedbackService,
    private geolocationService:GeolocationService,
    private mrdtService:MRDTService,
    private sessionService:SessionService,
    private router:Router,
    private simprintsService:SimprintsService,
    private zone:NgZone,
    private routeSnapshotService:RouteSnapshotService,
    private headerTabsService:HeaderTabsService,
  ) {
    this.subscribeToStore();
    this.getPrimaryTab();
  }

  private subscribeToStore() {
    this.store
      .select(Selectors.getCurrentTab)
      .subscribe(currentTab => this.currentTab = currentTab);
  }

  private getPrimaryTab() {
    this.headerTabsService
      .getPrimaryTab() // Not passing settings since icons aren't needed.
      .then(tab => this.primaryTab = tab);
  }

  private runInZone(property:string, args:any[]=[]) {
    if (!this[property] || typeof this[property] !== 'function') {
      return;
    }

    if (NgZone.isInAngularZone()) {
      return this[property](...args);
    }

    return this.zone.run(() => this[property](...args));
  }

  /**
   * Close all select2 dropdowns
   * @return {boolean} `true` if any select2s were closed.
   */
  private closeSelect2($container) {
    // If there are any select2 dropdowns open, close them.  The select
    // boxes are closed while they are checked - this saves us having to
    // iterate over them twice
    let closed = false;
    $container
      .find('select.select2-hidden-accessible')
      .each(function() {
        const elem = <any>$(this);
        if (elem.select2('isOpen')) {
          elem.select2('close');
          closed = true;
        }
      });
    return closed;
  }


  /**
   * Close the highest-priority dropdown within a particular container.
   * @return {boolean} `true` if a dropdown was closed; `false` otherwise.
   */
  private closeDropdownsIn($container) {
    if (this.closeSelect2($container)) {
      return true;
    }

    // todo: this probably won't work because dropdowns are now angular directives!

    // If there is a dropdown menu open, close it
    const $dropdown = $container.find('.filter.dropdown.open:visible');
    if ($dropdown.length) {
      $dropdown.removeClass('open');
      return true;
    }

    // On an Enketo form, go to the previous page (if there is one)
    if ($container.find('.enketo .btn.previous-page:visible:enabled:not(".disabled")').length) {
      window.history.back();
      return true;
    }

    return false;
  }

  /*
   * Find the modal with highest z-index, and ignore the rest
   */
  private closeTopModal($modals) {
    let $topModal;
    $modals.each(function() {
      const $modal = $(this);
      if (!$topModal) {
        $topModal = $modal;
        return;
      }
      if ($topModal.css('z-index') <= $modal.css('z-index')) {
        $topModal = $modal;
      }
    });

    if (!this.closeDropdownsIn($topModal)) {
      // Try to close by clicking modal's top-right `X` or `[ Cancel ]`
      // button.
      $topModal
        .find('.btn.cancel:visible:not(:disabled), button.close:visible:not(:disabled)')
        .click();
    }
  }

  /**
   * Kill the session.
   */
  logout() {
    this.sessionService.logout();
  }

  /**
   * Handle hardware back-button presses when inside the android app.
   * @return {boolean} `true` if angular handled the back button; otherwise
   *   the android app will handle it as it sees fit.
   */
  back() {
    // If there's a modal open, close any dropdowns inside it, or try to close the modal itself.
    const $modals = $('.modal:visible');
    if ($modals.length) {
      this.closeTopModal($modals);
      return true;
    }

    // If the hotdog hamburger options menu is open, close it
    const $optionsMenu = $('.dropdown.options.open');
    if($optionsMenu.length) {
      $optionsMenu.removeClass('open');
      return true;
    }

    // If there is an actionbar drop-up menu open, close it
    const $dropup = $('.actions.dropup.open:visible');
    if ($dropup.length) {
      $dropup.removeClass('open');
      return true;
    }

    if (this.closeDropdownsIn($('body'))) {
      return true;
    }

    const routeSnapshot = this.routeSnapshotService.get();
    if (routeSnapshot?.data?.name === 'contacts.deceased') {
      this.router.navigate(['/contacts', routeSnapshot.params.id]);
      return true;
    }

    if (routeSnapshot?.params?.id) {
      this.router.navigate(['/', routeSnapshot.parent.routeConfig.path]);
      return true;
    }

    // If we're viewing a tab, but not the primary tab, go to primary tab
    if (this.primaryTab?.name !== this.currentTab) {
      if (this.primaryTab?.route) {
        this.router.navigate([ this.primaryTab.route ]);
        return true;
      } else {
        this.feedbackService
          .submit('Attempt to back to an undefined state [AndroidApi.back()]')
          .catch(error => console.error('Error saving feedback', error));
      }
    }

    return false;
  }

  /**
   * Handle the response from the MRDT app
   * @param response The stringified JSON response from the MRDT app.
   */
  mrdtResponse(response) {
    try {
      this.mrdtService.respond(JSON.parse(response));
    } catch(e) {
      return console.error(
        new Error(`Unable to parse JSON response from android app: "${response}", error message: "${e.message}"`)
      );
    }
  }

  /**
   * Handle the response from the MRDT app
   * @param response The stringified JSON response from the MRDT app.
   */
  mrdtTimeTakenResponse(response) {
    try {
      this.mrdtService.respondTimeTaken(JSON.parse(response));
    } catch(e) {
      return console.error(
        new Error(`Unable to parse JSON response from android app: "${response}", error message: "${e.message}"`)
      );
    }
  }

  /**
   * Handle the response from the simprints device
   *
   * @param requestType Indicates the response handler to call. Either 'identify' or 'register'.
   * @param requestIdString The unique ID of the request to the simprints device.
   * @param response The stringified JSON response from the simprints device.
   */
  simprintsResponse(requestType, requestIdString, response) {
    const requestId = parseInt(requestIdString, 10);
    if (isNaN(requestId)) {
      return console.error(new Error('Unable to parse requestId: "' + requestIdString + '"'));
    }
    try {
      response = JSON.parse(response);
    } catch(e) {
      return console.error(new Error('Unable to parse JSON response from android app: "' + response + '"'));
    }
    if (requestType === 'identify') {
      this.simprintsService.identifyResponse(requestId, response);
    } else if (requestType === 'register') {
      this.simprintsService.registerResponse(requestId, response);
    } else {
      return console.error(new Error('Unknown request type: "' + requestType + '"'));
    }
  }

  smsStatusUpdate(id, destination, content, status, detail) {
    console.debug('smsStatusUpdate() :: ' +
      ' id=' + id +
      ', destination=' + destination +
      ', content=' + content +
      ', status=' + status +
      ', detail=' + detail);
    // TODO storing status updates for SMS should be implemented as part of #4812
  }

  locationPermissionRequestResolve() {
    this.geolocationService.permissionRequestResolved();
  }

  v1 = {
    back: () => this.runInZone('back'),
    logout: () => this.runInZone('logout'),
    mrdtResponse: (...args) => this.runInZone('mrdtResponse', args),
    mrdtTimeTakenResponse: (...args) => this.runInZone('mrdtTimeTakenResponse', args),
    simprintsResponse: (...args) => this.runInZone('simprintsResponse', args),
    smsStatusUpdate: (...args) => this.runInZone('smsStatusUpdate', args),
    locationPermissionRequestResolved: () => this.runInZone('locationPermissionRequestResolve'),
  };
}
