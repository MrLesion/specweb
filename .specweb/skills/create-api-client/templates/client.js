/**
 * @file API client for <resource>. The only place this feature talks to the network: validates every
 * response, maps it to domain objects, and lets AppError codes cross the boundary unchanged.
 * @module features/<id>/services/<name>.client
 */

import { request } from '../../../services/http.js';
import { AppError } from '../../../services/app-error.js';

/**
 * @typedef {import('../../../types.js').<Domain>} <Domain>
 */

/**
 * Shape guard: unknown fields are dropped, missing required fields are a PARSE error (D3).
 *
 * @param {unknown} value
 * @returns {<Domain>}
 * @throws {AppError} PARSE when the wire shape is not what the client requires
 */
function toDomain(value) {
  if (typeof value !== 'object' || value === null) {
    throw new AppError('PARSE', '<name> response was not an object');
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  if (typeof record.id !== 'string' || typeof record.title !== 'string') {
    throw new AppError('PARSE', '<name> response is missing id or title');
  }
  return {
    id: record.id,
    title: record.title,
    // Dates are converted here, once, so no component parses a wire format.
    updatedAt: typeof record.updated_at === 'string' ? new Date(record.updated_at) : null,
  };
}

/** @type {Map<string, <Domain>[]>} Server state cache, owned by this client. */
const listCache = new Map();

/**
 * List <resource>.
 *
 * @param {string} scopeId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<<Domain>[]>}
 * @throws {AppError} NETWORK, TIMEOUT, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, SERVER, PARSE
 */
export async function list(scopeId, options = {}) {
  const body = await request(`/scopes/${encodeURIComponent(scopeId)}/<resources>`, {
    signal: options.signal,
  });
  if (!Array.isArray(body)) throw new AppError('PARSE', '<name> list response was not an array');
  const items = body.map(toDomain);
  listCache.set(scopeId, items);
  return items;
}

/**
 * Create a <resource>. Invalidates the affected list (D4).
 *
 * @param {string} scopeId
 * @param {{ title: string }} input
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<<Domain>>}
 * @throws {AppError} VALIDATION when the server rejects the input, plus the codes above
 */
export async function create(scopeId, input, options = {}) {
  const body = await request(`/scopes/${encodeURIComponent(scopeId)}/<resources>`, {
    method: 'POST',
    body: { title: input.title },
    signal: options.signal,
  });
  const created = toDomain(body);
  invalidate(scopeId);
  return created;
}

/**
 * Drop cached reads for a scope. Called by mutations and on session end.
 *
 * @param {string} scopeId
 * @returns {void}
 */
export function invalidate(scopeId) {
  listCache.delete(scopeId);
}

/**
 * Read the cache without a request. Returns undefined when the entry is absent.
 *
 * @param {string} scopeId
 * @returns {<Domain>[] | undefined}
 */
export function cached(scopeId) {
  return listCache.get(scopeId);
}
