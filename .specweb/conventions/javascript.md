# Conventions — JavaScript

**Scope.** The language level, the style, and the constructs that are allowed, discouraged or
forbidden. The target is spec-compliant ES2022+ that runs unmodified in the supported browsers —
no transpiler, no bundler requirement, no framework (`browser-support.md`).

**Enforced by.** `conventions/jsdoc.md` (types), `conventions/imports.md` (module graph),
`tools/validate-architecture.mjs` (imports), `tools/validate-components.mjs` (DOM sinks and events),
`skills/verify-architecture/SKILL.md` (review).

## Language level and style

| Topic | Convention |
| --- | --- |
| Modules | ES modules only. No CommonJS, no UMD, no globals, no IIFE wrappers. |
| Strict mode | Implicit — modules are strict; do not write `'use strict'`. |
| Declarations | `const` by default; `let` only when reassigned; `var` never. |
| Functions | `function` for named module-level functions, arrow functions for callbacks. |
| Classes | Only for custom elements and `Error` subclasses. No inheritance beyond `HTMLElement`. |
| Equality | `===`/`!==`; `==` is a review failure even when it is safe. |
| Nullish | `??` and `?.` in preference to `||` for defaults — `0` and `''` are real values. |
| Objects | Literals, shorthand properties, computed keys. `Object.freeze` on exported constants. |
| Arrays | `for…of`, `map`/`filter`/`reduce`; no `for…in`, no index loops for iteration. |
| Strings | Template literals for interpolation; no `+` concatenation beyond two parts. |
| Numbers | `Number.isFinite`, `Math.trunc`; no implicit string-to-number coercion. |
| Dates | `Intl.DateTimeFormat` for display, ISO-8601 strings in state, epoch ms internally. |
| Trailing commas | Always, in multi-line literals and parameter lists. |
| Semicolons | Always. |
| Quotes | Single quotes; double quotes only inside HTML strings. |
| Width | 100 columns; formatting enforced by a committed `prettier` configuration at the root. |

Named exports only. A default export makes renaming invisible to tooling and is forbidden.

## Immutability and purity

- Data crossing a module boundary is read-only: create a new value rather than mutating an argument,
  a parameter object, or an imported constant.
- `Object.freeze` on exported constants, route tables and store tables, so a mutation fails loudly in
  strict mode instead of silently poisoning every consumer.
- Spread for shallow copies and explicit mapping for deep ones — no `structuredClone` on live state,
  and no JSON round-trip as a copy mechanism.
- Sorting a caller's array is a defect; copy first (`[...items].sort(...)`).

## Errors

- Throw `AppError` with a stable code at boundaries; throw `TypeError`/`RangeError` for programmer
  errors inside pure functions. Never throw strings, plain objects or `new Error('Something failed')`.
- Never swallow. A caught error is handled, re-thrown with context
  (`throw new AppError('PARSE', 'board list', { cause })`), or logged and converted into a
  user-visible state. An empty `catch {}` fails review.
- `catch` receives whatever was thrown; assume it may be anything and narrow before use.
- Async functions reject rather than resolve a sentinel: do not `return null` on failure when the
  caller cannot distinguish it from an empty result. Use a discriminated result
  (`{ ok: false, error }`) when failure is expected and normal.
- User-facing messages come from the error's code, never from a foreign error's `message`.

## Async

- `async`/`await` over `.then()` chains; never mix both in one function.
- Every function that performs I/O accepts an `AbortSignal` and passes it down
  (`data-access.md`, D5).
- Cancellation is not an error: an aborted operation returns quietly, and the `AbortError`
  `DOMException` is never reported as a failure.
- No floating promises: every promise is awaited, returned, or explicitly `void`ed with a comment.
- Concurrency is explicit: `await Promise.all([...])` for independent work, `for…of` with `await` when
  order matters, `Promise.allSettled` when partial failure is acceptable.
- `setTimeout` is never used to wait for something observable (a DOM state, a promise, an event).
  Waiting is either a promise or a scheduler injected for tests (`testing.md`).
- No `await` inside `render()` or `attributeChangedCallback`; rendering is synchronous.

## DOM

- Query with `querySelector`/`closest` on the narrowest root available; `document.querySelector` is
  allowed only in the shell and in tests.
- Listeners added in `connectedCallback` are removed in `disconnectedCallback`; subscriptions return
  their own unsubscribe function, which is stored for teardown.
- `textContent` for data, `setAttribute` for validated values, `replaceChildren` for lists. Data never
  reaches `innerHTML` (`security.md`, `CMP-015`).
- Use `Element.replaceChildren`, `Element.toggleAttribute`, `dataset` and the `<dialog>` primitive
  instead of hand-rolled equivalents.

## Forbidden

`var`, `eval`, `new Function`, `document.write`, `with`, prototype mutation, `arguments`, `for…in`,
`==`, `parseInt` without a radix, `new Date(string)` for parsing, `localStorage` outside
`src/services/storage.js`, `fetch` outside `src/services/`, direct access to app internals through
anything other than the frozen `window.app`, and `console.log` left in committed code (use the logger
in `src/services/logging.js`).

## Rules

| ID | Rule |
| --- | --- |
| J1 | ES modules, named exports, no transpile-only syntax. |
| J2 | `const`/`let` only; `===` always; no implicit coercion. |
| J3 | Errors are typed, coded, contextual, and never swallowed. |
| J4 | Every promise is awaited, returned, or explicitly voided. |
| J5 | Every listener and subscription has a teardown. |
| J6 | Data never reaches an HTML sink; `textContent` and validated attributes only. |
| J7 | Immutable data across boundaries; no mutation of arguments or imported constants. |
| J8 | `fetch` and `localStorage` are reachable only through the service layer. |

## Anti-patterns

- `async` in `attributeChangedCallback` to "wait for the data" — attributes are inputs, not triggers.
- Defensive `try/catch` around code that cannot throw, which merely relocates the failure.
- `JSON.parse(JSON.stringify(state))` as a deep copy; it silently drops `undefined`, `Date` and `Map`.
- `setTimeout(fn, 0)` to sequence rendering instead of a microtask or a fixed ordering.
- Importing a polyfill in `main.js` because one browser lagged; that requires an ADR
  (`constitution.md`, Article IX).
