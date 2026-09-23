# Architecture — Components

**Scope.** Custom elements are the only unit of UI composition. This document defines a component's
file shape, its public contract, and the behaviours it may and may not own.

**Enforced by.** `standards/component-contract.yaml`; `tools/validate-components.mjs`
(`CMP-001`…`CMP-018`).

## Anatomy

One custom element per file, defined in that file. The class is default-exported nowhere and named
exported everywhere; the tag name is declared in exactly one place in the source of truth (the
JSDoc `@element` tag).

The same contract governs all **element modules**: shared components (`*.component.js`), route view
elements (`*.element.js`) and form controllers (`*.form.js`). The validator scans all three suffixes,
and each has its permitted locations listed in `standards/component-contract.yaml`.

```js
/**
 * @file A single task card. Purely presentational: reads attributes, emits intent events.
 * @module features/task-board/components/task-card
 */

import { formatDueDate } from '../../../utils/date.utils.js';

const template = document.createElement('template');
template.innerHTML = `
  <li class="card" part="card">
    <h3 class="card__title"></h3>
    <p class="card__due" part="due"></p>
  </li>
`;

export class TaskCardElement extends HTMLElement {
  /** @type {string[]} Attributes this element observes and reacts to. */
  static observedAttributes = ['task-id', 'title', 'due-at', 'done'];

  #elements = {};
  #task = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    this.#elements.title = this.shadowRoot.querySelector('.card__title');
  }

  /**
   * Fired when the user asks to complete the task. Not fired on attribute change.
   * @event app:task-complete
   * @type {CustomEvent<{ taskId: string }>}
   */

  /** @param {string} name @param {string} oldValue @param {string} newValue */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.#render();
  }

  #render() { /* writes textContent only — never innerHTML from data */ }
}

customElements.define('app-task-card', TaskCardElement);
```

## The three-part contract

Every element documents all three parts, and the validator cross-checks the array against the docs.
An attribute that is not observed is not an input; state that is not documented is not public.

| Part | Direction | Declared as | Notes |
| --- | --- | --- | --- |
| **Attributes** | in, markup | `static observedAttributes` + `@attribute` JSDoc | kebab-case, string-typed, reflects state |
| **Properties** | in, script | class setter/getter + `@property` JSDoc | typed values, no string parsing required |
| **Events** | out | `@event app:<noun>-<verb>` JSDoc + `dispatchEvent` | namespaced, `detail` documented |

Attributes exist for markup authors (server-rendered HTML, specs, `data-` style configuration) and
are stringly typed by nature. Properties exist for script authors and keep their types. Both feed
the same internal state, and a property setter that has an attribute counterpart reflects to it so
the two can never disagree.

Elements **never** mutate the data they are given. A click on a card dispatches `app:task-complete`
with `{ taskId }`; the store listening to that event decides what happens. A component that writes
to a store is a component that cannot be tested in isolation (`ARCH-004`).

## Events

```js
this.dispatchEvent(new CustomEvent('app:task-complete', {
  detail: { taskId: this.#task.id },
  bubbles: true,
  composed: true, // must cross the shadow boundary to reach the router or a store
}));
```

- `bubbles: true` always; `composed: true` whenever the element may sit inside a shadow root.
- `detail` is a plain, structured-cloneable object. No DOM nodes, no class instances, no functions.
- Cancellable events (`cancelable: true`) are for vetoable intent only, and the veto is documented.
- The full event vocabulary lives in `architecture/events.md`; an event type not namespaced `app:`
  fails `CMP-014`.

## Shadow DOM policy

- `mode: 'open'` always — `closed` breaks testing, accessibility tooling and debugging (`CMP-016`).
- The shadow root is created in the constructor and never re-created.
- Content that must be reachable by the light DOM (form controls, slotted content, anchors) is
  slotted, not shadowed.
- Whether an element *has* a shadow root is a rendering detail and never observable through its
  public contract; consumers rely on attributes, properties, events and CSS parts only.
- Parts (`part="..."`) and custom properties are the styling API. A consumer that reaches into
  `shadowRoot` from outside is a defect.

## Rendering rules

- A static template is built once at module scope into a `<template>` and cloned per instance;
  parsing the same markup per instance is a performance defect.
- All data written to the DOM uses `textContent`, `setAttribute` with a validated value, or
  `replaceChildren`. Assigning data to `innerHTML`, `outerHTML` or `insertAdjacentHTML` fails
  `CMP-015` (Article VI). The single permitted use of `innerHTML` is assigning a **compile-time
  constant string with no interpolation** to a `<template>` (as shown above), which is HTML, not
  data.
- `attributeChangedCallback` is idempotent and cheap: it writes at most the affected nodes, and it
  returns early when the value is unchanged.
- Rendering never changes focus, never scrolls, and never moves nodes that the user is interacting
  with.

## Styling

- Shadow styles come from a shared `CSSStyleSheet` adopted at construction
  (`adoptedStyleSheets`), imported from `src/styles/` — no per-element `<style>` injection, no
  inline `style` attributes for theming, and no `<style>` appended to `document.head`
  (`CMP-013`).
- Theming hooks are CSS custom properties (see `styling.md`), and layout bugs are fixed by the
  consuming layout, not by the component hard-coding a width.
- A component may not style itself based on where it is used (no `:host-context` layout
  assumptions).

## Accessibility

Every element that is interactive must be operable without a pointer. Presence of a `click` listener
without a matching keyboard path and an accessible name fails `CMP-017`; a control that renders a
native form element without a wired label fails `CMP-018`.

- Prefer extending semantics you already have: render a real `<button>`, `<a href>`, `<input>`,
  `<select>`, `<dialog>` inside the shadow root rather than a `div` with handlers.
- If a custom element must be focusable, set `tabindex="0"` **and** `role` **and** handle
  `Enter`/`Space` — all three, or none.
- State that changes visually must change programmatically: `aria-pressed`, `aria-expanded`,
  `aria-current`, `aria-busy`.
- Dynamic messages (validation errors, live counts) render into an `aria-live` region owned by the
  component, with `role="status"` for polite and `role="alert"` for urgent updates.
- Full requirements: `architecture/accessibility.md`.

## Testing

Every component file has a sibling test file (`CMP-011`), named `<name>.component.test.js`, covering:
render from attributes, state change via property, emitted event shape, and keyboard operability.
Component tests run in a real browser via `@web/test-runner` (see `testing.md`); they never assert on
internal DOM structure that the public contract does not promise.

## Rules

| ID | Rule |
| --- | --- |
| CMP-001 | File-level JSDoc header with `@file` and `@module` is present. |
| CMP-002 | `@element` JSDoc tag declares the tag name. |
| CMP-003 | Tag name starts with the configured prefix (`app-`). |
| CMP-004 | Tag name matches the file name (`task-card.component.js` → `app-task-card`). |
| CMP-005 | The file calls `customElements.define`. |
| CMP-006 | The tag passed to `customElements.define` matches `@element`. |
| CMP-007 | Every entry in `observedAttributes` is documented with `@attribute`. |
| CMP-008 | Every documented `@attribute` appears in `observedAttributes`. |
| CMP-009 | Attribute names are kebab-case. |
| CMP-010 | Component lives in `src/components/` or `src/features/*/components/`. |
| CMP-011 | A sibling `*.component.test.js` exists. |
| CMP-012 | Exported class name matches the file name (`TaskCardElement`). |
| CMP-013 | No global style injection or `document`-level querying. |
| CMP-014 | Dispatched event types are namespaced (`app:`) and documented with `@event`. |
| CMP-015 | No unsafe HTML sink receives data. |
| CMP-016 | Shadow roots are `mode: 'open'`. |
| CMP-017 | Pointer handlers have keyboard and role counterparts. |
| CMP-018 | Rendered form controls have a wired label. |
| CMP-019 | Dispatched event types appear in the contract's `eventTypes` vocabulary (`events.md`). |

## Anti-patterns

- Observing an attribute but never reading it (`attributeChangedCallback` that ignores `name`).
- Deriving a property from an attribute on every getter call instead of storing it once.
- `this.innerHTML = ...` for a list of items — use `replaceChildren` with cloned templates.
- Dispatching from a component to make another component do something (that is routing or state's
  job, via `architecture/events.md`).
- A "shared" component that imports a feature's store so it can render real data.
- Wrapping `<button>` in a `<div role="button">`; you now own focus, key repeat and IME behaviour.
