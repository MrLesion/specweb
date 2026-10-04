/**
 * @file Runtime configuration. Reads server-injected config once and freezes it.
 * @module app/config
 */

import { AppError } from '../utils/app-error.js';

/**
 * Read and validate runtime configuration.
 *
 * @param {{ apiBaseUrl?: unknown, debug?: unknown }} [injected] Injected config, defaults to window global.
 * @returns {import('../types.js').AppConfig} Frozen configuration.
 * @throws {AppError} CONFIG_INVALID when required keys are missing or mistyped.
 */
export function readConfig(injected) {
  const source = injected ?? /** @type {{ __APP_CONFIG__?: unknown }} */ (globalThis).__APP_CONFIG__ ?? {};
  const record = /** @type {Record<string, unknown>} */ (source);
  const apiBaseUrl = typeof record.apiBaseUrl === 'string' && record.apiBaseUrl !== '' ? record.apiBaseUrl : '/api';
  const debug = record.debug === true;
  return Object.freeze({ apiBaseUrl, debug });
}
