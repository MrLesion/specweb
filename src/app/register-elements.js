/**
 * @file Shared custom element definitions. Runs once at boot before routing.
 * @module app/register-elements
 */

/**
 * Define shared custom elements once.
 *
 * @returns {Promise<void>} Resolves when shared elements are defined.
 */
export async function defineSharedElements() {
  await import('../features/site-gateway/components/site-header.component.js');
}
