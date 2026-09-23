# Plan — <Feature name>

> Spec: ./spec.md · Status: draft
> Architect: <name> · Date: <YYYY-MM-DD>

## Approach

Two or three paragraphs: the shape of the solution, and why this shape rather than the obvious
alternative. Name the requirement that drove each significant decision.

## Layers

Which layer owns what, one row per module. The owner of the data owns the behaviour.

| Module | Layer | Responsibility |
| --- | --- | --- |
| `<path>` | | |

## Files

| File | Create / change | Test |
| --- | --- | --- |
| | | |

## Data flow

Per requirement, the path a change travels. Mark every layer boundary the arrow crosses; a boundary
crossed upward is a design defect (`ARCH-002`).

```
app:task-complete (DOM) → actions.completeTask → tasks.client.complete → store → selector → render
```

## Contract delta

Before → after for each `standards/*.yaml` change, the requirement that forces it, and the ADR that
justifies it. Include the validator output proving the delta leaves the tree green.

```yaml
# standards/route-contract.yaml
# before: routes: []
# after:  routes:
#           - id: task-board
#             path: /boards/:boardId
```

## Events

New `app:` event types, their channel (DOM or bus), their payload, and the
`architecture/events.md` table row added in the same change.

## Failure modes

| AppError code | User-visible behaviour | Test |
| --- | --- | --- |
| | | |

## Accessibility plan

Keyboard path, focus movement, announcements, contrast tokens, target size, reduced-motion behaviour.

## Security review

New DOM sinks, URL sinks, storage, dependencies and CSP impact — or an explicit "none".

## Test plan

| Requirement | Level | File | What makes it fail |
| --- | --- | --- | --- |
| R-1 | | | |

## Risks and unknowns

| Risk | Probability | Impact | Probe task |
| --- | --- | --- | --- |
| | | | |

## Out of scope

Restated from the spec. If it changed, say so explicitly and say who agreed.
