# Architecture — Accessibility

**Scope.** Every user-facing change meets **WCAG 2.2 level AA**. This is an acceptance criterion
(Article V), verified with recorded evidence, not a hardening phase.

**Enforced by.** `tools/validate-components.mjs` (`CMP-017`, `CMP-018`),
`skills/review-accessibility/SKILL.md` (manual review), `validate-spec-coverage.mjs` `SPC-005`
(every spec has an accessibility section).

## The five non-negotiables

1. **Semantic first.** Use the element that already means what you mean: `button`, `a[href]`,
   `input`, `select`, `dialog`, `details`, `ul`, `h1`–`h6`, `nav`, `main`, `header`, `footer`.
   A `div` with a handler is a bug unless nothing semantic exists — and then it needs a role, a
   name, `tabindex` and full keyboard handling.
2. **Keyboard complete.** Every interactive control is reachable and operable with the keyboard
   alone, in a logical order, with no keyboard trap. All pointer-only affordances (hover, drag,
   swipe) have a keyboard equivalent.
3. **Visible focus, never suppressed.** `:focus-visible` outlines are preserved and styled with at
   least 3:1 contrast against the adjacent background (WCAG 2.4.11/2.4.13). `outline: none` without
   a replacement is forbidden.
4. **Named controls.** Every control has an accessible name from a real label, `aria-label` or
   `aria-labelledby`. An icon-only button has a name that survives translation.
5. **Errors are announced.** Validation and async failures are identified in text, associated
   programmatically with the field, and announced through a live region (`forms.md`).

## Structure and language

- One `<h1>` per view; headings nest without skipping levels, and never come before the `<main>`
  landmark.
- Landmarks are present once each: `header`, `nav`, `main`, `footer`. `<main id="outlet">` is the
  route container and carries `tabindex="-1"`.
- `lang` is set on `<html>` and updated when content language changes.
- Reading order in the DOM matches visual order. CSS is used for layout, never `order`/`row-reverse`
  to reorder interactive content.
- Anything that conveys meaning with colour, position or shape is also conveyed in text.

## Focus management

| Situation | Requirement |
| --- | --- |
| Route change | Move focus to the outlet after mount; never leave focus on a removed node. |
| Dialog / modal | Move focus inside on open, trap it, restore it to the opener on close, and make the rest inert. |
| Inline editing | Focus the editor on activation and restore focus to the trigger on save/cancel. |
| Validation failure | Focus the first invalid field, not the form. |
| Content removal | If the focused node disappears, move focus to a sensible survivor — never to `<body>`. |
| Lists | Deleting an item moves focus to the next item, or to the previous one at the end of the list. |

## Live regions and announcements

- `role="status"` for polite updates (saved, count changed), `role="alert"` for urgent failures.
- The region exists in the DOM **before** it is populated; a live region created together with its
  message is not announced.
- Announcements are short, specific and de-duplicated: "3 tasks completed", not "Success!".
- Do not announce on initial page load; the document title already covers arrival.

## Time, motion and input

- No content flashes more than three times per second. Motion respects
  `prefers-reduced-motion: reduce` by dropping to a non-animated state, and functional animation
  never gates a task.
- Session timeouts warn and can be extended (WCAG 2.2.1); time limits are avoided where possible.
- Dragging (WCAG 2.5.7) always has a single-pointer, non-dragging alternative.
- Touch and pointer targets are at least 24×24 CSS pixels (WCAG 2.5.8), with 44×44 preferred.
- Text is resizable to 200% and interfaces reflow at 320 CSS pixels wide without two-dimensional
  scrolling (WCAG 1.4.10).

## Contrast and tokens

Contrast is enforced by *tokens*, not by per-component choices (`styling.md`): each semantic colour
token is paired with a token that satisfies 4.5:1 for text and 3:1 for large text, icons, borders
and focus indicators, in both light and dark themes.

## Verification

| Layer | Tool | Frequency |
| --- | --- | --- |
| Automated | axe via `@web/test-runner` on every component and view | Every commit |
| Keyboard-only pass | Manual: unplug the mouse, complete the feature's journey | Every feature |
| Screen reader | VoiceOver (macOS/iOS), NVDA (Windows), at least one per feature | Every feature |
| Zoom/reflow | 200% zoom and 320px width | Every feature |
| Contrast | Token audit plus rendered spot check in both themes | Every feature |

Automated results are evidence, but they only catch roughly a third of real defects. A green axe run
with no keyboard pass is an incomplete review, and `SPC-005` requires the manual results to be
recorded in `specs/<id>/verification.md`.

## Agent checklist (see also `skills/review-accessibility/SKILL.md`)

- AC-1 Semantics before ARIA; no redundant or conflicting roles.
- AC-2 Accessible name on every control; icon-only controls included.
- AC-3 Keyboard path for every pointer path, in a sensible order.
- AC-4 Focus is visible, moved deliberately, and never lost to `<body>`.
- AC-5 Live regions for status, errors and async results.
- AC-6 Contrast tokens meet AA in every theme; no colour-only meaning.
- AC-7 Reduced motion honoured; no essential content behind animation.
- AC-8 Reflow at 320px and 200% zoom without loss of content or function.
- AC-9 Target size and spacing meet the 24px minimum.
- AC-10 Form errors are associated, announced and actionable.
