# Architecture — Data Access

**Scope.** Everything that leaves the browser. One transport module, one client per feature, one
error taxonomy, and explicit caching. No component, store or util ever calls `fetch` directly.

**Enforced by.** `architecture/data-access.md` review rules (`skills/verify-architecture`),
`tools/validate-architecture.mjs` layer rules (`ARCH-002`, `ARCH-004`), Article VI.

## The transport module

`src/services/http.js` is the only place `fetch` appears. It owns the request pipeline so that every
request inherits the same behaviour:

```js
/**
 * @param {string} path
 * @param {import('../../types.js').RequestOptions} [options]
 * @returns {Promise<unknown>} parsed response body
 * @throws {AppError} always an AppError: network, timeout, http or parse
 */
export async function request(path, options = {}) { /* pipeline below */ }
```

| Step | Behaviour |
| --- | --- |
| 1. URL | Prefix `config.apiBaseUrl`; validate that the result starts with the base URL (no absolute URL from callers). |
| 2. Headers | `Accept: application/json`; `Content-Type` only when a body exists; `Authorization` from the credential provider; `X-Request-Id` per request. |
| 3. Credentials | `credentials: 'same-origin'`; the session cookie travels automatically and is never read by JS. |
| 4. Body | `JSON.stringify` for objects; never a pre-serialised string from a caller. |
| 5. Abort/timeout | A linked `AbortSignal` with a default timeout; caller signals are combined, not replaced. |
| 6. Retry | Idempotent methods only (`GET`/`HEAD`), on network error or `502/503/504`, with exponential backoff plus jitter, max 3 attempts, respecting `Retry-After`. |
| 7. Status | `2xx` → parse; `204` → `undefined`; anything else → `AppError` with code from the taxonomy. |
| 8. Parse | `response.json()` inside `try`; a non-JSON success body is a `PARSE` error, not a silent `undefined`. |
| 9. Redaction | Request bodies are never logged whole; known-sensitive keys are redacted before any log line. |

Every step is testable in isolation because the pipeline is a pure function of `(path, options,
deps)` with `fetch` injected.

## Error taxonomy

Everything thrown across the boundary is an `AppError` with a stable `code`, so UI can branch on
codes rather than on message strings.

```js
export class AppError extends Error {
  /** @param {string} code @param {string} [message] @param {{ cause?: unknown, status?: number, fields?: Record<string,string> }} [meta] */
  constructor(code, message, meta) { super(message ?? code, meta); this.name = 'AppError'; this.code = code; /* ... */ }
}
```

| Code | Meaning | UI response |
| --- | --- | --- |
| `NETWORK` | Request never completed | Retry affordance, offline banner |
| `TIMEOUT` | Aborted by the timeout | Retry affordance |
| `UNAUTHORIZED` | `401` | Clear session, route to sign-in with `next` |
| `FORBIDDEN` | `403` | Permission message, no retry |
| `NOT_FOUND` | `404` | Empty-state / not-found view |
| `CONFLICT` | `409` | Re-sync, explain the conflict |
| `VALIDATION` | `422` with field errors | Inline field errors (see `forms.md`) |
| `RATE_LIMITED` | `429` | Disable action, show `Retry-After` |
| `SERVER` | `5xx` (after retries) | Generic error, keep the user's input |
| `PARSE` | Body was not the expected shape | Generic error, log the shape mismatch |
| `OFFLINE` | `navigator.onLine === false` before sending | Queue or block the action explicitly |

A raw `Response`, a raw `TypeError`, or a message string never crosses a module boundary.

## Feature clients

Each feature owns a client for the endpoints it calls and nothing else:

```js
/** @param {string} boardId @returns {Promise<import('...').Task[]>} */
export async function list(boardId) {
  const body = await request(`/boards/${encodeURIComponent(boardId)}/tasks`);
  return validateTaskList(body); // never trust the wire shape
}
```

- Responses are **validated and mapped** to app types at this boundary. Unknown fields are dropped,
  missing required fields raise `PARSE` with the offending path, and dates are converted once.
- Client functions are named after the resource operation (`list`, `get`, `create`, `update`,
  `remove`), take typed arguments, and return domain objects — never envelopes, never `Response`.
- Concurrency is the caller's problem: clients accept an `AbortSignal` and pass it through.

## Caching and invalidation

- Cache lives in the service layer, keyed by `(method, url, params)`, and is explicitly invalidated:
  `create`/`update`/`remove` invalidate the collections they touch.
- Reads may be served from cache while revalidating; the store decides what to render with
  `status: 'loading'` and a stale flag, not the cache.
- A cache entry is never shared between users: it is cleared on sign-out and on user switch.
- No cache hits for `UNAUTHORIZED` or `FORBIDDEN` responses.

## Rules

| ID | Rule |
| --- | --- |
| D1 | `fetch` appears only in `src/services/`. |
| D2 | Everything thrown across the boundary is an `AppError` with a code. |
| D3 | Every response is validated at the client boundary before it reaches a store. |
| D4 | Every mutation invalidates the reads it affects, explicitly. |
| D5 | All requests are cancellable via `AbortSignal`, and cancellation is not an error. |
| D6 | Credentials are never read by JS; the cookie is the session. |
| D7 | No secrets, tokens or PII in logs, URLs or error messages. |

## Anti-patterns

- `fetch()` in a store or a component "because the client was one extra file".
- Turning `Response.ok` into a boolean and losing the status code the UI needs.
- Building the full URL in the caller, which silently escapes the base URL validation.
- Trusting the server shape and deep-accessing `body.items[0].id` — one renamed field away from a
  white screen.
- Retrying a `POST` because it "felt transient"; that is how duplicate orders are created.
