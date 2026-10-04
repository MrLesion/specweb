/**
 * @file Validated key-value storage adapter. The only module that touches localStorage.
 * @module services/storage
 */

/**
 * Read JSON through validation. Corrupt or foreign values fall back, never throw.
 *
 * @param {string} key Storage key.
 * @param {(value: unknown) => string | null} validate Narrow an unknown value to a usable one.
 * @param {{ storageImpl?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> }} [deps] Injected storage for tests.
 * @returns {string | null} Validated value or null.
 */
export function readValidated(key, validate, deps = {}) {
  const storage = deps.storageImpl ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!storage) return null;
  let raw = null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  /** @type {unknown} */
  let parsed = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }
  try {
    return validate(parsed);
  } catch {
    return null;
  }
}

/**
 * Write a JSON value.
 *
 * @param {string} key Storage key.
 * @param {unknown} value Value to persist.
 * @param {{ storageImpl?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> }} [deps] Injected storage for tests.
 * @returns {void}
 */
export function writeJson(key, value, deps = {}) {
  const storage = deps.storageImpl ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}
