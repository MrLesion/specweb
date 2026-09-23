# Architecture — Application

**Scope.** How the application starts, how its layers are arranged, how a feature is registered, and
what the shell is responsible for. Everything else in `architecture/` describes one layer of this
picture.

**Enforced by.** `standards/dependency-policy.yaml`; `tools/validate-architecture.mjs`
(`ARCH-001`…`ARCH-013`).

## Layers

Dependencies flow **downward only**. A file's layer is derived from its path, never from what it
imports or declares.

| Layer | Paths | Purpose | May import |
| --- | --- | --- | --- |
| `app` | `src/main.js`, `src/app/**` | Bootstrap, shell, configuration, error handling | everything below |
| `routes` | `src/routes/**` | Route table, matching, guards, navigation | `features`, `state`, `services`, `components`, `utils` |
| `features` | `src/features/<id>/**` | Feature UI, feature stores, feature clients | `components`, `state`, `services`, `utils`, and other features **through `index.js` only** |
| `state` | `src/state/**` | Shared stores, reducers, selectors | `services`, `utils` |
| `services` | `src/services/**` | HTTP transport, caches, platform adapters | `utils` |
| `components` | `src/components/**` | Shared presentational components | `utils` |
| `utils` | `src/utils/**`, `src/types.js`, `src/constants.js` | Pure helpers, typedefs, constants | `utils` only |
| `styles` | `src/styles/**` | Tokens and global CSS | — (no JS) |

`src/components/**` deliberately may **not** import `state`, `services`, `features`, `routes` or
`app`: a shared component that can reach the network is a shared component that cannot be tested or
reused. Feature-specific composition lives in `src/features/<id>/components/**`.

## Bootstrap sequence

`index.html` loads exactly one module: `src/main.js`.

```html
<script type="module" src="/src/main.js" fetchpriority="high"></script>
```

`src/main.js` performs a fixed, ordered sequence and nothing else:

```js
import { readConfig } from './app/config.js';
import { installErrorHandlers } from './app/error-boundary.js';
import { createRouter } from './routes/router.js';
import { routes } from './routes/registry.js';
import { defineSharedElements } from './app/register-elements.js';

installErrorHandlers();            // 1. never fail silently, even during boot
const config = readConfig();       // 2. fail fast on missing configuration
await defineSharedElements();      // 3. shared custom elements are defined once
const router = createRouter({ routes, mount: document.querySelector('#outlet') });
router.start();                    // 4. render the first route, then listen
window.app = Object.freeze({ router, config }); // 5. the only global, frozen, read-only
```

Order is contractual: error handling precedes configuration (so a bad config is reported, not
thrown into the void), element definition precedes routing (so a route can render its tag
immediately), and the global is assigned last (so nothing can observe a half-built app).

## Shell responsibilities

The shell (`src/app/**`, `src/main.js`) owns exactly five things and delegates everything else:

1. **Configuration** — `readConfig()` reads the server-injected `window.__APP_CONFIG__`, validates
   required keys, and throws `AppError('CONFIG_INVALID')` on failure. There is no build-time
   environment: the same bundle is served to every environment.
2. **Error boundary** — `installErrorHandlers()` attaches `error` and `unhandledrejection`
   listeners, logs a structured record, and renders a non-destructive fallback into `#app-status`.
   It never clears the page.
3. **Element registration** — `register-elements.js` imports and defines shared custom elements
   once, before routing.
4. **Routing** — the shell creates the router and hands it the outlet; it does not know any specific
   path.
5. **Outlet and landmarks** — `index.html` provides `<header>`, `<main id="outlet">`,
   `<footer>` and a live region for application status. Routes render *into* `#outlet`; only the
   router may replace its children.

## Feature registration

A feature is discovered, not hand-wired: `src/routes/registry.js` composes the route table from each
feature's route module, and `src/app/register-elements.js` imports each feature's element entry
point. Both lists must agree with `standards/route-contract.yaml` and
`standards/component-contract.yaml`, and the validators enforce the agreement in **both**
directions: a declared module that does not exist is an error, and a module that exists but is not
declared is an error too.

```js
// src/routes/registry.js
import { route as taskBoard } from '../features/task-board/task-board.route.js';

/** @type {import('../types.js').Route[]} */
export const routes = Object.freeze([taskBoard, notFound]);
```

A feature's public surface is `src/features/<id>/index.js`, and it exports **only** what other
features may use: the feature's element tag names, its store's actions and selectors, and its
typedefs. Anything not exported there is private by definition — other code importing it fails
`ARCH-003`.

## Lifecycle and teardown

- Feature `init()` functions, when present, run once, are idempotent, and return a teardown function.
- The router tears down the outgoing view (calling `disconnect()` and removing listeners) before
  mounting the incoming one. No view is left mounted and unlistened.
- Nothing in the application holds a reference to a removed DOM subtree.

## Rules

| ID | Rule |
| --- | --- |
| A1 | Dependencies flow downward; a layer never imports a higher layer. |
| A2 | Cross-feature imports use `src/features/<id>/index.js` only. |
| A3 | `src/main.js` contains bootstrap and nothing else. |
| A4 | No module mutates another module's exports; exported objects are frozen. |
| A5 | Global state is limited to the frozen `window.app` object. |
| A6 | Configuration is read, validated and frozen at boot; never re-read per call. |
| A7 | Element definition happens once, at boot, in `register-elements.js`. |
| A8 | `index.html` holds exactly one module script and the app landmarks. |

## Anti-patterns

- A route module that reaches into another feature's store instead of that feature's public actions.
- `utils` importing `services` "just this once" — `utils` must stay dependency-free and pure.
- Registering a custom element inside a route's `connectedCallback`, which makes element definition
  order depend on navigation order.
- Reading `window.__APP_CONFIG__` at each use site instead of once in `readConfig()`.
- Importing `../features/other/private-thing.js`; if it matters, export it from `index.js`.
- Adding a second module script to `index.html` "temporarily" — the boot order becomes unspecified.
