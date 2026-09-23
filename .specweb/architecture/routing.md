# Architecture — Routing

**Scope.** URL is the source of truth for "where am I". The router maps the current location to one
view, owns the navigation side effects that only it may perform (title, focus, scroll), and exposes
an intent-based `navigate()` API to the rest of the app.

**Enforced by.** `standards/route-contract.yaml`; `tools/validate-routes.mjs`
(`RTE-001`…`RTE-011`).

## Route module contract

Each routed feature owns exactly one route module. It is declarative data plus a lazy loader — no
rendering logic, no data fetching, no DOM access.

```js
/**
 * @file Route declaration for the task board feature.
 * @module features/task-board/task-board.route
 */

/**
 * @type {import('../../../src/types.js').Route}
 */
export const route = {
  id: 'task-board',
  path: '/boards/:boardId',
  title: 'Task board',
  element: 'app-task-board',       // the view tag, defined by the feature entry point
  guard: 'requireSession',          // name of an export in src/routes/guards.js, or null
  load: () => import('./task-board.element.js'), // dynamic import: lazy by default
};
```

`standards/route-contract.yaml` is the reviewable route table, and `src/routes/registry.js` imports
these modules into the table the router consumes. The validator enforces agreement **in both
directions**: a declared route whose module is missing fails `RTE-001`, and a `*.route.js` file that
the contract does not declare fails `RTE-002`. This keeps the contract honest — there is no way to
add a route that review never saw.

## Matching

- Patterns are `path-to-regexp`-style only in the sense of `:param` segments and a trailing `*` for
  a catch-all. No regular expressions in route paths.
- Matching is exact on segments; trailing slashes are normalised away, and the canonical form is
  the one in the contract.
- Parameters are decoded once with `decodeURIComponent` and validated by the route (or the feature
  client) before use. Matched params reach the view as attributes/properties, not via a global.
- Every router implements the **same lookup order**: exact match → parameterised match → catch-all
  → `not-found`. A route may not be reachable by two different paths (`RTE-007`).

## Lazy loading

- Route `load()` uses a dynamic `import()`. A route that statically imports its view defeats code
  splitting and fails `RTE-005`.
- The router awaits `load()` before mounting, and shows the outlet's `aria-busy="true"` state while
  it waits.
- A failed chunk load renders the route's error view and is logged — it is never a blank page. The
  user gets a "retry" affordance because a failed dynamic import is usually transient.

## Guards

- A guard is a pure function `(context) => true | string | Promise<...>` exported from
  `src/routes/guards.js`: `true` proceeds, a string is the redirect target, and a thrown `AppError`
  renders the error route (`RTE-006`).
- Guards run **before** `load()`, so an unauthorised user never downloads the chunk.
- Guards must not render, must not mutate state, and must not call `navigate()` themselves.

## Navigation side effects (router-only)

| Effect | Rule |
| --- | --- |
| Document title | `document.title = route.title` on every successful navigation; the route may append a detail suffix. |
| Focus | After mount, move focus to the outlet (`tabindex="-1"`) so keyboard and screen-reader users start at the new content. |
| Scroll | Restore the saved scroll position for a back/forward navigation; scroll to top for a fresh push. |
| Live region | Announce the new page name once, politely — never on the initial load. |
| Teardown | `disconnect()` the outgoing element and run its teardown before mounting the next. |

## Navigation API

```js
router.navigate('/boards/42', { replace: false }); // intent, not URL parsing by callers
```

- Links are real `<a href>` elements, enhanced by the router's delegated click handler. Open-in-new-
  tab, middle-click and copy-link always work because the href is real.
- `navigate()` throws on an unknown path in development; in production it renders `not-found`.
- `popstate` is the only source of truth for back/forward; the router never guesses.
- The router emits `app:route-changed` with `{ from, to }` after a successful mount, which is how
  analytics and stores learn about navigation without touching the router internals.

## Error and not-found routes

Both are ordinary routes declared in the contract (`RTE-010` requires `not-found` to exist). They
are server-independent, render inside the shell, and never clear the outlet's landmarks.

## Rules

| ID | Rule |
| --- | --- |
| RTE-001 | Every declared route module exists. |
| RTE-002 | Every `*.route.js` file is declared in the contract. |
| RTE-003 | Declared `path` matches the module's `path`. |
| RTE-004 | Declared `title` matches the module's `title`. |
| RTE-005 | Routes marked lazy use a dynamic `import()`. |
| RTE-006 | Guard names resolve to exports in `src/routes/guards.js`. |
| RTE-007 | No two routes declare the same path. |
| RTE-008 | Every route names a `spec` whose `specs/<id>/spec.md` exists. |
| RTE-009 | Route modules export a named `route` object. |
| RTE-010 | When the app declares any route, a `not-found` route is also declared. |
| RTE-011 | Every declared `element` tag is registered by some component file. |

## Anti-patterns

- Fetching data in a route module; data loading belongs to the view or its store.
- Mutating `location` directly instead of `navigate()` — the router's state machine desynchronises.
- Reaching into `window.app.router` from a component to navigate; dispatch an event or use a link.
- A catch-all route that swallows typos instead of rendering `not-found`.
- Deep-linking to a detail route without a strategy for "no such record" (an empty shell is not an
  error state).
