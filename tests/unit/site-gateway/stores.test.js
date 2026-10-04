/**
 * @file Node unit tests for area stores and loading orchestration (R: list async states).
 * @module tests/unit/site-gateway/stores.test
 * @see specs/site-gateway/spec.md - List async states
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { AppError } from '../../../src/utils/app-error.js';
import * as musicStore from '../../../src/features/site-gateway/stores/music.store.js';
import * as gamesStore from '../../../src/features/site-gateway/stores/games.store.js';
import * as projectsStore from '../../../src/features/site-gateway/stores/projects.store.js';
import { loadList } from '../../../src/features/site-gateway/services/load-list.js';

describe('area stores', () => {
  it('normalises loaded items and selects them in order', async () => {
    musicStore.actions.itemsLoaded({
      items: [
        { id: 'b', title: 'B', subtitle: 'Two' },
        { id: 'a', title: 'A', subtitle: 'One' },
      ],
    });
    await Promise.resolve();
    const ordered = musicStore.selectOrderedItems(musicStore.getState());
    assert.deepEqual(ordered.map((item) => item.id), ['b', 'a']);
    assert.equal(musicStore.getState().status, 'ready');
  });

  it('empty payload becomes empty status', async () => {
    gamesStore.actions.itemsLoaded({ items: [] });
    await Promise.resolve();
    assert.equal(gamesStore.getState().status, 'empty');
  });

  it('retry applies to NETWORK but not FORBIDDEN', async () => {
    projectsStore.actions.loadFailed({ code: 'NETWORK', message: 'Offline.' });
    await Promise.resolve();
    assert.equal(projectsStore.selectCanRetry(projectsStore.getState()), true);
    projectsStore.actions.loadFailed({ code: 'FORBIDDEN', message: 'Denied.' });
    await Promise.resolve();
    assert.equal(projectsStore.selectCanRetry(projectsStore.getState()), false);
  });

  it('loadList maps TIMEOUT to a retryable error', async () => {
    const failing = {
      async list() {
        throw new AppError('TIMEOUT', 'Timed out.');
      },
    };
    await loadList(musicStore, failing);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(musicStore.getState().status, 'error');
    assert.equal(musicStore.selectCanRetry(musicStore.getState()), true);
  });

  it('loadList treats aborts as nothing happened', async () => {
    const controller = new AbortController();
    controller.abort();
    const aborting = {
      async list() {
        throw new DOMException('Aborted', 'AbortError');
      },
    };
    musicStore.actions.loadingStarted();
    await loadList(musicStore, aborting, { signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(musicStore.getState().status, 'loading');
  });
});
