/**
 * @file HTTP transport. The only place fetch appears: timeouts, retries, error codes.
 * @module services/http
 */

import { DEFAULT_REQUEST_TIMEOUT_MS } from '../constants.js';
import { AppError } from '../utils/app-error.js';

/** @type {number} */
const MAX_ATTEMPTS = 3;

/**
 * @param {number} attempt One-based attempt number.
 * @returns {number} Backoff delay in milliseconds with jitter.
 */
function backoffMs(attempt) {
  return Math.min(1000 * 2 ** (attempt - 1), 4000) + Math.floor(Math.random() * 100);
}

/**
 * @param {number} status HTTP status.
 * @returns {AppError} Mapped error.
 */
function errorForStatus(status) {
  if (status === 401) return new AppError('UNAUTHORIZED', 'Sign-in required.', { status });
  if (status === 403) return new AppError('FORBIDDEN', 'Not allowed.', { status });
  if (status === 404) return new AppError('NOT_FOUND', 'Not found.', { status });
  if (status === 409) return new AppError('CONFLICT', 'Conflict.', { status });
  if (status === 422) return new AppError('VALIDATION', 'Invalid input.', { status });
  if (status === 429) return new AppError('RATE_LIMITED', 'Too many requests.', { status });
  return new AppError('SERVER', 'Server error.', { status });
}

/**
 * Send a JSON request and return the parsed body.
 *
 * @param {string} path Path under the configured base URL, never an absolute URL.
 * @param {import('../types.js').RequestOptions} [options] Request options.
 * @param {{ fetchImpl?: typeof fetch, baseUrl?: string, randomImpl?: () => number, delayImpl?: (ms: number) => Promise<void> }} [deps] Injected dependencies for tests.
 * @returns {Promise<unknown>} Parsed response body.
 * @throws {AppError} NETWORK, TIMEOUT, OFFLINE, PARSE or the mapped HTTP code.
 */
export async function request(path, options = {}, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const baseUrl = deps.baseUrl ?? '';
  const randomImpl = deps.randomImpl ?? Math.random;
  const delayImpl = deps.delayImpl ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  void randomImpl;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new AppError('OFFLINE', 'Device is offline.');
  }
  const method = options.method ?? 'GET';
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const url = `${baseUrl}${path}`;
  if (baseUrl !== '' && !url.startsWith(baseUrl)) {
    throw new AppError('CONFIG_INVALID', 'Request escaped the base URL.');
  }
  /** @type {unknown} */
  let lastError = new AppError('NETWORK', 'Network error.');
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method,
        headers: options.body ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'same-origin',
        signal: options.signal ?? controller.signal,
      });
      clearTimeout(timer);
      if (response.status === 204) return undefined;
      if (response.ok) {
        try {
          return await response.json();
        } catch (error) {
          throw new AppError('PARSE', 'Response was not JSON.', { cause: error });
        }
      }
      const retryable = method === 'GET' && (response.status === 502 || response.status === 503 || response.status === 504);
      if (retryable && attempt < MAX_ATTEMPTS) {
        await delayImpl(backoffMs(attempt));
        continue;
      }
      throw errorForStatus(response.status);
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof AppError) throw error;
      if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppError('TIMEOUT', 'Request timed out.');
      }
      lastError = new AppError('NETWORK', 'Network error.', { cause: error });
      const retryable = (method === 'GET' || method === 'HEAD') && attempt < MAX_ATTEMPTS;
      if (!retryable) throw lastError;
      await delayImpl(backoffMs(attempt));
    }
  }
  throw lastError;
}
