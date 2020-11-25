import { createSelector } from '@ngrx/store';

const getGlobalState = (state) => state.global || {};
const getServicesState = (state) => state.services || {};
const getReportsState = (state) => state.reports || {};
const getMessagesState = (state) => state.messages || {};
const getContactsState = (state) => state.contacts || {};
const getEnketoStatus = state => getGlobalState(state).enketoStatus;
const getAnalyticsState = (state) => state.analytics || {};
const getTargetAggregatesState = (state) => state.targetAggregates || {};

export const Selectors = {
  // global
  getActionBar: createSelector(getGlobalState, (globalState) => globalState.actionBar),
  getLoadingSubActionBar: createSelector(getGlobalState, (globalState) => globalState.loadingSubActionBar),
  getReplicationStatus: createSelector(getGlobalState, (globalState) => globalState.replicationStatus),
  getAndroidAppVersion:  createSelector(getGlobalState, (globalState) => globalState.androidAppVersion),
  getCurrentTab: createSelector(getGlobalState, (globalState) => globalState.currentTab),
  getSnapshotData: createSelector(getGlobalState, (globalState) => globalState.snapshotData),
  getSnackbarContent: createSelector(getGlobalState, (globalState) => globalState.snackbarContent),
  getLoadingContent: createSelector(getGlobalState, (globalState) => globalState.loadingContent),
  getMinimalTabs: createSelector(getGlobalState, (globalState) => globalState.minimalTabs),
  getShowContent: createSelector(getGlobalState, (globalState) => globalState.showContent),
  getSelectMode: createSelector(getGlobalState, (globalState) => globalState.selectMode),
  getShowActionBar: createSelector(getGlobalState, (globalState) => globalState.showActionBar),
  getForms: createSelector(getGlobalState, (globalState) => globalState.forms),
  getFilters: createSelector(getGlobalState, (globalState) => globalState.filters),
  getIsAdmin: createSelector(getGlobalState, (globalState) => globalState.isAdmin),
  getCancelCallback: createSelector(getGlobalState, (globalState) => globalState.cancelCallback),
  getTitle: createSelector(getGlobalState, (globalState) => globalState.title),
  getPrivacyPolicyAccepted: createSelector(getGlobalState, (globalState) => globalState.privacyPolicyAccepted),
  getShowPrivacyPolicy: createSelector(getGlobalState, (globalState) => globalState.showPrivacyPolicy),

  // enketo
  getEnketoStatus: createSelector(getEnketoStatus, (enketoStatus) => enketoStatus),
  getEnketoEditedStatus: createSelector(getEnketoStatus, (enketoStatus) => enketoStatus?.edited),
  getEnketoSavingStatus: createSelector(getEnketoStatus, (enketoStatus) => enketoStatus?.saving),
  getEnketoError: createSelector(getEnketoStatus, (enketoStatus) => enketoStatus?.error),

  // services
  getLastChangedDoc: createSelector(getServicesState, (servicesState) => servicesState.lastChangedDoc),

  // reports
  getReportsList: createSelector(getReportsState, (reportsState) => reportsState.reports),
  getListReport: createSelector(getReportsState, (reportsState, props:any={}) => {
    if (!props.id) {
      return;
    }
    if (!reportsState.reportsById.has(props.id)) {
      return;
    }

    return reportsState.reportsById.get(props.id);
  }),
  listContains: createSelector(getReportsState, (reportsState) => {
    return (id) => reportsState.reportsById.has(id);
  }),
  getSelectedReports: createSelector(getReportsState, (reportsState) => reportsState.selected),
  getSelectedReportsSummaries: createSelector(getReportsState, (reportsState) => {
    return reportsState.selected?.map(item => item.formatted || item.summary);
  }),
  getSelectedReportsDocs: createSelector(getReportsState, (reportsState) => {
    return reportsState.selected?.map(item => item.doc || item.summary);
  }),
  getVerifyingReport: createSelector(getReportsState, (reportsState) => reportsState.getVerifyingReport),

  // messages
  getMessagesError: createSelector(getMessagesState, (messagesState) => messagesState.error),
  getSelectedConversation: createSelector(getMessagesState, (messagesState) => messagesState.selected),
  getConversations: createSelector(getMessagesState, (messagesState) => messagesState.conversations),

  // contacts
  getContactsList: createSelector(getContactsState, (contactsState) => contactsState.contacts),
  contactListContains: createSelector(getContactsState, (contactsState) => {
    return (id) => contactsState.contactsById.has(id);
  }),
  // analytics
  getAnalyticsModules: createSelector(getAnalyticsState, (analyticsState) => analyticsState.analyticsModules),

  // target Aggregates
  getTargetAggregates: createSelector(
    getTargetAggregatesState,
    (targetAggregatesState) => targetAggregatesState.targetAggregates
  ),
  getSelectedTargetAggregate: createSelector(
    getTargetAggregatesState,
    (targetAggregatesState) => targetAggregatesState.selected
  ),
  getTargetAggregatesError: createSelector(
    getTargetAggregatesState,
    (targetAggregatesState) => targetAggregatesState.error
  ),
};
/*

// Global

const getUnreadCount = state => getGlobalState(state).unreadCount;

// Analytics
const getSelectedAnalytics = state => getAnalyticsState(state).selected;

// Contacts
const getContactsState = state => state.contacts;
const getContactsLoadingSummary = state => getContactsState(state).loadingSummary;
const getLoadingSelectedContactChildren = state => getContactsState(state).loadingSelectedChildren;
const getLoadingSelectedContactReports = state => getContactsState(state).loadingSelectedReports;
const getSelectedContact = state => getContactsState(state).selected;
const getSelectedContactDoc = reselect.createSelector(
  getSelectedContact,
  selected => selected && selected.doc
);

// Reports
const getReportsState = state => state.reports;
const getSelectedReports = state => getReportsState(state).selected;
const getSelectedReportsValidChecks = reselect.createSelector(
  getSelectedReports,
  selected => selected.map(item => item.summary && item.summary.valid || item.formatted &&
    !(item.formatted.errors && item.formatted.errors.length))
);

// Tasks
const getTasksState = state => state.tasks;
const getSelectedTask = state => getTasksState(state).selected;
const getLoadTasks = state => getTasksState(state).loaded;

angular.module('inboxServices').constant('Selectors', {
  getGlobalState,
  getAndroidAppVersion,
  getUnreadCount,

  getSelectedAnalytics,

  getContactsState,
  getContactsLoadingSummary,
  getLoadingSelectedContactChildren,
  getLoadingSelectedContactReports,
  getSelectedContact,
  getSelectedContactDoc,

  getReportsState,
  getSelectedReportsValidChecks,

  getTasksState,
  getSelectedTask,
  getLoadTasks,
});
*/
