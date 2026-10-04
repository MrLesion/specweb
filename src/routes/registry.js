/**
 * @file Route table composed from feature route modules.
 * @module routes/registry
 */

import { route as gateway } from '../features/site-gateway/gateway.route.js';
import { route as music } from '../features/site-gateway/music.route.js';
import { route as games } from '../features/site-gateway/games.route.js';
import { route as projects } from '../features/site-gateway/projects.route.js';
import { route as notFound } from '../features/site-gateway/not-found.route.js';

/** @type {ReadonlyArray<import('../types.js').Route>} */
export const routes = Object.freeze([gateway, music, games, projects, notFound]);
