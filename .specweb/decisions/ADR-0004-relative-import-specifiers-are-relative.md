# ADR-0004 — Relative import specifiers are ./- and ../-prefixed

> **Status:** proposed
> **Date:** 2026-10-04 · **Deciders:** SpecWeb Architect · **Supersedes:** none
> **Affects:** `.specweb/tools/lib/source.mjs` (`classifySpecifier`)

## Context

With ADR-0001's path base fixed, import checks executed for the first time
and immediately reported 21 × ARCH-005 `external dependency ".."`.
`classifySpecifier('../x.js')` returned `{ kind: 'package', value: '..' }`
because its relative-guard only matched `./x` (`specifier[1] === '/'`) and
bare `.`/`..`; every `../`-prefixed specifier fell through to the package
branch. Layer-crossing imports require `../` (no aliases are configured), so
every real tree trips this — it was invisible only because the vacuous pass
skipped import checks entirely
(`openspec/changes/site-gateway/validation-failures.md`).

## Decision

We will classify a specifier as relative iff it equals `.`, equals `..`, or
starts with `./` or `../` — explicit string checks in `classifySpecifier`.

## Consequences

- **Easier:** false ARCH-005s vanish; `../` imports flow into resolution,
  layer and isolation checks.
- **Harder:** those checks now run on imports never exercised — new true
  findings may surface and belong in the feature's triage list.
- **Now impossible:** `..` being mistaken for a package name.
- **Must revisit:** `aliases` (`dependency-policy.yaml`) becoming non-empty,
  which adds a third specifier class to weigh before the relative check.
- **Migration:** none — one function, no contract change.

## Alternatives considered

| Option | Why it lost |
| --- | --- |
| Special-case `'..'` in each consumer | Same drift class ADR-0001 rejected |
| Allowlist `'..'` in `externals.allow` | A package named `..` is not a dependency |
| Regex `/^\.\.?(\/|$)/` | Equivalent, but explicit string checks read plainer |

## Compliance

- **Validator:** ARCH-005/ARCH-008/ARCH-002 correctness for `../` imports
  (no new rule id).
- **Test:** none exists for `tools/` — known weakness shared with ADR-0001;
  the regression net is the recorded `validate-architecture` run after this
  fix.
- **Review:** Article X package review.
- **Convention:** `conventions/imports.md` (relative imports with `.js`)
  already states the intent this restores.

## References

- ADR-0001
- `openspec/changes/specweb-platform-fixes/` (design.md D4, task 2.4)
- Constitution Articles II and X
