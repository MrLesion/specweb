---
name: review-accessibility
description: Review a change against WCAG 2.2 AA and record the findings as evidence, including the manual passes automation cannot cover.
---

# Skill — review-accessibility

**Purpose.** Produce a defensible accessibility verdict for a user-facing change: what was checked,
with which tool, what was observed, and what remains unknown. Automated checks are a floor, never the
verdict (Article V).

**Used by.** Builder (self-review) and Verifier (independent review). **Rules.**
`architecture/accessibility.md` (AC-1…AC-10).

## When to use

- Any change that renders, moves or removes UI, or that changes focus, order, semantics or copy.
- Any new form, dialog, menu, table, chart, drag interaction or live-updating region.
- Before completing a task that touches a user-facing route.

## When not to use

- Changes with no user-visible surface (a build script, a pure utility with no rendering). State that
  judgement explicitly rather than silently skipping the review.

## Inputs

| Input | Source |
| --- | --- |
| The change under review | Diff / branch |
| Accessibility requirements | `spec.md` → *Accessibility* |
| Design tokens and contrast pairs | `src/styles/tokens.css` |

## Procedure

1. **Automated pass.** Run axe on each affected component and view, in every theme that applies.
   Record zero-violation results as evidence; a violation is a finding, not a warning.
2. **Semantics review (AC-1).** Is every element the most semantic one available? Are roles
   non-redundant and non-conflicting? Is there one `h1` and a sane heading outline?
3. **Name review (AC-2).** Does every control have an accessible name that survives translation,
   including icon-only buttons and the custom fields? Read the names aloud as a screen reader would.
4. **Keyboard pass (AC-3).** Unplug the pointer and complete the feature's primary journey: reach
   every control, activate it, and confirm nothing is a keyboard trap. Note the tab order you
   observed, not the one you expected.
5. **Focus review (AC-4).** Trigger each state change (open, close, delete, navigate, validate) and
   confirm focus is visible, deliberate and never lost to `<body>`.
6. **Live regions (AC-5).** Make each asynchronous change happen and confirm it is announced exactly
   once, in a sentence a human can act on.
7. **Contrast and colour (AC-6).** Check every new or changed token pair in both themes: 4.5:1 text,
   3:1 large text, icons, borders and focus rings. Confirm nothing conveys meaning by colour alone.
8. **Motion and input (AC-7).** Enable reduced motion and confirm the flow still completes. Check
   single-pointer alternatives for every drag, and that no content flashes.
9. **Reflow and zoom (AC-8).** 200% zoom and a 320 CSS-pixel viewport: no loss of content, no
   two-dimensional scrolling, no clipped controls.
10. **Targets (AC-9).** Measure interactive targets on a touch profile: 24×24 minimum, 44×44 preferred,
    with adequate spacing.
11. **Errors (AC-10).** Submit invalid and failing forms: confirm association, announcement, focus
    movement, actionable wording, and that no input is lost.
12. **Record the verdict** with the observed results, in `specs/<id>/verification.md` (or the task's
    evidence field), including what could not be verified and why.

## Checklist

| ID | Check | Method |
| --- | --- | --- |
| AC-1 | Semantics before ARIA; no redundant or conflicting roles | Code read + accessibility-tree inspection |
| AC-2 | Accessible name on every control, icon-only included | Accessibility-tree inspection |
| AC-3 | Keyboard path for every pointer path, sensible order | Manual, pointer unplugged |
| AC-4 | Focus visible, moved deliberately, never lost | Manual, after each state change |
| AC-5 | Live regions for status, errors and async results | Manual, screen reader on |
| AC-6 | Contrast meets AA in every theme; no colour-only meaning | Token audit + rendered spot check |
| AC-7 | Reduced motion honoured; no essential content behind animation | `prefers-reduced-motion` emulation |
| AC-8 | Reflow at 320px and 200% zoom | Browser zoom + viewport resize |
| AC-9 | Target size ≥ 24×24 CSS px with spacing | DevTools measurement on a touch profile |
| AC-10 | Form errors associated, announced, actionable | Manual + axe |

## Evidence format

```
AC-3 (keyboard): loaded /boards/42 with the pointer disconnected. Tab order observed:
"New task" → card 1 "Complete" → card 2 "Complete" → filter select → pager. Enter on card 2
completed the task; the list re-rendered with focus on card 2's new position. No trap.
AC-5 (announcement): VoiceOver announced "3 tasks remaining" once, quietly, after completion.
AC-8 (reflow): at 320px the action row wraps to two lines; no horizontal scroll, no clipped text.
Not verified: iOS VoiceOver (no device available this session) — recorded as a known limitation.
```

## Done criteria

- All ten checks are answered as pass, fail or not applicable, with the observation recorded.
- Every failure has a severity (blocker/high/medium/low) and either a fix or a follow-up task id.
- The manual passes were actually performed; automated-only reviews do not satisfy this skill.
- Known limitations are stated, including the assistive technology and browser not tested.

## Common mistakes

- Reporting "axe: 0 violations" as the whole review; that covers roughly a third of real defects.
- Testing only the happy path, so the error announcements are never heard.
- Checking contrast on the light theme only.
- Assuming a custom element is focusable because it has a `tabindex`.
- Fixing the symptom (adding `aria-label`) instead of the cause (a `div` that should be a `button`).
- Skipping the reflow and target-size checks because they are not part of the design review.
