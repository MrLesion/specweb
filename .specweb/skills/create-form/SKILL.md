---
name: create-form
description: Create an accessible form: a controller element owning state and validation, generic field elements, and a submit flow that never loses user input.
---

# Skill — create-form

**Purpose.** Add a form that is keyboard-complete, announces its errors, prevents double submission and
preserves what the user typed when something fails.

**Used by.** Builder. **Rules.** `architecture/forms.md` (F1–F10), `architecture/accessibility.md`,
`CMP-017`, `CMP-018`.

## When to use

- The user creates, edits or deletes something through typed input.
- A flow has two or more fields, or any validation beyond a single HTML constraint.

## When not to use

- A single control with immediate effect (a toggle, a filter, a search box); use a component and an
  event, and do not wrap it in a form controller.
- A read-only view; there is nothing to submit.

## Inputs

| Input | Source |
| --- | --- |
| Field list with types and constraints | `spec.md` → *Requirements* |
| Validation rules (client and server) | `spec.md`, API error samples |
| Success behaviour (navigate, reset, stay) | `spec.md` → *Acceptance criteria* |
| Error copy | `src/features/<id>/strings.js` |

## Procedure

1. **Create the controller** at `src/features/<id>/<name>.form.js` from `templates/form.js`. It owns
   values, touched/dirty flags, validation results and submission state (F1).
2. **Reuse the generic field elements** from `src/components/` (`app-text-field`,
   `app-select-field`, …). If one is missing, create it with `skills/create-component`, generic and
   domain-free (F2). A field must never import a domain type, a store or a client.
3. **Wire labels and messages** for every control: visible label, `aria-describedby` for hint and
   error, `aria-invalid` while invalid, and a live region for announcements (F3, F4).
4. **Implement validation** as pure functions taking values and returning field errors, so they are
   unit-testable without a DOM: required, format, range, and cross-field rules.
5. **Implement the timing rules**: validate on blur, re-validate on change after touched, validate
   everything on submit, never on the first keystroke (F5).
6. **Implement submission**: validate all → focus the first invalid field → set `submitting` →
   call the feature client (never `fetch`) → emit `app:form-submitted` or map the `AppError` →
   re-enable in `finally` (F6, F7, F8).
7. **Preserve input on failure**: `VALIDATION` assigns field errors from `AppError.fields`;
   everything else produces a form-level alert with a retry; values are never cleared (F7).
8. **Collect values by name** from the controller's own state, not by querying the DOM (F10).
9. **Write tests**: valid submit, invalid submit (nothing sent, focus moved, errors announced),
   server `VALIDATION` mapping, network failure with input preserved, double-submit guard, and a
   keyboard-only pass (F9).
10. **Run the checks** before checking the task box.

## Templates

| Template | Destination |
| --- | --- |
| `templates/form.js` | `src/features/<id>/<name>.form.js` |

## Verification

```bash
node .specweb/tools/validate-components.mjs --root .
node --test tests/unit
npx web-test-runner "src/**/*.component.test.js"
```

Plus a manual keyboard-only pass and an axe run on the rendered form.

## Done criteria

- Every control has a visible, programmatically associated label; no placeholder-as-label.
- Errors are associated, announced and actionable, and `aria-invalid` is set while they persist.
- Submitting an invalid form sends nothing, focuses the first invalid field and announces the count.
- A failed submission leaves every value exactly as the user typed it.
- Double submission is impossible, including via the keyboard.
- The whole form is operable with the keyboard alone, in DOM order.

## Common mistakes

- Validating on every keystroke from the start, so the user is scolded while typing.
- Clearing the form on error because it is easier to retype than to reconcile.
- A "generic" field component that grows a domain-specific prop, then a store import.
- Disabling submit until the form is valid with no explanation of what is missing.
- Using `pattern` in HTML and a different rule in JS, so the two disagree on the same field.
- Announcing errors by styling only, so screen-reader users hear nothing.
