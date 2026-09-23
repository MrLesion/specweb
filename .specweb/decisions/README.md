# Architecture Decision Records

**Purpose.** Record the choices that are expensive to reverse and the reasoning that produced them, so
the reasoning is not re-litigated from memory two years later — and so an agent can find out *why* a
rule exists before proposing to break it (Article VIII).

## When a decision record is required

| Trigger | Example |
| --- | --- |
| Any runtime dependency or polyfill | Adding a charting library, or core-js |
| Any change to `standards/*.yaml` | New rule, changed severity, retired rule |
| Any change to the layer model or a boundary | Allowing `components` to import a store |
| A data-access, routing, auth or storage pattern | Moving from cookie auth to bearer tokens |
| Anything touching `constitution.md` | Amending an article |
| A significant trade-off with a visible loser | Choosing stale-while-revalidate over a blocking spinner |
| A rejected approach that will be proposed again | "Why not use `localStorage` for the session?" |

Not required for: naming choices, formatting, library-internal usage, or anything reversible within one
commit. If the decision is cheap to undo, undo it instead of documenting it.

## Numbering and naming

- File name: `ADR-<nnnn>-<kebab-case-title>.md`, zero-padded to four digits
  (`ADR-0001-no-runtime-frameworks.md`).
- Numbers are allocated in order and **never reused**, even if a record is rejected or withdrawn.
- The title states the decision, not the topic: "no-runtime-frameworks", not "frameworks".

## Status lifecycle

`proposed` → `accepted` → (`deprecated` | `superseded by ADR-nnnn`)

- Only an accepted record is binding.
- Records are **append-only**. A superseded record keeps its text verbatim; only its status line and a
  link to its successor are edited. Rewriting history destroys the ability to see what was believed,
  and when.
- A rejected proposal is kept as `rejected` with its reasons, because the same idea returns.

## Content requirements

Every record answers, in this order:

1. **Context** — the situation and the forces at play, in facts (numbers, constraints, deadlines).
2. **Decision** — the choice, stated in the active voice: "We will …".
3. **Consequences** — what becomes easier, what becomes harder, what is now impossible, and what must
   be revisited later. Honest negatives are the most valuable part.
4. **Alternatives considered** — each option with the reason it lost. "None" is not an answer.
5. **Compliance** — how the decision is enforced (a validator rule id, a review checklist item, or
   explicitly "review only").

A decision record with no enforcement section is a wish, not a decision (Article II).

## How tooling uses records

- `validate-architecture.mjs` reports an external import that is not on the policy allowlist
  (`ARCH-005`) and points at `requireDecisionRecord`, so adding a dependency without a record is a
  build failure rather than a policy violation nobody notices.
- Records are plain Markdown with a deterministic header, so they can be grepped by an agent:
  `grep -l "status: accepted" .specweb/decisions/*.md`.
- A contract rule set to `enabled: false` must cite the ADR that retired it in a comment beside it.

## Index

Kept in the repository's own ADR list; the table below is the living index and is updated in the same
commit as the record.

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| — | *(none yet — the platform's initial rules are the constitution)* | — | — |

## Anti-patterns

- A record written after the fact to justify a decision already shipped; the status becomes
  `retrospective` and the divergence is stated in the Context.
- Rewriting an accepted record instead of superseding it.
- A record with no alternatives, which usually means the options were never compared.
- Treating the ADR as a design document; it explains one decision, not the whole feature (that is
  `plan.md`).
- Using an ADR to grant a permanent exception. Exceptions expire: the record names a removal date.
