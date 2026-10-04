/**
 * @file Data loading orchestration for one area list. Stores never call fetch directly.
 * @module features/site-gateway/services/load-list
 */

import { AppError } from '../../../utils/app-error.js';

/**
 * Load items through a client into a store, mapping errors to store actions.
 *
 * @param {{ actions: { loadingStarted: () => void, itemsLoaded: (payload: unknown) => void, loadFailed: (payload: unknown) => void } }} store Store actions to dispatch.
 * @param {{ list: (options?: { signal?: AbortSignal }) => Promise<import('../../../types.js').GatewayItem[]> }} client Feature client with a list operation.
 * @param {{ signal?: AbortSignal }} [options] Optional abort signal.
 * @returns {Promise<void>} Resolves when the store reflects the outcome.
 */
export async function loadList(store, client, options = {}) {
  store.actions.loadingStarted();
  try {
    const items = await client.list({ signal: options.signal });
    store.actions.itemsLoaded({ items });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (options.signal?.aborted) return;
    const code = error instanceof AppError ? error.code : 'SERVER';
    const message = error instanceof Error ? error.message : 'Loading failed.';
    store.actions.loadFailed({ code, message });
  }
}
