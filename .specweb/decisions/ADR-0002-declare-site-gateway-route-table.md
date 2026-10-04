# ADR-0002 — Declare the site-gateway route table in route-contract.yaml

> **Status:** proposed
> **Date:** 2026-10-04 · **Deciders:** SpecWeb Architect · **Supersedes:** none
> **Affects:** `.specweb/standards/route-contract.yaml`, `specs/site-gateway/plan.md`

## Context

`architecture/routing.md` and RTE-002 require every route module to be
declared in the reviewable table; `routes:` was empty while site-gateway
ships five route modules (`gateway`, `music`, `games`, `projects`,
`not-found`). The feature staged its delta at
`specs/site-gateway/contracts/route-contract-delta.md` for Architect approval
as designed; the Builder may not edit contracts (workflow, Article X).

## Decision

We will declare the five routes in `.specweb/standards/route-contract.yaml`
exactly as the staged delta, bump `metadata.updated`, and record the applied
delta in `specs/site-gateway/plan.md` under Contract delta. The modules stay
authoritative for behaviour; the table is the review surface:

```yaml
routes:
  - { id: gateway,   path: /,         module: src/features/site-gateway/gateway.route.js,   element: app-gateway,       title: Welcome,        guard: null, lazy: true, spec: site-gateway }
  - { id: music,     path: /music,    module: src/features/site-gateway/music.route.js,     element: app-music-view,    title: Music,          guard: null, lazy: true, spec: site-gateway }
  - { id: games,     path: /games,    module: src/features/site-gateway/games.route.js,     element: app-games-view,    title: Games,          guard: null, lazy: true, spec: site-gateway }
  - { id: projects,  path: /projects, module: src/features/site-gateway/projects.route.js,  element: app-projects-view, title: Projects,       guard: null, lazy: true, spec: site-gateway }
  - { id: not-found, path: '*',       module: src/features/site-gateway/not-found.route.js, element: app-not-found,     title: Page not found, guard: null, lazy: true, spec: site-gateway }
```

(The contract file itself uses block style; the flow style above is the same
data.)

## Consequences

- **Easier:** RTE-002 meaningful; both-direction agreement checks
  (RTE-001…RTE-004) activate.
- **Harder:** any future route-module change now requires a coordinated
  contract edit.
- **Now impossible:** shipping a route module without review seeing it.
- **Must revisit:** a multi-feature future may want the table generated —
  premature until a second feature exists.
- **Migration:** one coordinated edit; no rule, severity or `enabled` flag
  changes.

## Alternatives considered

| Option | Why it lost |
| --- | --- |
| Leave the table undeclared | RTE-002 fails forever; the review surface stays stale |
| Disable or downgrade RTE-002 | Constitutional violation regardless of deadline |
| Auto-generate the table from modules | Removes the independent review surface the contract exists for |

## Compliance

- **Validator:** RTE-002 (presence) plus RTE-001…RTE-011 (agreement),
  configured in `standards/route-contract.yaml`.
- **Review:** Article X package review; `plan.md` Contract delta record
  (Article II).
- **Test:** `validate-routes` output recorded in site-gateway's
  verification.

## References

- Staged delta: `specs/site-gateway/contracts/route-contract-delta.md`
- `architecture/routing.md`
- `openspec/changes/specweb-platform-fixes/` (design.md D2)
