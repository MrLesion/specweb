# ADR-0001 — Validator helpers return repository-relative paths

> **Status:** proposed
> **Date:** 2026-10-04 · **Deciders:** SpecWeb Architect · **Supersedes:** none
> **Affects:** `.specweb/tools/lib/files.mjs`, `validate-architecture.mjs`, `validate-components.mjs`, `validate-routes.mjs`

## Context

`walkRoot`'s JSDoc promises "POSIX paths relative to the repository root", but
the implementation returns paths relative to the walked sub-root
(`app/config.js`). Every consumer assumes the documented base: layer patterns
(`src/app`), `SUFFIX_PLACEMENT` prefixes, `featureIdForPath`'s
`^src/features/` regex, `normalisePath`'s documented input, contract
`module:` paths, and `path.join(rootAbs, file)` reads. `buildIndex` compounds
this by merging `src`-relative and `tests`-relative entries into one set — two
bases in one lookup table. Observed on the site-gateway tree
(`openspec/changes/site-gateway/validation-failures.log`): 42 false ARCH-001
errors, 19 false ARCH-007 warnings, and silent vacuous passes — the reads
miss, so import checks, the whole CMP rule set and RTE-011 never execute.

## Decision

We will make `walkRoot(rootAbs, rel)` prefix every returned path with `rel`
(via `path.join` + `toPosix`, leaving `'.'` roots unchanged) and
`buildIndex(rootAbs, roots)` prefix each root's `files`/`dirs` entries, so
every path a validator consumes is repository-relative POSIX. One base,
fixed at the source; no consumer changes.

## Consequences

- **Easier:** three validators correct by construction; a fourth inherits
  correctness.
- **Harder:** reports now show `src/…` prefixes (clearer); first post-fix runs
  surface real findings never reached before.
- **Now impossible:** sub-root-relative paths reaching any validator — callers
  wanting a suffix match must not depend on the old base.
- **Must revisit:** if a validator ever needs sub-root-relative paths, it
  should derive them itself.
- **Migration:** none for consumers; re-run all four validators on the
  restored tree.

## Alternatives considered

| Option | Why it lost |
| --- | --- |
| Normalize at every consumer call site | Drift risk; four places to re-inherit the bug |
| Change `layers` patterns to `src/`-relative | Article X violation (widening the contract to silence ARCH-001); breaks feature-isolation regexes |
| Change the JSDoc to match the bug | Documents the wrong invariant for every future validator |

## Compliance

- **Validator:** existing ARCH-001…ARCH-013, CMP-* and RTE-* rules now
  operate on correct paths (no new rule id).
- **Test:** none exists for `tools/` — known weakness; the regression net is
  the recorded validator run on the site-gateway tree plus this record's
  invariant.
- **Review:** Article X diff review of the change that introduced this fix.
- **Convention:** the JSDoc on `walkRoot`/`buildIndex`.

## References

- `openspec/changes/site-gateway/validation-failures.md`
- `openspec/changes/specweb-platform-fixes/` (design.md D1)
- Constitution Articles II and X
