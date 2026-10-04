/**
 * @file Pure route matching for the site gateway. No DOM access, no fetching.
 * @module routes/match-route
 */

/**
 * Match a pathname against gateway routes. Exact match wins, catch-all last.
 *
 * @param {string} pathname Pathname such as `/music`.
 * @param {ReadonlyArray<{ id: string, path: string }>} routes Routes to match.
 * @returns {string | null} Matching route id, or null when nothing matches.
 */
export function matchRouteId(pathname, routes) {
  const normalised = pathname === '' ? '/' : pathname;
  for (const route of routes) {
    if (route.path !== '*' && route.path === normalised) return route.id;
  }
  const fallback = routes.find((route) => route.path === '*');
  return fallback ? fallback.id : null;
}

/**
 * Area id for header current-page state.
 *
 * @param {string} pathname Pathname such as `/games`.
 * @returns {string} Area id or empty string for home and unknown paths.
 */
export function areaForPath(pathname) {
  if (pathname === '/music' || pathname === '/games' || pathname === '/projects') {
    return pathname.slice(1);
  }
  return '';
}
