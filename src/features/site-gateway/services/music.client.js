/**
 * @file Music client. Stub for v1: returns three frozen dummy items through the shared validator.
 * @module features/site-gateway/services/music.client
 */

import { freezeItems, validateItemList } from '../utils/item-list.js';

/** @type {import('../../../types.js').GatewayItem[]} */
const DUMMY_ITEMS = freezeItems([
  { id: 'music-1', title: 'Morning static', subtitle: 'Field recordings Vol. 1' },
  { id: 'music-2', title: 'Night bus', subtitle: 'Synth sketches' },
  { id: 'music-3', title: 'Paper planes', subtitle: 'Acoustic demos' },
]);

/**
 * List music items.
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
