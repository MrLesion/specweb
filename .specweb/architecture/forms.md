# Architecture — Forms

**Scope.** Every form in the application follows one shape: a controller that owns state and
validation, field elements that render and report, and a submit flow with a precise definition of
"valid", "submitting" and "failed". Forms are the highest-risk surface for accessibility and data
loss, so they are the most heavily specified.

**Enforced by.** `architecture/forms.md` review rules, `architecture/accessibility.md`,
`tools/validate-components.mjs` (`CMP-017`, `CMP-018`), `skills/create-form/SKILL.md`.

## Shape

```
<app-task-form>            ← controller element: owns state, validation, submission
  ├── <app-text-field>     ← field element: renders label + control + message, reports changes
  └── <app-select-field>
```

- The **controller** owns values, touched/dirty flags, validation results and submission state.
- **Field elements** are generic and reusable. They know a label, a name, a value and an error
  message. They know nothing about tasks, users or endpoints.
- Business rules live in the feature; presentation rules live in the field. A field element that
  imports a store, a client, or a domain type is a defect.

## Field element contract

```js
export class TextFieldElement extends HTMLElement {
  static observedAttributes = ['name', 'label', 'value', 'required', 'error', 'hint', 'autocomplete'];
}
```

| Attribute | Meaning |
| --- | --- |
| `name` | Field key used in the emitted values object; required. |
| `label` | Visible, programmatically associated label text; required. |
| `value` | Current value (reflected so a form can be server-rendered). |
| `required` | Constraint surfaced to both the user and the validator. |
| `error` | Error message; presence sets `aria-invalid` and wires `aria-describedby`. |
| `hint` | Persistent help text, wired via `aria-describedby` too. |
| `autocomplete` | Forwarded to the control; wrong tokens are an accessibility defect. |

Events emitted by a field: `app:field-changed` (`{ name, value }`) and `app:field-blurred`
(`{ name }`). Nothing else. A field never validates on its own beyond displaying the `error` it was
given — validation is the controller's job, so the rules stay in one place.

## Accessibility contract (non-negotiable)

- Every control has a visible label associated by `for`/`id` or by wrapping. Placeholder text is
  never the label (`CMP-018`).
- Error messages are programmatically associated (`aria-describedby`) **and** announced
  (`role="alert"` or an `aria-live="polite"` region owned by the field).
- `aria-invalid="true"` is set for the life of the error, and the message says what to do rather
  than only that something is wrong ("Enter a due date on or after today", not "Invalid date").
- On submit, errors are summarised in a live region and focus moves to the first invalid field.
- Required fields are announced through `required`/`aria-required`, never by a red asterisk alone.
- Fields are reachable in DOM order; `tabindex` is never used to reorder a form.
- The form is submittable by keyboard alone, and `Enter` in a text field submits rather than
  silently doing nothing.

## Field state model

A field is a tuple of states, and the UI must express all of them:

| State | Meaning | Presentation |
| --- | --- | --- |
| `pristine` | Never edited, never blurred | No error shown, even if invalid |
| `touched` | Blurred at least once | Errors may show |
| `dirty` | Value differs from the initial value | Warn before discarding |
| `validating` | Async check in flight | `aria-busy="true"`, submission disabled |
| `invalid` | At least one rule failed | Message plus `aria-invalid` |
| `disabled` | Cannot be edited | `disabled`, not `readonly`, and kept in the DOM |

Validation timing: never on the first keystroke of a pristine field; validate on blur, then
re-validate on every change once touched; always validate everything on submit.

## Submission flow

1. Validate **all** fields. If any fail, focus the first invalid field, announce the summary and
   stop — nothing is sent.
2. Collect values through the field names, not by reading `input.value` directly and not by walking
   the DOM for `[name]`.
3. Enter `submitting`: disable the submit control, set `aria-busy="true"`, keep values visible.
4. Send via the feature client (`data-access.md`). The form never calls `fetch`.
5. On success: emit `app:form-submitted` with `{ formId, values }`, then navigate or reset with a
   politely announced success message.
6. On failure, map the error and **never** discard the user's input:
   - `VALIDATION` → assign field errors from `AppError.fields`, focus the first offending field.
   - `UNAUTHORIZED` → route to sign-in, keeping the values recoverable.
   - `CONFLICT` → explain the conflict and offer a re-sync.
   - anything else → form-level alert with a retry affordance, values intact.
7. Re-enable the submit control in a `finally` block and clear `aria-busy`.

Double submission is prevented by the `submitting` state, not by a debounce, and the guard applies to
keyboard submission exactly as it does to pointer submission.

## Rules

| ID | Rule |
| --- | --- |
| F1 | Values, touched/dirty flags and submission state are owned by the controller. |
| F2 | Field elements are generic: no domain types, no stores, no clients. |
| F3 | Every control has a visible, programmatically associated label. |
| F4 | Errors are associated, announced and actionable. |
| F5 | Validation runs on blur, on change after touched, and on submit — never on first keystroke. |
| F6 | Submission validates everything first and aborts on the first failure, focusing it. |
| F7 | Failed submissions preserve user input. |
| F8 | Submission is idempotent from the user's perspective: no duplicate requests. |
| F9 | Every form is fully operable by keyboard alone. |
| F10 | Values are collected by name, not by DOM traversal. |

## Anti-patterns

- Two-way binding that writes `value` back into the field on every keystroke; it fights the caret and
  breaks IME composition.
- Validating with `pattern` only, then adding a parallel JS rule that disagrees with the HTML one.
- A "generic" field component that imports the domain type it happens to render first.
- Clearing the form on error because "it is easier to retype than to debug".
- Disabling submit until the form is valid with no explanation, leaving the user with nothing to fix
  and no message to read.
