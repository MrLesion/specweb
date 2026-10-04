/**
 * @file Single owner of the projects list state. Actions are past-tense state events.
 * @module features/site-gateway/stores/projects.store
 */

import { createStore } from '../../../state/create-store.js';

/** @type {import('../../../types.js').ListState} */
const initialState = {
  items: {},
  order: [],
  status: 'idle',
  error: null,
};

/**
 * Normalise items into a map plus an ordering array.
 *
 * @param {import('../../../types.js').ListState} state Previous state.
 * @param {unknown} payload Expected shape `{ items: GatewayItem[] }`.
 * @returns {import('../../../types.js').ListState} Next state.
 */
function itemsLoaded(state, payload) {
  const record = /** @type {{ items?: import('../../../types.js').GatewayItem[] }} */ (payload ?? {});
  const list = Array.isArray(record.items) ? record.items : [];
  /** @type {Record<string, import('../../../types.js').GatewayItem>} */
  const items = {};
  for (const item of list) {
    items[item.id] = item;
  }
  return {
    ...state,
    items,
    order: list.map((item) => item.id),
    status: list.length === 0 ? 'empty' : 'ready',
    error: null,
  };
}

/**
 * @param {import('../../../types.js').ListState} state Previous state.
 * @param {unknown} payload Expected shape `{ code: string, message: string }`.
 * @returns {import('../../../types.js').ListState} Next state.
 */
function loadFailed(state, payload) {
  const record = /** @type {{ code?: unknown, message?: unknown }} */ (payload ?? {});
  return {
    ...state,
    status: 'error',
    error: {
      code: typeof record.code === 'string' ? record.code : 'SERVER',
      message: typeof record.message === 'string' ? record.message : 'Loading failed.',
    },
  };
}

export const { getState, subscribe, actions } = createStore(initialState, {
  /**
   * @param {import('../../../types.js').ListState} state Previous state.
   * @returns {import('../../../types.js').ListState} Next state.
   */
  loadingStarted(state) {
    return { ...state, status: 'loading', error: null };
  },
  itemsLoaded,
  loadFailed,
  /**
   * @param {import('../../../types.js').ListState} state Previous state.
   * @returns {import('../../../types.js').ListState} Next state.
   */
  cleared(state) {
    return { ...initialState, status: state.status === 'error' ? 'idle' : state.status };
  },
});

/**
 * Select items in display order. Pure and total: same input, same output.
 *
 * @param {import('../../../types.js').ListState} state Store state.
 * @returns {import('../../../types.js').GatewayItem[]} Ordered items.
 */
export function selectOrderedItems(state) {
  return state.order
    .map((id) => state.items[id])
    .filter((item) => item !== undefined);
}

/**
 * Select whether a retry control applies to the current error.
 *
 * @param {import('../../../types.js').ListState} state Store state.
 * @returns {boolean} True for recoverable NETWORK and TIMEOUT failures.
 */
export function selectCanRetry(state) {
  return state.status === 'error' && (state.error?.code === 'NETWORK' || state.error?.code === 'TIMEOUT');
}
