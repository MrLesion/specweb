/**
 * @file Shared item-list validator for music, games and projects.
 * @module site-gateway/utils/item-list
 */

import { AppError } from '../../../utils/app-error.js';

/**
 * Validate one unknown value as a gateway item. Unknown fields are dropped.
 *
 * @param {unknown} value Wire value to validate.
 * @param {string} [path] Path used in PARSE errors.
 * @returns {import('../../../types.js').GatewayItem} Validated domain item.
 * @throws {AppError} PARSE when a required field is missing or mistyped.
 */
export function toGatewayItem(value, path = 'items') {
  if (typeof value !== 'object' || value === null) {
    throw new AppError('PARSE', `Gateway item at ${path} was not an object.`);
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  if (typeof record.id !== 'string' || record.id === '') {
    throw new AppError('PARSE', `Gateway item at ${path} is missing id.`);
  }
  if (typeof record.title !== 'string' || record.title === '') {
    throw new AppError('PARSE', `Gateway item at ${path} is missing title.`);
  }
  if (typeof record.subtitle !== 'string' || record.subtitle === '') {
    throw new AppError('PARSE', `Gateway item at ${path} is missing subtitle.`);
  }
  return {
    id: record.id,
    title: record.title,
    subtitle: record.subtitle,
  };
}

/**
 * Validate a wire list into domain items.
 *
 * @param {unknown} value Wire value to validate.
 * @returns {import('../../../types.js').GatewayItem[]} Validated items.
 * @throws {AppError} PARSE when the body is not an array or an item is invalid.
 */
export function validateItemList(value) {
  if (!Array.isArray(value)) {
    throw new AppError('PARSE', 'Gateway list response was not an array.');
  }
  return value.map((entry, index) => toGatewayItem(entry, `items[${index}]`));
}

/**
 * @param {import('../../../types.js').GatewayItem[]} items Items to freeze for stub clients.
 * @returns {import('../../../types.js').GatewayItem[]} Frozen copy safe to share.
 */
export function freezeItems(items) {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}
