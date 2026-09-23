---
name: create-component
description: Create a custom element with its documented three-part contract (attributes, properties, events) and a sibling browser test.
---

# Skill — create-component

**Purpose.** Add one custom element that is documented, testable in isolation, accessible by keyboard
and safe with untrusted data — every time, with no variation between authors.

**Used by.** Builder. **Rules.** `architecture/components.md`, `conventions/jsdoc.md`,
`standards/component-contract.yaml` (`CMP-001`…`CMP-019`).

## When to use

- A piece of UI is reusable, or is tested on its own, or has a state machine worth isolating.
- A feature needs a presentational unit with a clear input/output contract.

## When not to use

- Composition only, with no behaviour: write the markup in the view element instead.
- A one-off block used in exactly one place with no state of its own; extract it when a second caller
  appears (`agents/architect.md`, abstraction vs duplication).
- Anything that would need to import a store or a client to function — that is a view, not a
  component (`ARCH-004`).

## Inputs

| Input | Source |
| --- | --- |
| Element purpose, in one sentence | `plan.md` → *Files* |
| Tag name and file name | `conventions/naming.md` |
| Attributes, properties and events | `plan.md`, `architecture/events.md` |
| Placement (shared or feature-local) | `plan.md` |

## Procedure

1. **Choose the location.** Shared and presentational → `src/components/`. Feature-specific →
   `src/features/<id>/components/`. Anything else fails `CMP-010`.
2. **Choose the tag and file name** so they match: `task-card.component.js` → `app-task-card`
   (`CMP-003`, `CMP-004`).
3. **Copy `templates/component.js`** and rename it. Keep the JSDoc header; it is checked.
4. **Declare `observedAttributes`** with only the attributes the element actually reacts to, and
   document every one with `@attribute` (`CMP-007`, `CMP-008`).
5. **Implement the render path** with `textContent`, `setAttribute` and `replaceChildren` only. A
   static `<template>` at module scope is the only place `innerHTML` is allowed (`CMP-015`).
6. **Dispatch intent events**, namespaced `app:` and documented with `@event` + `@type`
   (`CMP-014`, `CMP-019`).
7. **Give it a keyboard path** if it responds to a pointer: real control, or `role` + `tabindex` +
   key handling (`CMP-017`). Wire labels for any rendered form control (`CMP-018`).
8. **Adopt a shared stylesheet** rather than injecting `<style>` (`CMP-013`), referencing semantic
   tokens only (`architecture/styling.md`, Y2).
9. **Copy `templates/component.test.js`** beside it and cover: render from attributes, property set,
   event shape, keyboard operation.
10. **Run the checks** and fix every finding before checking the task box.

## Templates

| Template | Destination |
| --- | --- |
| `templates/component.js` | `src/components/<name>.component.js` or `src/features/<id>/components/<name>.component.js` |
| `templates/component.test.js` | beside the component, `<name>.component.test.js` |

## Verification

```bash
node .specweb/tools/validate-components.mjs --root .
npx web-test-runner "src/**/*.component.test.js"
npm run typecheck
```

## Done criteria

- `validate-components.mjs` reports no findings for the new file.
- The test covers attributes, a property, the emitted event and the keyboard path.
- The element works when the surrounding markup is server-rendered and when it is created in script.
- JSDoc documents `@element`, each `@attribute`, each `@event`, and the styling API
  (`@cssprop`/`@csspart`).
- No `document`-level queries and no global style injection.

## Common mistakes

- Naming the file `taskCard.component.js`; the suffix is fine but the case breaks `CMP-004`.
- Adding `aria-label` to a `<div role="button">` and calling it accessible, while `Enter` still does
  nothing.
- Observing an attribute "for later" and never reading it, which makes the contract a lie.
- Putting the element in `src/components/` and importing a store from it, which fails `ARCH-004` and
  makes the component untestable.
- Forgetting the sibling test file; `CMP-011` fails, and the gap is invisible until a regression.
