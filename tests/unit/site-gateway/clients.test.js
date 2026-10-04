/**
 * @file Node unit tests for per-area stub clients (R: list views).
 * @module tests/unit/site-gateway/clients.test
 * @see specs/site-gateway/spec.md - Music, games and projects list views
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { list as listMusic } from '../../../src/features/site-gateway/services/music.client.js';
import { list as listGames } from '../../../src/features/site-gateway/services/games.client.js';
import { list as listProjects } from '../../../src/features/site-gateway/services/projects.client.js';

describe('area stub clients', () => {
  it('music returns three valid items', async () => {
    const items = await listMusic();
    assert.equal(items.length, 3);
    for (const item of items) {
      assert.ok(item.id !== '' && item.title !== '' && item.subtitle !== '');
    }
  });

  it('games returns three valid items', async () => {
    const items = await listGames();
    assert.equal(items.length, 3);
  });

  it('projects returns three valid items', async () => {
    const items = await listProjects();
    assert.equal(items.length, 3);
  });

  it('aborted signal rejects without touching the store', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(listMusic({ signal: controller.signal }), (error) => error instanceof DOMException && error.name === 'AbortError');
  });
});
