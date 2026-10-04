/**
 * @file Application bootstrap. Ordered sequence only: handlers, config, elements, router, global.
 * @module main
 */

import { readConfig } from './app/config.js';
import { installErrorHandlers } from './app/error-boundary.js';
import { defineSharedElements } from './app/register-elements.js';
import { createRouter } from './routes/router.js';
import { routes } from './routes/registry.js';
import { createTheme } from './services/theme.js';

installErrorHandlers();
const config = readConfig();
await defineSharedElements();
const theme = createTheme();
theme.init();
const router = createRouter({
  routes,
  mount: /** @type {HTMLElement} */ (document.querySelector('#outlet')),
  announce: (title) => {
    const status = document.querySelector('#app-status');
    if (status) status.textContent = title;
  },
});
router.start();
window.app = Object.freeze({ router, config, theme });
