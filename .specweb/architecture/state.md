# Architecture — State

**Scope.** Client state, its ownership, its shape, and how it changes over time. Server state — and
the cache that holds it — belongs to `data-access.md`.

**Enforced by.** `architecture/state.md` review rules (`skills/verify-architecture`),
`tools/validate-architecture.mjs` layer rules (`ARCH-002`, `ARCH-004`).

## One store per owner

A store is created by `createStore` and owned by exactly one module: the feature that owns the
state, or `src/state/` for genuinely cross-feature state (session, theme, notifications).

```js
/**
 * @file Task board store — the single owner of board state.
 * @module features/task-board/stores/task-board.store
 */

import { createStore } from '../../../state/create-store.js';

const initialState = { boardId: null, tasks: {}, order: [], filter: 'open', status: 'idle' };

export const { getState, subscribe, actions } = createStore(initialState, {
  /** @param {{ tasks: import('...').Task[] }} payload */
  tasksLoaded(state, payload) {
    const tasks = {};
    for (const task of payload.tasks) tasks[task.id] = task; // normalise on the way in
    return { ...state, tasks, order: payload.tasks.map((t) => t.id), status: 'ready' };
  },
  filterChanged(state, filter) {
    return { ...state, filter };
  },
  statusChanged(state, status) {
    return { ...state, status };
  },
});
```

Rules the shape of every store:

- **Normalised.** Entities are keyed by id in a map; order is a separate array of ids. No nested
  copies of the same record in two places.
- **Immutable.** Actions return a new state object. Nothing mutates the previous state, ever, so
  reference equality is a valid change signal and time-travel debugging stays possible.
- **Small.** `status` is an enum (`idle | loading | ready | empty | error`), never a bag of booleans
  (`isLoading`, `isLoaded`, `hasError`, `didFail`) that can contradict itself.
- **Serialisable.** State holds plain data: no DOM nodes, class instances, functions or promises.
  An in-flight request is represented by `status: 'loading'`, not by a promise in the state tree.
- **Derived state is not stored.** Filtered lists, counts and formatting come from selectors, so they
  can never be stale.

## Actions, selectors, subscriptions

- `actions.<name>(payload)` is the only way to change state. Components dispatch *intent*; they never
  write.
- Selectors are pure and total: `selectVisibleTasks(state)` returns the same result for the same
  input and never mutates it. They run on read, not on every action.
- `subscribe(listener)` returns an unsubscribe function, and the listener receives `(state, prev)`.
  Views subscribe in `connectedCallback` and unsubscribe in `disconnectedCallback` — the single most
  common leak in web components.
- Notification is batched to a microtask, so five synchronous actions produce one render.

## Server state

Stores do not call `fetch`. A store action calls a feature client
(`features/<id>/services/<id>.client.js`), awaits the result, then dispatches the success or failure
action. That keeps the network in the service layer where it can be stubbed, and keeps the store
synchronous and testable.

```js
async function loadTasks(boardId) {
  actions.statusChanged('loading');
  try {
    actions.tasksLoaded({ tasks: await tasksClient.list(boardId) });
  } catch (error) {
    actions.loadFailed(error); // error is an AppError with a code, never a raw Response
  }
}
```

A cache is server state: it lives in the service layer, is keyed by request identity, and is
invalidated by explicit calls (`client.invalidate(id)`) rather than by store subscription.

## Persistence

- Only user *preferences* may be persisted client-side, and only through an explicit adapter
  (`src/services/storage.js`) — never by a store reaching into `localStorage` directly.
- Duration-limited data (tokens, profile cache) uses the adapter's TTL option and is cleared on
  sign-out. Authentication material is never persisted (Article VI).
- `src/services/storage.js` validates on read: persisted JSON is untrusted input and may be corrupt
  or from an older schema.

## Debugging

`createStore` exposes a dev-only `__snapshot()` and records the action name beside each change, so a
bug report can say "after `filterChanged` the list was empty" instead of "sometimes it breaks".
Nothing dev-only ships in production: it is behind `config.debug`.

## Review rules

| ID | Rule |
| --- | --- |
| S1 | Each piece of state has exactly one owning module. |
| S2 | State changes only through an action; views never write. |
| S3 | State is normalised, immutable, serialisable and enum-statused. |
| S4 | Derived values are selectors, never stored fields. |
| S5 | Every `subscribe` has a matching unsubscribe on disconnect. |
| S6 | Stores call clients; they never call `fetch`. |
| S7 | Client persistence goes through `src/services/storage.js` only. |

## Anti-patterns

- Two stores holding the same record, drifting apart within one session.
- Copying server data into a store "to make rendering easier" and then having two sources of truth.
- A store that exports its internal object for direct mutation (`export const state = {...}`).
- Subscribing once at boot to every store because unsubscribing "was annoying" — now every
  navigation leaks a listener.
- `useState`-style local component state for data that another component already needs.
