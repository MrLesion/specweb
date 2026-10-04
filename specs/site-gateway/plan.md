# Plan — site gateway

> Status: approved

## Approach

One `site-gateway` feature owns the shell-adjacent header, gateway view,
three list views, per-area stores/clients and shared cards. Entry flattens
from `src/demo.html` to root `index.html` plus `src/main.js`. Route modules
declare five routes; the contract delta lists them verbatim for the
Architect to apply to `.specweb/standards/route-contract.yaml`.

## Files

- `index.html`, `src/main.js`, `src/types.js`, `src/constants.js`
- `src/app/config.js`, `src/app/error-boundary.js`, `src/app/register-elements.js`
- `src/routes/router.js`, `src/routes/registry.js`, `src/routes/guards.js`,
  `src/routes/match-route.js`
- `src/services/http.js`, `src/services/storage.js`, `src/services/theme.js`
- `src/utils/app-error.js`
- `src/styles/main.css`
- `src/features/site-gateway/` (index, strings, gateway/music/games/projects/
  not-found elements and routes, components, stores, services, utils)

## Data flow

View `connectedCallback` subscribes to its area store and calls
`loadList(store, client)`; client returns validated items; store normalises
to `{ items, order, status }`; selectors derive ordered lists and retry
flags; views render with `textContent`/`replaceChildren`. Theme controller
resolves stored choice or OS default, applies `[data-theme]`, persists
toggles. Router matches exact paths then catch-all, awaits `load()`,
mounts into `#outlet`, sets title/focus/`aria-current`.

## Failure modes

NETWORK/TIMEOUT retry; FORBIDDEN message-only; PARSE on bad shapes; OFFLINE
before send; aborts silent; corrupt theme falls back; chunk-load failure
renders the route error view with retry.

## Test plan

`node --test tests/unit` (validator, clients, stores, transport, storage,
theme, route matching); browser component tests beside each element
(attributes, properties, keyboard); integration by view plus router;
manual keyboard/zoom/contrast passes recorded in verification.

## Risks and unknowns

Entry flattening breaks old relative paths (task 1 verifies first). Shared
card ossification (contract keeps required triple, extras ignored). Sticky
header overlap (`scroll-margin-top`, verified at 320px/200%). Stub drift
(stubs pass through the endpoint validator).

## Contract delta

- **Applied 2026-10-04 by the Architect**, justified in
  `.specweb/decisions/ADR-0002-declare-site-gateway-route-table.md`:
  `.specweb/standards/route-contract.yaml` `routes:` before → after —
  `[]` → five declarations (`gateway`, `music`, `games`, `projects`,
  `not-found`) matching `contracts/route-contract-delta.md` verbatim;
  `metadata.updated` bumped to 2026-10-04. No rule, severity or `enabled`
  flag changed. Evidence: `node .specweb/tools/validate-routes.mjs` →
  `5 declared route(s); 0 errors, 0 warnings; PASS`.
