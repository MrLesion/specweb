# SpecWeb Constitution

> **Version 1.0.0** — ratified 2026-09-23.
> This is the highest-precedence document in the repository. Nothing in `architecture/`,
> `conventions/`, `standards/`, `skills/` or application code may contradict it.
> Amendments require an approved decision record in `../decisions/` **and** a corresponding
> change to `tools/` (see *Compliance*).

## Preamble

SpecWeb exists because the expensive failures in web development are not typing failures — they are
*agreement* failures. Two people, or one person six months apart, silently disagree about where data
lives, who owns a boundary, or what "done" means. The articles below convert those agreements into
artifacts that can be read, reviewed and mechanically checked.

An article has three parts: the **Rule** (normative, testable), the **Rationale** (why it is worth
the friction), and the **Enforcement** (the rule IDs or gates that make it real). A rule with no
enforcement is documentation; a rule with enforcement is architecture.

## Article I — Specification before implementation

**Rule.** No production code is written for a feature until `specs/<feature-id>/spec.md` exists and
carries `Status: approved`. Requirements are numbered (`R-1`, `R-2`, …), written as testable
statements, and each is bound to at least one acceptance criterion (`AC-n` referencing `R-n`).
Exploration happens in `specs/<id>/spec.md`, not in a scratch branch.

**Rationale.** Code written before the problem is agreed is rework with a test suite attached.
Numbered requirements make review a checklist instead of a discussion, and give the Verifier
something falsifiable to check.

**Enforcement.** Gate G1; `validate-spec-coverage.mjs` rules `SPC-001`, `SPC-005`, `SPC-006`.

## Article II — Contracts are executable

**Rule.** Every architectural rule that a machine can check must exist in `standards/*.yaml` and be
enforced by a tool in `tools/`. If a rule cannot be expressed, it belongs in a review checklist
(`skills/review-accessibility/SKILL.md`) and must say so explicitly. Contract changes are versioned
and recorded in the feature's `plan.md` under *Contract delta*.

**Rationale.** A rule that only exists in prose decays with the first deadline. A rule that fails a
command does not.

**Enforcement.** All four validators; `standards/*.yaml` is parsed at every run, and an unparsable
or missing contract is a tool error (exit `2`), never a silent pass.

## Article III — Layer boundaries are absolute

**Rule.** Dependencies flow in one direction only:
`app → routes → features → {state, services, components} → utils`.
Higher layers may import lower ones; lower layers may never import higher ones, and may never import
a sibling by reaching into its internals. A feature exposes exactly one public entry point,
`src/features/<id>/index.js`; cross-feature imports must go through it. `utils` and `components`
import no application state and no services.

**Rationale.** Layering is what makes a module testable in isolation and replaceable later. Every
real-world "we can't test this" starts with an inverted import.

**Enforcement.** `standards/dependency-policy.yaml`; `validate-architecture.mjs` rules
`ARCH-001`…`ARCH-011`.

## Article IV — One owner for every piece of state

**Rule.** Each piece of state has exactly one owning module. Stores own client state; services own
server state and its cache; DOM owns nothing but presentation. Data flows down as properties and
attributes, and up as events. Components never mutate a store directly — they call an action, and
the store notifies subscribers.

**Rationale.** Shared mutable state is the single largest source of non-deterministic bugs in
browser applications, and the hardest to reproduce.

**Enforcement.** `architecture/state.md` and `architecture/events.md` review rules;
`validate-architecture.mjs` `ARCH-002`/`ARCH-004` stop components and utils from importing stores
across layer boundaries.

## Article V — Accessibility is a requirement, not a phase

**Rule.** WCAG 2.2 level AA is the baseline for every user-facing change. Keyboard operability,
visible focus, programmatic names for controls, and error identification are part of the
*acceptance criteria* — not a follow-up ticket. Automated checks (axe) are mandatory but never
sufficient: keyboard-only and screen-reader passes are manual, and the result is recorded as
evidence.

**Rationale.** Accessibility defects are architectural: retrofitting a focus model or a semantic
structure costs an order of magnitude more than building one. They are also legal exposure.

**Enforcement.** `architecture/accessibility.md`; `skills/review-accessibility/SKILL.md`;
`validate-components.mjs` `CMP-017`/`CMP-018` (focusable semantics and label wiring);
`validate-spec-coverage.mjs` `SPC-005` requires an accessibility section in every spec.

## Article VI — Security by default

**Rule.** Untrusted data is never assigned to `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or URL
attributes. Authentication material lives in memory and in `HttpOnly; Secure; SameSite` cookies —
never in `localStorage` or `sessionStorage`. Runtime dependencies are forbidden unless an approved
decision record grants an exception; third-party scripts require Subresource Integrity. A Content
Security Policy without `unsafe-inline` is required for production, and every mutation to a
server-owned resource is CSRF-protected.

**Rationale.** The browser executes whatever it is given; the only reliable defence is a small
number of non-negotiable rules applied at the moment of writing.

**Enforcement.** `architecture/security.md`; `validate-architecture.mjs` `ARCH-005`/`ARCH-006`
(dependency policy); `validate-components.mjs` `CMP-015` (unsafe DOM sinks); the security checklist
in `skills/verify-architecture/SKILL.md`.

## Article VII — Verification is evidence

**Rule.** A claim of completion is only accepted with the command that produced it and its verbatim
output, recorded in `specs/<id>/verification.md`. "Tests pass", "works locally" and "should be fine"
are not evidence. The Verifier must attempt to falsify the work: an empty or trivially-true test
suite is a defect. Features are verified by someone other than the author whenever a second party
exists.

**Rationale.** Every wasted debugging session begins with an unverified claim. Recorded evidence is
also the cheapest possible regression suite for the *process*, not just the code.

**Enforcement.** Gate G3 and G4; `validate-spec-coverage.mjs` `SPC-004`, `SPC-008`, `SPC-009`.

## Article VIII — Decisions are recorded

**Rule.** Any choice that is expensive to reverse — a new dependency, a data-access pattern, a
routing strategy, a contract change — gets an Architecture Decision Record in `../decisions/` with
*Context*, *Decision*, *Consequences* and *Alternatives considered*. Records are append-only: a
superseded record keeps its text and gains a link to its successor.

**Rationale.** The reason behind a decision is the part that is lost first, and the part needed most
when the decision must be revisited.

**Enforcement.** `../decisions/README.md`; the Architect's definition of done in
`agents/architect.md`; `validate-architecture.mjs` `ARCH-012` (dependency additions must cite an
AD record).

## Article IX — Standards first, dependencies last

**Rule.** Build with the platform: ES modules, Custom Elements, Constructable Stylesheets, the
History API, `fetch`, `AbortController`, CSS Layers and Container Queries. No runtime dependency, no
transpiler, no framework, no runtime polyfill. A dependency is permitted only by decision record,
must be declared in `standards/dependency-policy.yaml`, and must be justified against the platform
feature it replaces.

**Rationale.** Every runtime dependency adds an upgrade treadmill, a supply-chain surface and a
bundle cost that is paid forever. The platform caught up with most of what applications actually
need; what remains is rarely worth owning.

**Enforcement.** `standards/dependency-policy.yaml` (`externals.allow`); `validate-architecture.mjs`
`ARCH-005`, `ARCH-006`, `ARCH-012`.

## Article X — The platform outlives the feature

**Rule.** Feature work may add to `.specweb/` only through the Architect, only as a deliberate,
reviewed contract delta, and never to silence a failing check. Disabling a rule, widening a
boundary, or lowering `--max-warnings` to pass a build is a constitutional violation regardless of
deadline. If a rule is wrong, fix the rule in a decision record; do not exempt the feature.

**Rationale.** A single exception is not a shortcut, it is a new precedent. The value of the
platform is exactly the value of the rules that are never waived.

**Enforcement.** Review of every diff touching `.specweb/`; `validate-architecture.mjs` fails when a
contract declares every rule disabled (no-op contract guard, `ARCH-013`).

## Compliance

- **Precedence.** Constitution → `architecture/` → `standards/*.yaml` → `conventions/` → `skills/` →
  local style. A contradiction in a lower document is a defect in that document.
- **Mechanical checks are the floor, not the ceiling.** Passing `tools/` proves conformance to what
  is machine-checkable. Reviews (`skills/review-accessibility`, `skills/verify-architecture`) cover
  what is not, and reviewers may not treat a green run as approval.
- **Escalation.** If a rule blocks work for a legitimate reason, the Builder stops and escalates to
  the Architect. Work does not proceed on a verbal waiver. An undocumented exception is a violation
  even if it turns out to be the right call.
- **Violations found late.** A violation discovered after merge is fixed forward: fix the code, add
  the check that would have caught it, and note it in the feature's `verification.md`.

## Amendment process

1. Propose the change with an AD record in `../decisions/` (drafts welcome, prose only).
2. State the article affected, the exact new wording, and the enforcement change in `tools/`.
3. Implement the tool change in the same commit as the wording change — never after.
4. Bump the constitution version: **major** for a new or removed article, **minor** for tightened
   wording, **patch** for clarification with no behavioural change.
5. Update this header's version and date, and record the bump in the AD record.

## Versioning

- **Platform** (this directory) uses semantic versioning; the current contract set is
  `apiVersion: specweb.dev/v1` and is asserted by every validator run.
- **Feature specs** are versioned by the repository's git history, not by a `version` field.
- **Rule IDs** are permanent identifiers. A rule is never renumbered or reused; retiring a rule
  marks it `enabled: false` in its contract with a comment pointing at the AD record that retired it.

## Ratification

This constitution took effect on 2026-09-23 with the initial publication of the platform. It applies
to all work in the host repository from that date forward, including work already in progress:
in-flight features must satisfy Article I before their next commit.
