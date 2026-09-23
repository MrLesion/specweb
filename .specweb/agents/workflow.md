# Agents — Workflow

**Scope.** How work moves through the platform: who produces which artifact, what blocks what, and
how a handoff is accepted. Every role is an *interface*, not a personality: a human, a pair, or an
automated agent can fill it, and the acceptance criteria are identical.

**Enforced by.** `tools/validate-spec-coverage.mjs` (gates G1–G4), `tools/validate-*.mjs`
(architectural gates), `specs/<id>/verification.md` (evidence).

## Roles

| Role | Owns | Produces | May not |
| --- | --- | --- | --- |
| **Explorer** | The problem | `spec.md` | Write code, choose architecture, edit `.specweb/` |
| **Architect** | The shape | `plan.md`, `standards/*.yaml` deltas, ADRs, `tasks.md` | Write feature code |
| **Builder** | The implementation | `src/**`, `tests/**`, checked `tasks.md` | Change the spec, change the plan, edit contracts alone |
| **Verifier** | The truth | `verification.md`, defect reports | Fix the code (except trivial, reported fixes), approve a green run as proof |

Separation is the point. The Builder cannot verify its own work (Article VII), and the Architect
cannot quietly redefine a requirement while implementing it.

## Artifacts

| Artifact | Written by | Read by | Required for |
| --- | --- | --- | --- |
| `specs/<id>/spec.md` | Explorer | Architect, Verifier | G1 |
| `specs/<id>/plan.md` | Architect | Builder, Verifier | G2 |
| `specs/<id>/tasks.md` | Architect | Builder | G3 |
| `specs/<id>/verification.md` | Verifier | Everyone | G4 |
| `standards/*.yaml` | Architect | All validators | Every commit |
| `decisions/ADR-*.md` | Architect | Everyone | Any irreversible choice |
| `src/**`, `tests/**` | Builder | Verifier | G4 |

## Gates

| Gate | Entry criteria | Exit criteria (all must hold) |
| --- | --- | --- |
| **G1 Spec approved** | A problem statement from a stakeholder, plus the answers to the Explorer's question set | `spec.md` has numbered requirements, each with acceptance criteria; `Status: approved`; accessibility, security and out-of-scope sections present |
| **G2 Plan approved** | G1, plus `standards/` read | `plan.md` names the layers, files, contracts, error paths and trade-offs; contract deltas applied to `standards/`; ADRs written; `tasks.md` ordered and checkable |
| **G3 Build complete** | G2 | Every task checked; unit, component, integration and e2e suites pass; `tsc --checkJs` and all four validators pass; no task silently dropped |
| **G4 Verified** | G3, independent reviewer | `verification.md` records command + observed output for each claim; the requirement → test → evidence mapping is complete; accessibility and security checklists signed; defects either fixed or explicitly accepted with a reason |

A gate is not a meeting. It is a state that either the artifacts satisfy or they do not.

## Sequence

```
stakeholder need
      │
      ▼
 [Explorer] ── spec.md ──▶ G1 ──▶ [Architect] ── plan.md + contracts + ADRs + tasks.md ──▶ G2
                                                                            │
                                                                            ▼
                                                                       [Builder]
                                                     src/** + tests/** + tasks checked
                                                                            │
                                                                            ▼
                                                                         G3 │
                                                                            ▼
                                                                       [Verifier]
                                                            verification.md  ──▶ G4 ──▶ merge
                                                                            │
                                                     defect ▲───────────────┘
                                                            │  back to [Builder] with the
                                                            └─ failing command and its output
```

## Handoffs

A handoff is accepted or rejected, never "mostly accepted". The sending role states, in order:

1. **Artifact paths** — the files the next role must read, and nothing else.
2. **Assumptions made** — the decisions taken without evidence, so they can be challenged.
3. **Open questions** — explicitly unanswered items. An unanswered question in a G1 handoff is a G1
   rejection; in a G2 handoff it is a risk recorded in `plan.md`.
4. **Evidence so far** — commands already run, if any.
5. **Definition of done** — what the receiving role must be able to demonstrate.

The receiving role checks the entrance criteria **before** starting work. Starting a build on an
unapproved spec is a process violation even if the result is correct (Article I).

## Spec status lifecycle

`draft` → `approved` → `in-progress` → `implemented` → `verified` → (`superseded`).

Only the Explorer moves `draft` to `approved`; only the Builder moves `approved` to `in-progress` and
`in-progress` to `implemented`; only the Verifier moves `implemented` to `verified`. A status change is
a line edit in `spec.md`, so it is reviewable in the diff (`SPC-007` reads it).

## Parallel and concurrent work

- **One spec per feature.** Two features never share a `spec.md`; shared work becomes a dependency or
  its own feature.
- Builders may run in parallel only when their file sets and contract deltas do not overlap.
  Two builders touching `standards/*.yaml` is a conflict by definition: serialise them.
- The Architect is a single serialiser for contract changes (`.specweb/standards/**`). This is the
  platform's one hard bottleneck, and it is deliberate — contract drift is the failure mode this
  workflow exists to prevent.
- A Builder that discovers it needs a contract change **stops** and hands back to the Architect
  rather than editing the contract (Article X). Queue the work; do not race it.
- Features merge in dependency order. Feature B may read Feature A's `index.js` only after A is
  `verified`, not while A is `in-progress`.

## Change control

| Change | Route |
| --- | --- |
| A requirement is unclear | Back to Explorer; spec is amended, `Status` returns to `draft` for review |
| A new requirement appears mid-build | New or amended requirement in `spec.md`, then re-plan; never a silent scope addition |
| The plan is wrong | Architect amends `plan.md`; a rejected approach is recorded in an ADR rather than deleted |
| A contract must change | Architect only, with an ADR explaining why the platform changes (Article X) |
| A defect is found | Builder fixes; the Verifier records it in `verification.md` with the failing command |
| Behaviour must ship without a fix | Explicit, written acceptance by the Verifier with a follow-up task id — "known issue" with no id is not acceptance |

## Escalation

Escalate (stop and hand back) when any of these is true:

1. A rule in `.specweb/` blocks the work for a legitimate reason.
2. Two documents contradict each other (`constitution.md` precedence decides which is wrong, and the
   losing document gets fixed).
3. The spec is silent on something that changes user-visible behaviour.
4. A security or accessibility requirement cannot be met as specified.
5. Three attempts at the same defect have failed (the problem is a misdiagnosis, not a bug).

Escalation means: write down the blocker, the evidence, and the options considered. It does not mean
"proceed on a verbal waiver" — an undocumented exception is a violation even when the call is right.

## Definition of Ready (a Builder may start)

- `spec.md` is `approved` and its acceptance criteria are testable.
- `plan.md` names the files to create or change, and the contract deltas are already in `standards/`.
- `tasks.md` is ordered, each task is small enough to verify in one pass, and the first task is clear.
- The test approach and the evidence each task must produce are stated.

## Definition of Done (any role)

- The artifacts for the role exist, are complete, and link to each other by path.
- Every claim is backed by a command and its output (Article VII).
- The four validators pass on the current tree, without disabling a rule or lowering a threshold.
- No new warning was introduced, and no existing warning was left unexplained in the diff.
- Nothing was added to the platform to make a feature pass (Article X).

## Anti-patterns

- A builder starting "just the small parts" while the spec is still `draft` (Article I violation).
- A plan that lists files but not error paths, contracts or trade-offs; it is a task list wearing a
  plan's name.
- Verification that repeats the Builder's own tests without attempting to falsify anything.
- A defect report without a command and its output; the Builder cannot reproduce it and the loop
  costs two round trips.
- Editing `.specweb/` in a feature branch and calling it "keeping the contract accurate".
- A "small" scope addition agreed verbally in review and never written into `spec.md`.
