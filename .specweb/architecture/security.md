# Architecture — Security

**Scope.** The browser is a hostile execution environment and the network is untrusted. This document
defines the trust boundaries, the encoding rules, the credential model and the review checklist.

**Enforced by.** Article VI; `tools/validate-architecture.mjs` (`ARCH-005`, `ARCH-006`);
`tools/validate-components.mjs` (`CMP-015`); `skills/verify-architecture/SKILL.md` (checklist).

## Trust boundaries

| Boundary | Untrusted input | Control |
| --- | --- | --- |
| Server → client | Response bodies, headers, error payloads | Validate and map at the client boundary (`data-access.md`, D3) |
| URL → app | Path params, query string, hash | Validate before use; never build HTML or CSS from them |
| Storage → app | `localStorage`, cookies, cache entries | Treat as attacker-controlled; validate on read |
| Third party → page | Scripts, fonts, images, iframes, embeds | SRI, CSP, sandboxing, allowlists |
| User → server | Form values, files, ids | Validated server-side too; client validation is UX, not security |
| Message → app | `postMessage`, service-worker messages, `storage` events | Check `event.origin` and shape; never trust the payload |

## Output encoding

- Data reaches the DOM through `textContent`, `setAttribute` with a validated value, or
  `replaceChildren`. Assigning data to `innerHTML`, `outerHTML` or `insertAdjacentHTML` fails
  `CMP-015` (Article VI).
- The only permitted `innerHTML` use is a compile-time constant string with no interpolation
  (`components.md`). Template literals containing an interpolation are data and are forbidden there.
- URL sinks accept only relative paths or `https:` URLs produced by the app — never a value from the
  server or the query string. `javascript:` and `data:` are rejected by an allowlist check.
- CSS values from data are restricted to a token allowlist; interpolating into a `style` attribute is
  forbidden, because `url()` and legacy `expression()` make it an XSS vector.
- `document.write`, `eval`, `new Function`, `setTimeout` with a string body, and dynamic
  `<script>`/`<link>` creation are forbidden outright.
- **Trusted Types** is required in production: `require-trusted-types-for 'script'`, with a policy
  limited to the static-template helper. Any new sink is a reviewable event.

## Content Security Policy

Production ships a policy with no inline code and no broad sources:

```
default-src 'none';
script-src 'self' 'nonce-<per-response>' 'strict-dynamic';
style-src 'self';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'none';
form-action 'self';
object-src 'none';
require-trusted-types-for 'script';
upgrade-insecure-requests;
```

`unsafe-inline` and `unsafe-eval` are never acceptable, including "temporarily". Because inline
`<style>` and `style="..."` do not work under `style-src 'self'`, styles ship as constructable
stylesheets or self-hosted files (`styling.md`).

## Credentials and sessions

- Session material lives in an `HttpOnly; Secure; SameSite=Lax` (or `Strict`) cookie. JavaScript never
  reads, writes or stores a token: not in `localStorage`, not in `sessionStorage`, not in memory
  beyond a request's lifetime, and never in a URL.
- Cross-site state-changing requests are CSRF-protected (double-submit token, or a same-site
  requirement plus an `Origin` check) and never use `GET`.
- Sign-out clears the cookie, every service-layer cache and all in-memory user data; the bus emits
  `app:session-ended` so views drop their copies.
- `401`/`403` handling is centralised (`data-access.md`) so no view invents its own auth path.

## Third-party code and dependencies

- **No runtime dependency** without a decision record (Article IX). The policy allowlist is the only
  source of truth, and `ARCH-005`/`ARCH-006` fail builds that import anything else.
- Third-party scripts, if ever approved, are loaded with `integrity` + `crossorigin`, pinned to a
  version, self-hosted where possible, and never granted access to user data or the DOM holding it.
- `rel="noopener noreferrer"` on every `target="_blank"`; external links never leak the opener.
- Inbound `<iframe>` content is sandboxed; outbound embeds declare only the permissions they need.

## Secrets and data handling

- No secret, key or credential is committed to the repository — including test fixtures and example
  configuration. Configuration arrives at runtime (`window.__APP_CONFIG__`) and holds no secrets.
- Bearer-style material, if it must exist at all, is short-lived, origin-scoped and never logged.
- Logs and error messages exclude tokens, cookies, PII and full request bodies; known-sensitive keys
  are redacted in the transport pipeline before any log call (`data-access.md`, step 9).
- Telemetry is opt-in where required and never includes form values, free text, or identifiers beyond
  those necessary for the measured operation.
- Errors shown to users are actionable but leak no internals: no stack traces, no SQL, no internal
  hostnames, no request ids that expose a sequence.

## Review checklist

| ID | Check |
| --- | --- |
| SEC-1 | New DOM sink reviewed: no interpolated `innerHTML`/`outerHTML`/`insertAdjacentHTML`. |
| SEC-2 | New URL sink allowlisted to relative or `https:`; no `javascript:`/`data:`. |
| SEC-3 | New dependency? A decision record exists and the policy allowlist was updated. |
| SEC-4 | Credentials stay in cookies; nothing security-relevant is persisted client-side. |
| SEC-5 | CSP unchanged, or the change is justified and adds no `unsafe-*`. |
| SEC-6 | State-changing requests are non-`GET`, CSRF-protected and idempotency-safe. |
| SEC-7 | Untrusted data is validated at the boundary, with a failing test for the malformed case. |
| SEC-8 | No secret, token or PII in code, logs, URLs, error messages or fixtures. |
| SEC-9 | Third-party resources use SRI, are version-pinned and are in the allowlist. |
| SEC-10 | Auth and authorisation paths fail closed, and the `401`/`403` behaviour is tested. |

## Anti-patterns

- Sanitising on input instead of encoding on output; the next consumer receives the raw value.
- A "trusted" internal endpoint whose response is assigned to `innerHTML` without validation.
- Storing a JWT in `localStorage` for convenience.
- Catching an error and rendering the server's `error.message` straight into the DOM.
- Adding `unsafe-inline` to make one style work; it disables the primary XSS defence for the whole app.
- Relying on client validation for authorisation; the client is not a security boundary.
