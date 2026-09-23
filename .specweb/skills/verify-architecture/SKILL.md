---
name: verify-architecture
description: Verify a change against the platform: run the validators, review the diff against the architecture rules they cannot see, and record the verdict as evidence.
---

# Skill — verify-architecture

**Purpose.** Answer one question with evidence: *does this change respect the platform?* The validators
cover what is mechanical; this skill covers the rest and records both.

**Used by.** Architect (at G2, after a contract delta), Builder (before completing a task), Verifier
(at G4). **Rules.** Everything in `.specweb/architecture/`, `standards/`, and the constitution.

## When to use

- Before checking the last task of a feature (`agents/builder.md`).
- Before a contract delta is accepted (Article II, Article X).
- As the platform half of every G4 verification (`agents/verifier.md`).
- After any change that touches `.specweb/` or `standards/*.yaml`, without exception.

## Inputs

| Input | Source |
| --- | --- |
| The change under review | Diff / branch |
| The plan and its contract delta | `plan.md` |
| Architecture rules | `.specweb/architecture/*` |

## Procedure

1. **Run all four validators** and capture the output verbatim, including finding counts:
   ```bash
   node .specweb/tools/validate-architecture.mjs
   node .specweb/tools/validate-components.mjs
   node .specweb/tools/validate-routes.mjs
   node .specweb/tools/validate-spec-coverage.mjs
   ```
   A finding is a finding: do not re-run with a lower severity, a disabled rule or an exclusion to get
   a green result (Article X).
2. **Confirm nothing in the platform was weakened.** Diff `.specweb/` and check for disabled rules,
   lowered severities, widened boundaries, added exception entries or reduced thresholds. Every one of
   those requires an ADR and is a G4 blocker without it.
3. **Read the diff against the layer rules the validators approximate**: state ownership, event
   naming, teardown, `index.js` as the only feature surface, and "does this module have one job?".
4. **Apply the state checklist (S1–S7)** from `architecture/state.md` to every changed store and view.
5. **Apply the event checklist (E1–E7)** from `architecture/events.md` to every changed dispatch and
   subscription.
6. **Apply the security checklist (SEC-1–SEC-10)** from `architecture/security.md` to every change
   that touches the DOM, the network, storage or configuration.
7. **Apply the styling checklist (Y1–Y8)** to changes in `src/styles/` or component stylesheets.
8. **Apply the testing checklist (T1–T8)** to the tests: does each requirement have a test that would
   fail without the behaviour, and is any test asserting on internals?
9. **Check contract-to-prose agreement**: a new rule id must appear in the architecture document that
   owns it, and a changed rule must have changed its document in the same commit (Article II).
10. **Write the verdict** — pass, pass with issues, or fail — with the command output and the rule ids
    cited, into `verification.md` (or the task's evidence).

## Checklist

| Area | Source | Applied to |
| --- | --- | --- |
| Layering | `standards/dependency-policy.yaml`, `ARCH-*` | Every changed import |
| Components | `standards/component-contract.yaml`, `CMP-*` | Every element module |
| Routes | `standards/route-contract.yaml`, `RTE-*` | Every route module and contract entry |
| Coverage | `standards/feature-contract.yaml`, `SPC-*` | Every feature and spec |
| State | `architecture/state.md` S1–S7 | Stores, selectors, subscriptions |
| Events | `architecture/events.md` E1–E7 | Dispatches and listeners |
| Security | `architecture/security.md` SEC-1–SEC-10 | DOM sinks, network, storage, config |
| Styling | `architecture/styling.md` Y1–Y8 | Stylesheets and tokens |
| Testing | `architecture/testing.md` T1–T8 | Test files and their assertions |
| Platform integrity | `constitution.md` Articles II and X | The diff to `.specweb/` itself |

## Evidence format

```
$ node .specweb/tools/validate-architecture.mjs
SpecWeb validate-architecture v1 (specweb.dev/v1)
root: <path> · files scanned: 42
0 errors, 0 warnings
PASS

$ node .specweb/tools/validate-components.mjs
SpecWeb validate-components v1 (specweb.dev/v1)
root: <path> · element modules scanned: 9
CMP-011 warning src/features/task-board/components/task-chip.component.js: no sibling test file
0 errors, 1 warning
FAIL (1 warning over --max-warnings 0)
```

Each non-mechanical finding is recorded with the rule it violates and the file and line it lives at,
plus the observation that made it a finding ("subscription added in `connectedCallback`, no
unsubscribe in `disconnectedCallback`").

## Done criteria

- All four validators have been run against the reviewed revision, with output recorded.
- Every `ARCH-*`, `CMP-*`, `RTE-*` and `SPC-*` finding is either fixed or listed with a decision.
- The non-mechanical checklists are answered, with *not applicable* marked explicitly.
- The platform diff was reviewed for weakened rules, and any change cites an ADR.
- The verdict is recorded with its evidence, and the revision identified.

## Common mistakes

- Running the validators and treating a pass as architectural approval; the checklists still apply.
- Raising every finding to a blocker without triage, which makes the review unbearable and then
  ignored.
- Approving a boundary widening because "the ADR will follow".
- Reviewing the code but not `standards/*.yaml`, where the actual rule change lives.
- Recording findings in a chat message instead of `verification.md`, so nothing survives the session.
- Skipping the validators because "nothing structural changed"; imports change without warning.
