/**
 * @file Shared application constants for the site gateway.
 * @module constants
 */

/** @type {ReadonlyArray<{ id: string, path: string, title: string, blurb: string }>} */
export const GATEWAY_AREAS = Object.freeze([
  { id: 'music', path: '/music', title: 'Music', blurb: 'Listen to tracks.' },
  { id: 'games', path: '/games', title: 'Games', blurb: 'Play games.' },
  { id: 'projects', path: '/projects', title: 'Projects', blurb: 'Browse projects.' },
]);

/** @type {string} */
export const THEME_STORAGE_KEY = 'app.ui.theme';

/** @type {number} */
export const DEFAULT_REQUEST_TIMEOUT_MS = 8000;
