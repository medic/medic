import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/analytics';

const initialState = {
  selected: null,
  analyticsModules: []
};

const _analyticsReducer = createReducer(
  initialState,
  on(Actions.setAnalyticsModules, (state, { payload: { analyticsModules } }) => {
    return { ...state, analyticsModules };
  }),
);

export function analyticsReducer(state, action) {
  return _analyticsReducer(state, action);
}
