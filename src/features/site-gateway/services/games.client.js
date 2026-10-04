/**
 * @file Games client. Stub for v1: returns three frozen dummy items through the shared validator.
 * @module features/site-gateway/services/games.client
 */

import { freezeItems, validateItemList } from '../utils/item-list.js';

/** @type {import('../../../types.js').GatewayItem[]} */
const DUMMY_ITEMS = freezeItems([
  { id: 'games-1', title: 'Tiny dungeon', subtitle: 'Roguelike prototype' },
  { id: 'games-2', title: 'Orbit hop', subtitle: 'Arcade puzzler' },
  { id: 'games-3', title: 'Cardboard castle', subtitle: 'Cozy builder' },
]);

/**
 * List game items.
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
