/**
 * @file Route declaration for the projects list view. Data only: no rendering, no fetching.
 * @module features/site-gateway/projects.route
 */

/**
 * @typedef {object} Route
 * @property {string} id Stable identifier, matching the contract entry.
 * @property {string} path URL pattern with `:param` segments only.
 * @property {string} title Document title for this route.
 * @property {string} element Tag name of the view element.
 * @property {string | null} guard Export name from src/routes/guards.js, or null.
 * @property {string} spec Feature id of the spec this route implements.
 */

/** @type {Route} */
export const route = {
  id: 'projects',
  path: '/projects',
  title: 'Projects',
  element: 'app-projects-view',
  guard: null,
  load: () => import('./projects.element.js'),
  spec: 'site-gateway',
};
