# SpecWeb

SpecWeb is a spec-driven development platform for web applications. It keeps the rules that
govern a codebase — architecture, conventions, machine-readable contracts, decisions and tooling —
in one versioned directory, so humans and AI agents build features the same way every time.

`.specweb/` is **permanent platform infrastructure**. It is never edited as a side effect of
shipping a feature, and it never contains product code. Feature work lives beside it, in the host
repository.

```
<host-repo>/
├── .specweb/                    # permanent platform (this directory)
├── specs/                       # one folder per feature, versioned with the feature
│   └── <feature-id>/
│       ├── spec.md              # WHAT and WHY  (approved before code)
│       ├── plan.md              # HOW           (architecture + contract deltas)
│       ├── tasks.md             # ordered, checkable work items
│       └── verification.md      # EVIDENCE      (commands + observed results)
├── src/                         # application source, layered (see architecture/application.md)
├── tests/                       # cross-feature test suites
├── docs/                        # user-facing documentation
└── public/                      # static assets served as-is
```

## Why two locations

| Concern | Lives in | Lifetime | Changed by |
| --- | --- | --- | --- |
| Platform rules, contracts, tooling | `.specweb/` | Years | Architect, deliberately, with a decision record |
| A single feature's spec, plan, tasks, evidence | `specs/<feature-id>/` | Months | Explorer → Architect → Builder → Verifier |

Keeping them apart is what stops "just this once" exceptions from silently rewriting the platform.
A feature may never edit `.specweb/` to make itself pass (`constitution.md`, Article X).

## Platform layout

```
.specweb/
├── README.md                  # this file — orientation
├── constitution.md            # immutable articles; highest precedence
├── architecture/              # how the system is shaped (application, components, routing,
│                              # state, data-access, events, forms, accessibility, styling,
│                              # testing, security)
├── conventions/               # how code is written (file-structure, naming, javascript, jsdoc,
│                              # imports, browser-support)
├── agents/                    # the four roles and the workflow that connects them
├── skills/                    # repeatable procedures, each with SKILL.md + templates/
├── standards/                 # machine-readable contracts consumed by tools/
├── decisions/                 # append-only Architecture Decision Records
└── tools/                     # zero-dependency Node validators (the enforcement layer)
```

## Precedence

When two documents disagree, the higher one wins, and the lower one is a bug:

1. `constitution.md`
2. `architecture/*`
3. `standards/*.yaml` (the executable form of 1–2)
4. `conventions/*`
5. `skills/*`
6. Local file style

## The four gates

| Gate | Producer | Required artifact | Blocks |
| --- | --- | --- | --- |
| G1 Spec approved | Explorer | `specs/<id>/spec.md` with `Status: approved` | Any code |
| G2 Plan approved | Architect | `specs/<id>/plan.md` + updated `standards/` | Any code |
| G3 Build complete | Builder | `specs/<id>/tasks.md` all checked, tests green | Any review |
| G4 Verified | Verifier | `specs/<id>/verification.md` with raw evidence | Merge |

The gates are mechanical, not aspirational: `tools/validate-spec-coverage.mjs` fails the build when
a gate's artifact is missing, malformed, or claims success without evidence.

## Working with the platform

Four roles, one at a time, in order: **Explorer → Architect → Builder → Verifier**. Each role has a
definition of ready, a definition of done, and a fixed set of artifacts it is allowed to write. See
`agents/workflow.md` for the handoff protocol and `agents/*.md` for each role's full contract.

When the host repository also uses OpenSpec, see `../docs/specweb-openspec.md` for how the two
fit together (OpenSpec change → SpecWeb gates G1–G4 → OpenSpec archive), with worked examples.

Repeatable procedures are packaged as *skills* (`skills/<name>/SKILL.md`) so the same task is done
identically every time. A skill that is used twice becomes a skill; a skill that becomes mandatory
becomes a validator rule.

## Tooling

The tools use **only Node built-ins** (Node 18+), so they run in any checkout with no install step,
no lockfile, and no supply chain.

```bash
# Run every gate check against the current repository
node .specweb/tools/validate-architecture.mjs
node .specweb/tools/validate-components.mjs
node .specweb/tools/validate-routes.mjs
node .specweb/tools/validate-spec-coverage.mjs

# Machine-readable output for CI or an agent's tool loop
node .specweb/tools/validate-architecture.mjs --format json --quiet

# Validate a different checkout without cd-ing into it
node .specweb/tools/validate-routes.mjs --root ../my-app
```

Exit codes are uniform across all four tools:

| Code | Meaning |
| --- | --- |
| `0` | All checks passed |
| `1` | At least one finding at `error` severity (or warnings above `--max-warnings`) |
| `2` | Tool or usage error — the check did not run to completion |

Every tool accepts `--help`, `--root <dir>`, `--standards <dir>`, `--format human|json`,
`--quiet`, `--allow-empty` and `--max-warnings <n>`. Rule IDs are stable and greppable, so an agent
can look up the fix in the architecture document that owns the rule.

## Glossary

- **Host repository** — the application being built; owns `specs/`, `src/`, `tests/`.
- **Contract** — a machine-readable rule in `standards/` that a validator enforces.
- **Gate** — a mandatory, checkable checkpoint between phases.
- **Finding** — one validator output line: rule ID, severity, file, line, message.
- **Evidence** — a command plus its observed output, pasted verbatim into `verification.md`.
- **Delta** — the change a feature proposes to a contract; recorded in `plan.md`.

## Non-goals

SpecWeb does not prescribe a framework, does not generate application code, and does not replace
tests. It constrains *how* work happens and *proves* that it happened — the application logic is
still yours to write, and the tests are still yours to run.
