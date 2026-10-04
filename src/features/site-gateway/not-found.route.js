/**
 * @file Route declaration for the not-found view. Data only: no rendering, no fetching.
 * @module features/site-gateway/not-found.route
 */

/**
 * @typedef {object} Route
 * @property {string} id Stable identifier, matching the contract entry.
 * @property {string} path URL pattern with `:param` segments only.
 * @property {string} title Document title for this route.
 * @property {string} element Tag name of the view element.
 * @property {string | null} guard Export name from src/routes/guards.js, or null.
 * @property {() => Promise<unknown>} load Dynamic import of the view; lazy by default.
 * @property {string} spec Feature id of the spec this route implements.
 */

/** @type {Route} */
export const route = {
  id: 'not-found',
  path: '*',
  title: 'Page not found',
  element: 'app-not-found',
  guard: null,
  load: () => import('./not-found.element.js'),
  spec: 'site-gateway',
};
