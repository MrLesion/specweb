# Conventions — File Structure

**Scope.** Where every kind of file lives. A file in the wrong place fails review, and where it can
be checked mechanically it fails `tools/validate-*.mjs`.

**Enforced by.** `tools/validate-architecture.mjs` (`ARCH-001`, `ARCH-009`),
`tools/validate-components.mjs` (`CMP-010`), `tools/validate-spec-coverage.mjs` (`SPC-007`).

## Repository layout

```
<host-repo>/
├── index.html                    # the only HTML entry point
├── .specweb/                     # permanent platform — see .specweb/README.md
├── specs/                        # feature specs, one folder per feature
├── src/                          # application source (layered, see architecture/application.md)
├── tests/                        # cross-cutting suites (unit, integration, e2e, support)
├── docs/                         # user-facing documentation (how to use the app)
├── public/                       # files served as-is: icons, fonts, images, manifest
├── tools/                        # project scripts (dev server, release); not the SpecWeb validators
└── playwright.config.js          # test-runner configuration at the root, if used
```

Two rules keep this layout honest: **nothing product-shaped lives at the root** beyond `index.html`,
and **nothing platform-shaped lives outside `.specweb/`**. `src/` contains code, `public/` contains
bytes, `specs/` contains intent.

## `src/`

```
src/
├── main.js                       # bootstrap only (application.md)
├── types.js                      # shared JSDoc typedefs (utils layer)
├── constants.js                  # shared constants (utils layer)
├── app/
│   ├── config.js                 # runtime configuration
│   ├── error-boundary.js         # global error handlers
│   └── register-elements.js      # definition of shared elements
├── routes/
│   ├── router.js                 # the router implementation
│   ├── registry.js               # composes the route table
│   └── guards.js                 # guard functions by name
├── features/<feature-id>/
│   ├── index.js                  # the feature's only public surface
│   ├── <feature-id>.route.js      # route declaration (routed features only)
│   ├── <feature-id>.element.js    # the view element for that route
│   ├── components/<name>.component.js
│   ├── components/<name>.component.test.js
│   ├── stores/<name>.store.js
│   └── services/<name>.client.js
├── state/                        # cross-feature stores
├── services/                     # http, storage, event bus, network, logging
├── components/<name>.component.js
├── styles/                       # main.css, tokens, reset, base
└── utils/<area>.utils.js
```

## Suffix table

The suffix is the contract an agent (and a validator) reads to know what a file is:

| Suffix | Contains | Layer |
| --- | --- | --- |
| `.component.js` | One custom element + its definition | `components` or `features/*/components` |
| `.component.test.js` | That element's browser test | beside the component |
| `.element.js` | A route's view element (a component that composes a feature) | `features/<id>` |
| `.route.js` | A route declaration object | `features/<id>` |
| `.store.js` | A store created by `createStore` | `state` or `features/<id>/stores` |
| `.client.js` | A feature's API client | `features/<id>/services` |
| `.form.js` | A form controller | `features/<id>` |
| `.utils.js` | Pure helpers, no imports above `utils` | `utils` or `features/<id>` |
| `.test.js` | Node unit test | `tests/unit/**` |
| `.spec.js` | Playwright end-to-end spec | `tests/e2e/**` |

A non-component file with a `.component.js` name, or a component without it, is a defect: the suffix
is how the layer is derived, so the suffix *is* the architecture.

## `specs/`

```
specs/<feature-id>/
├── spec.md            # WHAT and WHY      — required (SPC-001)
├── plan.md            # HOW              — required (SPC-002)
├── tasks.md           # ordered work     — required (SPC-003)
├── verification.md    # evidence         — required (SPC-004)
├── contracts/         # feature-scoped contract deltas, if any
└── assets/            # wireframes, API samples, screenshots used by the spec
```

`<feature-id>` is kebab-case and matches `src/features/<feature-id>/` exactly. That identity is what
lets `SPC-007` pair code with intent in both directions.

## `tests/`

```
tests/
├── unit/<area>/<file>.test.js    # node --test, no DOM
├── integration/<feature>.test.js # browser, one view + store + stubbed client
├── e2e/<journey>.spec.js         # Playwright, full journeys
└── support/                      # fakes, fixtures, builders (never named *.test.js)
```

Component tests do **not** live here — they sit beside the component they test (`CMP-011`), because a
component's contract and its test are read together.

## Generated and ignored paths

Never hand-edited, never reviewed as source: `node_modules/`, `dist/`, `build/`, `coverage/`,
`.cache/`, `playwright-report/`, `test-results/`. The validators skip them explicitly, and a build
artifact committed to the repository is treated as a defect rather than noise.

## Rules

| ID | Rule |
| --- | --- |
| FS1 | Every file lives in the layer directory its suffix implies. |
| FS2 | Feature code is under `src/features/<feature-id>/`, matching `specs/<feature-id>/`. |
| FS3 | Root holds `index.html` and configuration only — no product source. |
| FS4 | Suffixes are used exactly as defined in the table above. |
| FS5 | Generated output is never committed. |
| FS6 | `docs/` describes the app to its users; the platform describes it to its builders. |

## Anti-patterns

- `src/components/task-list.component.js` for a component only one feature uses; it belongs in that
  feature, and `CMP-010` will not object, but reuse-by-accident is how shared folders rot.
- `src/utils/api.utils.js` that calls `fetch`; that is a client, and `utils` may not import services.
- `src/features/TaskBoard/` (PascalCase) or `specs/taskBoard/`; ids are kebab-case and must match.
- `helpers.js`, `misc.js`, `common.js`; name the concern instead (`date.utils.js`,
  `validation.utils.js`).
- A second `index.html` inside a feature folder, which no server will serve.
