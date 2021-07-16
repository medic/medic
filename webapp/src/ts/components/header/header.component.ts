import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { SettingsService } from '@mm-services/settings.service';
import { HeaderTabsService } from '@mm-services/header-tabs.service';
import { AuthService } from '@mm-services/auth.service';
import { GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { LogoutConfirmComponent } from '@mm-modals/logout/logout-confirm.component';
import { FeedbackComponent } from '@mm-modals/feedback/feedback.component';

import { DBSyncService } from '@mm-services/db-sync.service';
import { GuidedSetupComponent } from '@mm-modals/guided-setup/guided-setup.component';
import { TourSelectComponent } from '@mm-modals/tour/tour-select.component';
import { TourService } from '@mm-services/tour.service';
import { TelemetryService } from '@mm-services/telemetry.service';


@Component({
  selector: 'mm-header',
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();

  @Input() adminUrl;
  @Input() canLogOut;
  @Input() tours;

  showPrivacyPolicy = false;
  replicationStatus;
  currentTab;
  unreadCount = {};
  permittedTabs = [];

  private globalActions;

  constructor(
    private store: Store,
    private settingsService: SettingsService,
    private headerTabsService: HeaderTabsService,
    private authService: AuthService,
    private modalService: ModalService,
    private dbSyncService: DBSyncService,
    private tourService: TourService,
    private telemetryService:TelemetryService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.subscribeToStore();
    this.getHeaderTabs();
    this.tourService
      .getTours()
      .then(tours => this.tours = tours);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private subscribeToStore() {
    const subscription = combineLatest(
      this.store.select(Selectors.getReplicationStatus),
      this.store.select(Selectors.getCurrentTab),
      this.store.select(Selectors.getShowPrivacyPolicy),
      this.store.select(Selectors.getUnreadCount),
    ).subscribe(([
      replicationStatus,
      currentTab,
      showPrivacyPolicy,
      unreadCount
    ]) => {
      this.replicationStatus = replicationStatus;
      this.currentTab = currentTab;
      this.showPrivacyPolicy = showPrivacyPolicy;
      this.unreadCount = unreadCount;
    });
    this.subscription.add(subscription);
  }

  private getHeaderTabs() {
    this.settingsService
      .get()
      .then(settings => this.headerTabsService.getAuthorizedTabs(settings))
      .then(permittedTabs => {
        this.permittedTabs = permittedTabs;
        this.globalActions.setMinimalTabs(this.permittedTabs.length > 3);
      });
  }

  openGuidedSetup() {
    this.modalService
      .show(GuidedSetupComponent)
      .catch(() => {});
  }

  openTourSelect() {
    this.modalService
      .show(TourSelectComponent)
      .catch(() => {});
  }

  openFeedback() {
    this.modalService
      .show(FeedbackComponent)
      .catch(() => {});
  }

  logout() {
    this.modalService
      .show(LogoutConfirmComponent)
      .catch(() => {});
  }

  replicate() {
    this.dbSyncService.sync(true);
    this.telemetryService.record('replication:user-initiated');
  }
}
