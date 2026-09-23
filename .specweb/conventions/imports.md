# Conventions — Imports

**Scope.** The module graph is the architecture made visible. Imports are therefore the most heavily
checked thing in the codebase: `tools/validate-architecture.mjs` reads them, resolves them, and fails
the build when they cross a boundary the policy forbids.

**Enforced by.** `standards/dependency-policy.yaml`; `tools/validate-architecture.mjs`
(`ARCH-002`…`ARCH-011`).

## Form

```js
import { createStore } from '../../../state/create-store.js';
import { formatDueDate } from '../utils/date.utils.js';
import { routes } from './registry.js';
```

- **Relative paths with an explicit `.js` extension.** The browser resolves URLs, not npm module
  names; a missing extension works in some tooling and 404s in the browser, which is the worst
  possible failure mode. `ARCH-008` enforces it.
- **Named exports only.** `import { x } from`, never `import x from`; a default export cannot be
  renamed safely and is invisible to tooling.
- **No side-effect-only imports** except element definition modules, which are named after what they
  define and are the single sanctioned exception (`register-elements.js`).
- **No path escaping above the layer root.** `../../..` chains that leave `src/features/<id>/` to
  reach another feature's internals fail `ARCH-009`; use that feature's `index.js` instead.

## Aliases and import maps

Aliases (`@app/…`, `@features/…`) are **opt-in per repository**: they must be declared in
`standards/dependency-policy.yaml` under `aliases`, mirrored in the browser's import map, and used
consistently or not at all. A resolver that works in Node but not in the browser is worse than
relative paths, so the default is relative-only.

```yaml
# standards/dependency-policy.yaml
aliases:
  '@app': 'src/app'
  '@utils': 'src/utils'
```

If an alias is used in code, `ARCH-011` checks that its target directory exists, so a stale mapping
fails the build rather than silently resolving to nothing.

## Ordering

Four groups, separated by a blank line, sorted within each group:

```js
// 1. externals — only packages on the policy allowlist (normally none)
// 2. absolute/aliased imports, if enabled
// 3. relative imports, parents first then siblings ('../' before './')
// 4. type-only imports, as /** @import */ or JSDoc references
```

Group 1 is normally empty: there are no runtime dependencies (Article IX). A non-empty group 1 is
itself a signal worth reviewing.

## Boundaries (restated from `architecture/application.md`)

| From | May import |
| --- | --- |
| `src/main.js`, `src/app/**` | anything |
| `src/routes/**` | `features`, `state`, `services`, `components`, `utils` |
| `src/features/<id>/**` | `components`, `state`, `services`, `utils`, its own subtree, and other features via `index.js` |
| `src/state/**` | `services`, `utils` |
| `src/services/**` | `utils` |
| `src/components/**` | `utils` |
| `src/utils/**` | `utils` |

`src/features/<id>/index.js` is the **only** public surface of a feature. It exports element tags,
store actions and selectors, typedefs and nothing else — a deep import from another feature is an
`ARCH-003` error, and importing something the feature does not export is a missing export, not a
reason to widen the rule.

## Cycles

Import cycles are forbidden, including `type`-only cycles that the checker tolerates. Symptoms are
hard to diagnose (an `undefined` import at module-evaluation time that works in one file order and
not another), so the rule is absolute: if A needs B and B needs A, one of them owns the shared piece.
The correct fix is almost always to move the shared type or constant down to `utils`.

## Dynamic imports

- Routes load their views with `import()` (`routing.md`, `RTE-005`), which is the only sanctioned use
  of dynamic import.
- Dynamic import for laziness is a *bundle-size* decision: any other use must explain itself in the
  commit message, because it defeats static analysis and the validators cannot follow it.
- `import()` inside a conditional that depends on user input (a URL segment, a form field) is
  forbidden: it turns user data into a module path (`security.md`).

## Rules

| ID | Rule |
| --- | --- |
| I1 | Relative imports always carry the `.js` extension. |
| I2 | Named exports only; no default exports. |
| I3 | No import may point from a lower layer to a higher layer. |
| I4 | Cross-feature imports go through `index.js`. |
| I5 | No import cycles, including type-only cycles. |
| I6 | Externals are limited to the policy allowlist. |
| I7 | Aliases are declared in the policy and mirrored in the browser import map. |
| I8 | `import()` is used only for route views and never with user-controlled specifiers. |

## Anti-patterns

- `import '../../state/session.store.js'` from a component; components may not reach state.
- A barrel file (`src/components/index.js`) that re-exports everything, re-creating the hidden
  coupling that the layer rules exist to prevent. Only feature `index.js` entry points are barrels.
- Importing a value purely for its side effect (a polyfill, a stylesheet injected by JS) instead of an
  explicit, named definition module.
- `import { x } from './x'` without the extension, working in the dev server and failing in the
  browser's strict resolver.
