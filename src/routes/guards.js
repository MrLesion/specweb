/**
 * @file Route guards for the site gateway. Pure functions returning navigation decisions.
 * @module routes/guards
 */

/**
 * Public routes need no guard; kept as an explicit export for contract clarity.
 *
 * @param {{ path: string }} _context Navigation context (unused, all routes public).
 * @returns {boolean} Always true.
 */
export function publicRoute(_context) {
  return true;
}
