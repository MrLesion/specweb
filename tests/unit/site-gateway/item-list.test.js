/**
 * @file Node unit tests for the shared item-list validator (R: shared item contract).
 * @module tests/unit/site-gateway/item-list.test
 * @see specs/site-gateway/spec.md - Shared item contract
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { AppError } from '../../../src/utils/app-error.js';
import { freezeItems, toGatewayItem, validateItemList } from '../../../src/features/site-gateway/utils/item-list.js';

describe('validateItemList', () => {
  it('accepts id, title and subtitle', () => {
    const items = validateItemList([{ id: 'a', title: 'A', subtitle: 'B' }]);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'A');
  });

  it('drops unknown fields', () => {
    const items = validateItemList([{ id: 'a', title: 'A', subtitle: 'B', cover: 'x' }]);
    assert.deepEqual(Object.keys(items[0]).sort(), ['id', 'subtitle', 'title']);
  });

  it('rejects missing subtitle as PARSE', () => {
    assert.throws(() => validateItemList([{ id: 'a', title: 'A' }]), (error) => error instanceof AppError && error.code === 'PARSE');
  });

  it('rejects a non-array body as PARSE', () => {
    assert.throws(() => validateItemList({}), (error) => error instanceof AppError && error.code === 'PARSE');
  });

  it('rejects a non-object entry as PARSE', () => {
    assert.throws(() => toGatewayItem(null), (error) => error instanceof AppError && error.code === 'PARSE');
  });

  it('freezes stub items', () => {
    const items = freezeItems([{ id: 'a', title: 'A', subtitle: 'B' }]);
    assert.ok(Object.isFrozen(items));
    assert.ok(Object.isFrozen(items[0]));
  });
});
