/**
 * @file Application error with a stable code the UI can branch on.
 * @module utils/app-error
 */

/**
 * Stable error codes from architecture/data-access.md.
 *
 * @typedef {'NETWORK' | 'TIMEOUT' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'RATE_LIMITED' | 'SERVER' | 'PARSE' | 'OFFLINE' | 'CONFIG_INVALID'} AppErrorCode
 */
export class AppError extends Error {
  /** @type {AppErrorCode} */
  code;

  /** @type {number | undefined} */
  status;

  /** @type {Record<string, string> | undefined} */
  fields;

  /**
   * @param {AppErrorCode} code Stable error code.
   * @param {string} [message] Human-readable message, never shown verbatim to users.
   * @param {{ cause?: unknown, status?: number, fields?: Record<string, string> }} [meta] Extra context.
   */
  constructor(code, message, meta = {}) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    if (meta.status !== undefined) this.status = meta.status;
    if (meta.fields !== undefined) this.fields = meta.fields;
    if (meta.cause !== undefined) this.cause = meta.cause;
  }
}
