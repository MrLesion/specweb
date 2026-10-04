/**
 * @file Shared JSDoc typedefs for the site gateway.
 * @module types
 */

/**
 * @typedef {object} GatewayItem
 * @property {string} id Stable identifier of the item.
 * @property {string} title Display title of the item.
 * @property {string} subtitle Display subtitle of the item.
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

/**
 * @typedef {'idle' | 'loading' | 'ready' | 'empty' | 'error'} ListStatus
 */

/**
 * @typedef {object} ListState
 * @property {Record<string, GatewayItem>} items Entities keyed by id.
 * @property {string[]} order Ordered item ids.
 * @property {ListStatus} status Single enum status for the list.
 * @property {{ code: string, message: string } | null} error Last error, if any.
 */

/**
 * @typedef {object} RequestOptions
 * @property {string} [method] HTTP method, defaults to GET.
 * @property {Record<string, unknown>} [body] JSON body for mutations.
 * @property {AbortSignal} [signal] Caller abort signal.
 * @property {number} [timeoutMs] Request timeout in milliseconds.
 */

/**
 * @typedef {object} AppConfig
 * @property {string} apiBaseUrl Base URL for API requests.
 * @property {boolean} debug Debug flag enabling dev-only helpers.
 */
