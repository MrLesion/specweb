---
name: create-feature
description: Create the four gate artifacts for a new feature (spec, plan, tasks, verification) and wire it into the platform's standards.
---

# Skill — create-feature

**Purpose.** Produce a complete, gate-ready feature scaffold: `specs/<feature-id>/` with its four
artifacts, a registered feature id, and — once the spec is approved — a plan the Builder can execute
without further questions.

**Used by.** Explorer (steps 1–4), Architect (steps 5–9), Verifier (step 10).
**Rules.** Article I (no code before spec), `agents/workflow.md` gates, `standards/feature-contract.yaml`.

## When to use

- Work is larger than a single task and changes user-visible behaviour.
- Work spans more than one file in more than one layer.
- Work needs an entry in `standards/` (a route, a component, a client).

## When not to use

- A pure bug fix that restores documented behaviour; that is a task, not a feature.
- A refactor with no behaviour change; record it as an ADR-backed task instead.

## Inputs

| Input | Source | Required |
| --- | --- | --- |
| Feature intent, in the stakeholder's words | Stakeholder | yes |
| Feature id (kebab-case, stable) | Explorer | yes |
| Answers to `agents/explorer.md` question set | Domain expert | yes |
| Affected layers, routes and endpoints | Architect | at plan time |

## Procedure

1. **Choose the feature id** and confirm it matches `featureIdPattern` in
   `standards/feature-contract.yaml`, that `specs/<id>/` does not already exist, and that
   `src/features/<id>/` will be its home.
2. **Create the folder and copy the spec template**:
   `specs/<feature-id>/spec.md` from `templates/spec.md`.
3. **Fill every section** from the Explorer's question set, with `Status: draft`. Requirements are
   numbered `R-n`; acceptance criteria are numbered `AC-n.m` and cite their requirement.
4. **Review the spec with a second reader** (human or Verifier). Fix the requirement they cannot test.
   Set `Status: approved`. **Gate G1 is now satisfied — no code has been written.**
5. **Create `plan.md`** from `templates/plan.md`, with one paragraph per section and no placeholders
   left behind.
6. **Decide and apply contract deltas** in `standards/*.yaml`, plus an ADR per irreversible choice
   (`decisions/template.md`). Run the validators and record the output in `plan.md`.
7. **Create `tasks.md`** from `templates/tasks.md`: ordered, one reviewable change per task, each
   citing `R-n` and naming its evidence command.
8. **Create `verification.md`** from `templates/verification.md` so the Verifier has the shape ready.
   It stays empty of results until the build is `implemented`.
9. **Hand off to the Builder** with the five-part handoff from `agents/workflow.md`.
10. **Verify** with `skills/verify-architecture` and record the result; move `Status` to `verified`
    only on a `PASS` or `PASS WITH ISSUES` verdict.

## Templates

| Template | Destination |
| --- | --- |
| `templates/spec.md` | `specs/<id>/spec.md` |
| `templates/plan.md` | `specs/<id>/plan.md` |
| `templates/tasks.md` | `specs/<id>/tasks.md` |
| `templates/verification.md` | `specs/<id>/verification.md` |

## Verification

```bash
node .specweb/tools/validate-spec-coverage.mjs --root .
node .specweb/tools/validate-architecture.mjs --root .
```

Both must pass at G2 (contract deltas applied) and again at G4.

## Done criteria

- The four artifacts exist and contain no template placeholders.
- `spec.md` has every required section, and every `R-n` has at least one `AC-n.m` (`SPC-005`, `SPC-006`).
- `plan.md` names files, layers, data flow, failure modes and tests.
- `tasks.md` tasks each cite a requirement and name their evidence.
- `standards/*.yaml` changes are applied, ADR-backed and validator-clean.

## Common mistakes

- Creating `specs/<id>/` and `src/features/<id>/` with different ids, which breaks `SPC-007` and every
  review that tries to pair them.
- Leaving `Status: draft` while building; the Verifier cannot tell whether the plan was approved.
- Copying the feature id from a similar feature and leaving the old name inside the files.
- Writing tasks that name an outcome ("make the board work") instead of a change and its evidence.
