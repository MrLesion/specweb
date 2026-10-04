/**
 * @file Minimal intent-based router. Owns title, focus, scroll and mount side effects.
 * @module routes/router
 */

import { areaForPath, matchRouteId } from './match-route.js';

/**
 * @typedef {object} RouterOptions
 * @property {ReadonlyArray<import('../types.js').Route>} routes Route table.
 * @property {HTMLElement} mount Outlet element routes render into.
 * @property {(message: string) => void} [announce] Announce helper for route changes.
 */

/**
 * Create the application router.
 *
 * @param {RouterOptions} options Router options.
 * @returns {{ start: () => void, navigate: (path: string, options?: { replace?: boolean }) => Promise<void> }} Router controls.
 */
export function createRouter(options) {
  const { routes, mount, announce } = options;
  /** @type {string} */
  let current = '';
  /** @type {HTMLElement | null} */
  let currentView = null;
  /** @type {boolean} */
  let started = false;

  /**
   * @param {string} path Path to render.
   * @returns {Promise<void>} Resolves when the view is mounted.
   */
  async function render(path) {
    const matchedId = matchRouteId(path, routes);
    const route = routes.find((entry) => entry.id === matchedId) ?? routes.find((entry) => entry.path === '*');
    if (!route) return;
    if (route.guard !== null) {
      const guards = await import('./guards.js');
      const guard = /** @type {Record<string, (context: unknown) => unknown>} */ (guards)[route.guard];
      if (typeof guard !== 'function' || guard({ path }) !== true) return;
    }
    await route.load();
    if (currentView && typeof /** @type {{ disconnect?: unknown }} */ (currentView).disconnect === 'function') {
      /** @type {{ disconnect: () => void }} */ (currentView).disconnect();
    } else if (currentView) {
      currentView.remove();
    }
    mount.replaceChildren();
    document.title = route.title;
    const view = document.createElement(route.element);
    mount.append(view);
    currentView = /** @type {HTMLElement} */ (view);
    current = path;
    const header = document.querySelector('app-site-header');
    if (header) header.setAttribute('current-area', areaForPath(path));
    if (typeof mount.focus === 'function') mount.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    if (started && announce) announce(route.title);
  }

  /**
   * Navigate by intent, not by URL parsing at call sites.
   *
   * @param {string} path Path to navigate to.
   * @param {{ replace?: boolean }} [navOptions] Navigation options.
   * @returns {Promise<void>} Resolves when the view is mounted.
   */
  async function navigate(path, navOptions = {}) {
    if (navOptions.replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    await render(path);
  }

  return {
    /**
     * Start routing: render the current location, then listen for changes.
     *
     * @returns {void}
     */
    start() {
      started = true;
      void render(window.location.pathname);
      window.addEventListener('popstate', () => {
        void render(window.location.pathname);
      });
      document.addEventListener('click', (event) => {
        const target = /** @type {HTMLElement | null} */ (event.target);
        const anchor = target?.closest ? target.closest('a[href]') : null;
        if (!anchor) return;
        const href = anchor.getAttribute('href') ?? '';
        if (!href.startsWith('/')) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        void navigate(href);
      });
    },
    navigate,
  };
}

/**
 * @returns {string} Current path, exposed for tests.
 */
export function currentPathForTest() {
  return current;
}

