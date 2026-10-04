/**
 * @file Theme preference: OS default, explicit choice persisted, corrupt values fall back.
 * @module services/theme
 */

import { THEME_STORAGE_KEY } from '../constants.js';
import { readValidated, writeJson } from './storage.js';

/**
 * Narrow an unknown stored value to a theme.
 *
 * @param {unknown} value Unknown stored value.
 * @returns {string | null} Usable theme or null.
 */
function validateTheme(value) {
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * Resolve the default theme from the operating-system preference.
 *
 * @param {{ matchMediaImpl?: (query: string) => { matches: boolean } }} [deps] Injected matcher for tests.
 * @returns {string} Default theme.
 */
export function defaultTheme(deps = {}) {
  const matcher = deps.matchMediaImpl ?? (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null);
  try {
    if (matcher && matcher('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    return 'light';
  }
  return 'light';
}

/**
 * Resolve the active theme: stored choice wins, otherwise the OS default.
 *
 * @param {{ storageImpl?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, matchMediaImpl?: (query: string) => { matches: boolean } }} [deps] Injected dependencies for tests.
 * @returns {string} Active theme.
 */
export function resolveTheme(deps = {}) {
  return readValidated(THEME_STORAGE_KEY, validateTheme, deps) ?? defaultTheme(deps);
}

/**
 * Create the theme controller used by the header toggle.
 *
 * @param {{ storageImpl?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, matchMediaImpl?: (query: string) => { matches: boolean }, documentImpl?: Document }} [deps] Injected dependencies for tests.
 * @returns {{ init: () => string, toggle: () => string, subscribe: (listener: (theme: string) => void) => () => void }} Theme controller.
 */
export function createTheme(deps = {}) {
  /** @type {Set<(theme: string) => void>} */
  const listeners = new Set();
  /** @type {string} */
  let current = 'light';

  /**
   * @param {string} theme Theme to apply.
   * @returns {void}
   */
  function apply(theme) {
    current = theme;
    try {
      deps.documentImpl?.documentElement.setAttribute('data-theme', theme);
    } catch {
      return;
    }
    if (typeof document !== 'undefined' && !deps.documentImpl) {
      document.documentElement.setAttribute('data-theme', theme);
    }
    for (const listener of [...listeners]) {
      listener(theme);
    }
  }

  return {
    /**
     * Initialise from storage or the OS default.
     *
     * @returns {string} Active theme.
     */
    init() {
      const theme = resolveTheme(deps);
      apply(theme);
      return theme;
    },
    /**
     * Flip the theme and persist the choice.
     *
     * @returns {string} Next theme.
     */
    toggle() {
      const next = current === 'dark' ? 'light' : 'dark';
      writeJson(THEME_STORAGE_KEY, next, deps);
      apply(next);
      return next;
    },
    /**
     * @param {(theme: string) => void} listener Theme listener.
     * @returns {() => void} Unsubscribe function.
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
