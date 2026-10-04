/**
 * @file Minimal store factory. Actions return new state; listeners are batched to a microtask.
 * @module state/create-store
 */

/**
 * @template {Record<string, unknown>} State
 * @typedef {object} Store
 * @property {() => State} getState Read the current state.
 * @property {(listener: (state: State, previous: State) => void) => () => void} subscribe Subscribe; returns unsubscribe.
 * @property {Record<string, (payload?: unknown) => void>} actions Named state transitions.
 */

/**
 * Create a small immutable store with batched notifications.
 *
 * @template {Record<string, unknown>} State
 * @param {State} initialState Initial state value.
 * @param {Record<string, (state: State, payload?: never) => State>} reducers Pure reducers keyed by action name.
 * @returns {Store<State>} Store with getState, subscribe and actions.
 */
export function createStore(initialState, reducers) {
  /** @type {State} */
  let current = initialState;
  /** @type {Set<(state: State, previous: State) => void>} */
  const listeners = new Set();
  let scheduled = false;
  /** @type {State | null} */
  let previous = null;
  /** @type {string[]} */
  const history = [];

  function flush() {
    scheduled = false;
    if (previous === null) return;
    const next = current;
    const before = previous;
    previous = null;
    for (const listener of [...listeners]) {
      listener(next, before);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flush);
  }

  /** @type {Record<string, (payload?: unknown) => void>} */
  const actions = {};
  for (const [name, reducer] of Object.entries(reducers)) {
    actions[name] = (payload) => {
      const before = current;
      const next = /** @type {(state: State, payload?: unknown) => State} */ (reducer)(before, payload);
      if (next === before) return;
      history.push(name);
      previous = previous ?? before;
      current = next;
      schedule();
    };
  }

  return {
    getState() {
      return current;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    actions,
    /**
     * Dev-only snapshot helper. Not used in production paths.
     *
     * @returns {{ state: State, history: string[] }} Current state and action names.
     */
    __snapshot() {
      return { state: current, history: [...history] };
    },
  };
}
