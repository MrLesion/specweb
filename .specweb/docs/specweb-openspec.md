# Using SpecWeb alongside OpenSpec

This guide shows how the **permanent SpecWeb platform** (`.specweb/`)
works together with **OpenSpec** (`openspec/`) in this repo.

## Mental model

| Concern | Owner | Lifetime | Example |
| --- | --- | --- | --- |
| Permanent implementation constraints | SpecWeb (`.specweb/`) | Years | layering, component contract, validators |
| Change-specific requirements | OpenSpec (`openspec/changes/<name>/`) | Days to weeks | "add overdue badge to task board" |
| Feature gate artifacts | SpecWeb (`specs/<feature-id>/`) | Months | spec, plan, tasks, verification |
| Decision history | Both (`decisions/`, `openspec/changes/archive/`) | Permanent | ADR plus archived change |

Rule of thumb: **OpenSpec asks "what is changing and why", SpecWeb
decides "is this change shaped correctly and proven".**
Neither replaces the other.

## Directory map

```text
.specweb/                  # NEVER edited to make a feature pass (Article X)
openspec/
  config.yaml              # already points at .specweb (constitution, workflow, skills)
  changes/<change-name>/   # one folder per proposed change (OpenSpec lifecycle)
    proposal.md            # why + what (maps to SpecWeb spec.md Problem/Requirements)
    design.md              # how (maps to SpecWeb plan.md Approach/Files/Data flow)
    tasks.md               # work items (maps to SpecWeb tasks.md, one per R-n)
  specs/                   # long-lived capability specs
  changes/archive/         # completed changes
specs/<feature-id>/        # SpecWeb gate artifacts (Explorer, Architect, Builder, Verifier)
  spec.md | plan.md | tasks.md | verification.md
src/features/<id>/         # implementation (mirrors specs/<id>/, see SPC-007)
```

## Workflow: which tool when

```text
1. PROPOSE (OpenSpec)          openspec/changes/<name>/proposal.md
2. SPECIFY (SpecWeb G1)        specs/<id>/spec.md  ->  Status: approved
3. DESIGN (both)               openspec/.../design.md + specs/<id>/plan.md  ->  G2
4. BREAK DOWN (both)           openspec/.../tasks.md + specs/<id>/tasks.md
5. BUILD (SpecWeb G3)          src/** + tests/**, one task at a time, tree stays green
6. VERIFY (SpecWeb G4)         specs/<id>/verification.md (commands + verbatim output)
7. ARCHIVE (OpenSpec)          openspec/changes/<name>/ -> openspec/changes/archive/

Keep the two task lists in sync by making the **SpecWeb `tasks.md` the
source of truth** (it is what `validate-spec-coverage.mjs` checks) and
treating the OpenSpec `tasks.md` as a stakeholder-readable summary that
links to it.

## Example 1 - new feature end to end

Change: show an overdue badge on task cards.

```bash
# 0. Start clean and read the platform first (required by AGENTS.md)
node .specweb/tools/validate-spec-coverage.mjs --allow-empty

# 1. OpenSpec: scaffold the change (proposal -> design -> tasks)
#    Creates openspec/changes/overdue-badge/ (or copy the last archived
#    change as a template).
ls openspec/changes/

# 2. SpecWeb G1: Explorer writes the spec from the proposal
#    specs/overdue-badge/spec.md - Status: draft -> approved
#    Requirements are EARS statements (R-1, R-2...), each with AC-n.m.
node .specweb/tools/validate-spec-coverage.mjs --root .

# 3. SpecWeb G2: Architect writes plan + tasks, applies contract deltas
#    specs/overdue-badge/plan.md, specs/overdue-badge/tasks.md
#    openspec/changes/overdue-badge/design.md mirrors the plan summary
node .specweb/tools/validate-architecture.mjs --allow-empty
node .specweb/tools/validate-components.mjs --allow-empty
node .specweb/tools/validate-routes.mjs --allow-empty
node .specweb/tools/validate-spec-coverage.mjs

# 4. Build: one task per commit, focused test first
npm run specweb:validate   # all four validators (see package.json)

# 5. Verify: Verifier re-runs every claim from a clean state
#    specs/overdue-badge/verification.md - verdict PASS, commands + output pasted verbatim

# 6. Archive the OpenSpec change once verification passes
#    openspec/changes/overdue-badge/ -> openspec/changes/archive/overdue-badge/
```

## Example 2 - bug fix (no new feature)

A pure fix that restores documented behaviour is a **task, not a
feature** (`skills/create-feature/SKILL.md` -> When not to use):

```bash
# 1. OpenSpec change with reproduction + expected behaviour
#    openspec/changes/fix-stale-badge/proposal.md

# 2. Add a failing test first, then the smallest fix.
#    Append the task to the owning feature's specs/<id>/tasks.md
#    (never silently; SPC-009 checks this once Status is implemented)

# 3. Prove it
node --test tests/unit/<area>
npm run specweb:validate
```

## Example 3 - contract change (route, component, dependency)

Contract changes go through the **Architect only** (Articles II, X):

```bash
# 1. State the delta in specs/<id>/plan.md as before -> after, with the R-n that forces it
# 2. Justify it in decisions/ADR-*.md ("R-7 cannot be verified without ...")
# 3. Apply it to .specweb/standards/*.yaml
# 4. Prove the tree is still green and paste the output into plan.md
node .specweb/tools/validate-architecture.mjs
node .specweb/tools/validate-components.mjs
node .specweb/tools/validate-routes.mjs
node .specweb/tools/validate-spec-coverage.mjs
```

Disabling a rule, widening a boundary, or lowering `--max-warnings` to
pass is a constitutional violation regardless of deadline. If a rule is
wrong, fix the rule with a decision record - do not exempt the feature.

## Daily commands

```bash
npm run specweb:validate   # all four SpecWeb validators
npm run specweb:specs      # gate artifacts only (G1-G4)
npm run check              # lint + test + all validators (add lint/test when they exist)
```

## Common mistakes

- Writing code while `spec.md` is still `draft` (Article I; G1 blocks code).
- Editing `.specweb/` in a feature branch "to keep the contract accurate".
- Treating a green validator run as approval - reviews
  (`skills/review-accessibility`, `skills/verify-architecture`) still apply.
- Verifying against `plan.md` only; the **spec is the contract**.
- Recording screenshots without a command; nobody can reproduce the run.
