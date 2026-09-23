# ADR-0000 — <Short title stating the decision>

> **Status:** proposed | accepted | rejected | deprecated | superseded by ADR-0000
> **Date:** YYYY-MM-DD · **Deciders:** <names> · **Supersedes:** <ADR-nnnn or none>
> **Affects:** <files, contracts, layers, validators>

## Context

What is true right now that makes this decision necessary? Facts, numbers and constraints, not
opinions: volumes, latencies, browser support, team size, deadlines, the requirement that forced the
question. Name the forces that pull in different directions, because that tension is the reason the
decision needs recording at all.

## Decision

State the decision in the active voice, in one or two sentences, so it can be quoted without its
context and still mean something:

> We will <do the thing>, because <the force that decided it>.

Then the specifics: what changes, from what, to what, and in which files or contracts. If the decision
has a scope boundary ("only for the public marketing pages"), state it — an unbounded decision is the
one that gets misapplied six months later.

## Consequences

- **Easier:** what becomes simpler, faster or safer as a result.
- **Harder:** what becomes more constrained, more verbose or more manual.
- **Now impossible:** what the decision rules out — the honest cost.
- **Must revisit:** the conditions under which this decision should be re-examined (a version, a
  traffic level, a team size, a date), and what would trigger a superseding record.
- **Migration:** what has to change now, and what may lag behind.

## Alternatives considered

| Option | Why it lost |
| --- | --- |
| <option A> | <the concrete reason — cost, risk, capability, or a requirement it cannot meet> |
| <option B> | <…> |

"None" is not an acceptable answer here: a decision with no alternatives is a decision that was not
made deliberately.

## Compliance

How this decision is enforced, named precisely:

- **Validator:** `<rule id>` in `tools/validate-*.mjs`, configured in
  `standards/<contract>.yaml`.
- **Review:** the checklist item in `skills/<skill>/SKILL.md` that a reviewer must sign.
- **Test:** the test file and assertion that fails if the decision is violated.
- **Convention:** the document in `conventions/` that states it, plus how a deviation is spotted.

If the only answer available is "future reviewers will remember", say so explicitly and explain why no
mechanism is possible — an unenforced decision is a known weakness, and writing it down converts a
silent assumption into a visible one.

## References

- Related ADRs, requirements (`R-n`), specifications, issues or external documentation.
