# ADR-0003 — @web/test-runner as the browser test environment

> **Status:** proposed
> **Date:** 2026-10-04 · **Deciders:** SpecWeb Architect · **Supersedes:** none
> **Affects:** `.specweb/decisions/README.md` (index), `externals.devAllow`
> (already lists the packages; no contract edit)

## Context

`architecture/testing.md` mandates `@web/test-runner` + Playwright for the
component and integration levels (rules T2, T6; CMP-011 requires a sibling
component test per element), but the repository has no runner installed, no
config, and no decision record — site-gateway task 5.3 cannot start.
`externals.devAllow` already allowlists `@web/test-runner`,
`@web/test-runner-playwright`, `@playwright/test`, `playwright` and
`axe-core`, ratified with the platform; Article IX requires a decision record
for any dependency. `externals.allow` (runtime) stays empty — nothing loads
in the browser that did not before.

## Decision

We will treat `@web/test-runner` + Playwright as the component and integration
test environment, authorized by this record as the decision record Article IX
requires for the already-allowlisted dev packages. Install and config belong
to the feature task that needs them (site-gateway 5.3), not to this change.

## Consequences

- **Easier:** task 5.3 and the manual-pass evidence (tasks 2.3, 7.1, 7.2) gain
  their mandated tool; axe runs inside component tests (T6).
- **Harder:** devDependencies and a runner config join the repo; browsers must
  be provisioned.
- **Now impossible:** claiming component-level evidence from Node-only tests.
- **Must revisit:** (a) if ARCH-012 should extend to `externals.devAllow` —
  that is a rule change needing its own ADR; (b) if the runner's browser
  matrix no longer matches `conventions/browser-support.md`.
- **Migration:** none — contract files untouched; the first install is
  evidenced by the feature task's run output.

## Alternatives considered

| Option | Why it lost |
| --- | --- |
| Manual-only testing | T2/CMP-011 require automated component tests |
| Vitest/Jest + jsdom | Not a real browser (testing.md levels table) and not in `devAllow` |
| Playwright's own component testing | `devAllow` and testing.md name `@web/test-runner`; smallest delta wins |

## Compliance

- **Validator:** ARCH-012 enforces `externals.allow` only — **this record is
  review-enforced for `devAllow`; that enforcement gap is stated here, not
  hidden** (ARCH-012 does not fire on `devAllow` entries).
- **Test:** the component suite output recorded in site-gateway's
  verification.
- **Review:** this ADR + the `.specweb/` diff review (Article X).
- **Convention:** `architecture/testing.md` levels table and evidence rules
  (Article VII).

## References

- `architecture/testing.md`
- `standards/dependency-policy.yaml` (`externals.devAllow`)
- Constitution Articles VII and IX
- `openspec/changes/specweb-platform-fixes/` (design.md D3)
- site-gateway task 5.3
