/**
 * @file Projects client. Stub for v1: returns three frozen dummy items through the shared validator.
 * @module features/site-gateway/services/projects.client
 */

import { freezeItems, validateItemList } from '../utils/item-list.js';

/** @type {import('../../../types.js').GatewayItem[]} */
const DUMMY_ITEMS = freezeItems([
  { id: 'projects-1', title: 'Gateway site', subtitle: 'This website' },
  { id: 'projects-2', title: 'Zine archive', subtitle: 'Scanned issues' },
  { id: 'projects-3', title: 'Garden notes', subtitle: 'Season log' },
]);

/**
 * List project items.
 *
 * @param {{ signal?: AbortSignal }} [options] Optional abort signal.
 * @returns {Promise<import('../../../types.js').GatewayItem[]>} Validated items.
 */
export async function list(options = {}) {
  if (options.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  return validateItemList(DUMMY_ITEMS);
}
