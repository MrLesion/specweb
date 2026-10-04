/**
 * @file Node unit tests for transport, storage and theme (R: theme preference, async states).
 * @module tests/unit/site-gateway/services.test
 * @see specs/site-gateway/spec.md - Light and dark theme preference
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { AppError } from '../../../src/utils/app-error.js';
import { request } from '../../../src/services/http.js';
import { readValidated, writeJson } from '../../../src/services/storage.js';
import { createTheme, defaultTheme, resolveTheme } from '../../../src/services/theme.js';
import { areaForPath, matchRouteId } from '../../../src/routes/match-route.js';
import { readConfig } from '../../../src/app/config.js';

/**
 * @param {unknown} value Response body.
 * @param {{ status?: number, ok?: boolean }} [meta] Response metadata.
 * @returns {typeof fetch} Stub fetch implementation.
 */
function stubFetch(value, meta = {}) {
  return (async () => ({
    ok: meta.ok ?? true,
    status: meta.status ?? 200,
    async json() {
      if (value instanceof Error) throw value;
      return value;
    },
  })) ;
}

describe('transport and storage', () => {
  it('maps 404 to NOT_FOUND', async () => {
    await assert.rejects(
      request('/missing', {}, { fetchImpl: stubFetch({}, { ok: false, status: 404 }), delayImpl: async () => {} }),
      (error) => error instanceof AppError && error.code === 'NOT_FOUND',
    );
  });

  it('retries GET on 503 then succeeds', async () => {
    let calls = 0;
    const flaky = (async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 503, async json() { return {}; } };
      return { ok: true, status: 200, async json() { return []; } };
    });
    const body = await request('/items', {}, { fetchImpl: flaky, delayImpl: async () => {} });
    assert.deepEqual(body, []);
    assert.equal(calls, 2);
  });

  it('maps malformed JSON to PARSE', async () => {
    await assert.rejects(
      request('/items', {}, { fetchImpl: stubFetch(new Error('bad json')), delayImpl: async () => {} }),
      (error) => error instanceof AppError && error.code === 'PARSE',
    );
  });

  it('corrupt storage falls back to null', () => {
    const storage = new Map();
    storage.set('app.ui.theme', '!!!not-json{{{');
    const storageImpl = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, String(value)); },
      removeItem: (key) => { storage.delete(key); },
    };
    const value = readValidated('app.ui.theme', (input) => (input === 'dark' ? 'dark' : null), { storageImpl });
    assert.equal(value, null);
    writeJson('app.ui.theme', 'dark', { storageImpl });
    assert.equal(storage.get('app.ui.theme'), '"dark"');
  });

  it('theme falls back to OS default and toggles', () => {
    const storage = new Map();
    const storageImpl = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, String(value)); },
      removeItem: (key) => { storage.delete(key); },
    };
    assert.equal(defaultTheme({ matchMediaImpl: () => ({ matches: true }) }), 'dark');
    assert.equal(resolveTheme({ storageImpl, matchMediaImpl: () => ({ matches: false }) }), 'light');
    const theme = createTheme({ storageImpl, matchMediaImpl: () => ({ matches: false }) });
    assert.equal(theme.init(), 'light');
    assert.equal(theme.toggle(), 'dark');
  });
});

describe('routing helpers and config', () => {
  it('matches exact routes before the catch-all', () => {
    const routes = [
      { id: 'music', path: '/music' },
      { id: 'not-found', path: '*' },
    ];
    assert.equal(matchRouteId('/music', routes), 'music');
    assert.equal(matchRouteId('/nope', routes), 'not-found');
    assert.equal(areaForPath('/games'), 'games');
    assert.equal(areaForPath('/'), '');
  });

  it('readConfig defaults the base URL', () => {
    assert.equal(readConfig({}).apiBaseUrl, '/api');
  });
});
