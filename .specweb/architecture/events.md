# Architecture — Events

**Scope.** Two event channels exist, and choosing the wrong one is the most common architectural
mistake in a web-component codebase. This document fixes the choice, the naming, the payload shape
and the lifecycle for both.

**Enforced by.** `architecture/events.md` review rules (`skills/verify-architecture`),
`tools/validate-components.mjs` (`CMP-014`).

## The two channels

| Channel | Mechanism | Reaches | Use for |
| --- | --- | --- | --- |
| **DOM events** | `dispatchEvent` on an element, `bubbles: true`, `composed: true` | Ancestor elements, in DOM order | Anything an ancestor owns: user intent from a child element, form submission, close/confirm, selection change. |
| **Application bus** | `src/services/event-bus.js` | Any subscriber, anywhere | Cross-cutting notifications with no DOM relationship: `app:route-changed`, `app:session-ended`, `app:network-status-changed`, `app:notify`. |

Rule of thumb: **if the sender can name its ancestor, use a DOM event.** A card does not know its
board, so it bubbles. A store cannot bubble, so it uses the bus. If you cannot answer "which ancestor
should hear this?" then the answer is the bus.

Hierarchy of preference, in order: (1) call an action or a property setter directly, (2) dispatch a
DOM event, (3) publish on the bus. Steps two and three are for decoupling, not for avoiding an
import you are allowed to have.

## Naming

Event types are `<namespace>:<noun>-<past-tense-verb>` in the DOM and on the bus alike, always
lowercase, kebab-case, never a bare verb.

| Good | Why |
| --- | --- |
| `app:task-complete` | Namespaced, noun + intent, safe to bubble |
| `app:route-changed` | Past tense: it has already happened |
| `app:session-ended` | No payload ambiguity |
| `complete` | **Rejected** — no namespace, collides with future/third-party events |
| `app:onTaskComplete` | **Rejected** — `on` prefix and camelCase belong to callback APIs |
| `app:task-will-complete` | **Rejected** — cancellation lives in a cancellable event with a clear owner |

The vocabulary is closed: adding a new `app:` type requires adding it to the table below in the same
change, so the contract cannot drift from the code.

## Well-known vocabulary

| Type | Channel | Detail | Emitted by |
| --- | --- | --- | --- |
| `app:route-changed` | bus | `{ from: string, to: string }` | Router, after mount |
| `app:session-started` | bus | `{ user: { id: string } }` | Session store |
| `app:session-ended` | bus | `{ reason: 'signed-out' \| 'expired' \| 'forbidden' }` | Session store |
| `app:network-status-changed` | bus | `{ online: boolean }` | `src/services/network.js` |
| `app:notify` | bus | `{ level: 'info' \| 'success' \| 'warning' \| 'error', message: string }` | Any layer (rendered by the shell) |
| `app:task-complete` | DOM | `{ taskId: string }` | `app-task-card` |
| `app:form-submitted` | DOM | `{ formId: string, values: object }` | `app-form` |
| `app:form-invalid` | DOM | `{ formId: string, fields: Record<string,string> }` | `app-form` |

## Payload rules

- `detail` is a **plain, structured-cloneable** object: no DOM nodes, no class instances, no
  functions, no getters with side effects. `structuredClone(detail)` must succeed; that is the test.
- Payloads carry **identifiers, not records**. `{ taskId }` lets the listener read current state;
  `{ task }` silently resurrects stale data.
- A payload is documented next to the dispatch site with `@event` + `@type`, and the listener must be
  able to work from the documentation alone.
- Errors do not travel as event payloads. A failed operation is an `AppError` returned through the
  normal control flow (`data-access.md`).

## Lifecycle

- `on()` returns an unsubscribe function. Every subscription happens in `connectedCallback` (or
  module init for long-lived services) and is released in `disconnectedCallback` or by the caller's
  teardown. A subscription whose owner is gone is a leak, not a listener.
- The bus holds **weak-by-convention** references only: it never keeps a store or element alive.
- Handler exceptions are isolated: the bus catches, logs and continues to the next subscriber. One
  broken listener must not break the emission path.
- Emission is synchronous for DOM events (the platform decides) and **batched to a microtask** for
  the bus, so an event storm produces one render pass. A handler may emit another event, but a cycle
  is contained by the bus's cycle counter and logged as a defect.
- Bus events are not cancellable and have no return value. If a caller needs a veto, that is a
  return value or a promise — not an event.

## Rules

| ID | Rule |
| --- | --- |
| E1 | Event types are `app:<noun>-<verb>`, lowercase kebab-case. |
| E2 | Every emitted type appears in the well-known vocabulary table. |
| E3 | `detail` is structured-cloneable and identifier-based. |
| E4 | DOM events set `bubbles: true` and `composed: true` unless documented otherwise. |
| E5 | Every `on()`/`addEventListener` has a matching release on teardown. |
| E6 | No handler shares mutable state through the event object. |
| E7 | The bus is never used to reach a specific element ("emit so that X reacts"). |

## Anti-patterns

- A component subscribing to a bus event so it can render the value another component just emitted —
  that is state, and it belongs in a store.
- Event names derived from UI ("`app:button-clicked`") rather than intent ("`app:task-complete`").
- Emitting a full object graph in `detail` and letting listeners mutate it.
- Subscribing in the constructor, before the element can be disconnected, with no way to release it.
- Using a DOM event to reach a non-ancestor by dispatching at `document` level; that is the bus
  wearing a disguise.
