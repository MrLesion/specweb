# Conventions — Naming

**Scope.** One name for one concept, in every place that concept appears: file, tag, attribute,
event, selector, token, requirement and test. Consistent naming is what lets an agent — or a
newcomer — find things without searching.

**Enforced by.** `tools/validate-components.mjs` (`CMP-003`, `CMP-004`, `CMP-009`, `CMP-012`,
`CMP-014`), `tools/validate-routes.mjs` (`RTE-003`, `RTE-004`).

## Casing by position

| Position | Case | Example |
| --- | --- | --- |
| Directories and files | kebab-case | `task-board/`, `task-card.component.js` |
| Custom element tag | kebab-case, `app-` prefix | `app-task-card` |
| Class (elements, errors) | PascalCase + suffix | `TaskCardElement`, `AppError` |
| Function, method, variable | camelCase | `formatDueDate`, `boardId` |
| Module-level constant | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `ROUTES` |
| Boolean | `is`/`has`/`can`/`should` prefix | `isDirty`, `hasMore`, `canSubmit` |
| Private class member | `#` + camelCase | `#elements`, `#render()` |
| Attribute | kebab-case | `due-at`, `aria-busy` |
| Property | camelCase | `element.dueAt` |
| Event type | `app:` + kebab-case verb phrase | `app:task-complete` |
| CSS class | BEM-ish, block + element + modifier | `card__title`, `card--done` |
| CSS custom property | `--sw-<category>-<role>` | `--sw-space-inline` |
| CSS part | kebab-case | `part="due"` |
| Local storage key | `app.<area>.<name>` | `app.ui.theme` |
| Requirement / task | `R-<n>`, `T-<n>`, `AC-<n>` | `R-4`, `AC-4.2` |
| Decision record | `ADR-<nnnn>-<kebab-title>.md` | `ADR-0001-no-runtime-frameworks.md` |

## Sides of a boundary

Three names describe the same value across a boundary, and each follows its own case rule. They must
stay recognisable as one concept:

```js
static observedAttributes = ['due-at'];   // markup           → kebab-case
get dueAt() { … }                          // property         → camelCase
// @attribute due-at — ISO-8601 date        // documentation    → both, explicitly linked
```

A property/attribute pair always shares a name modulo case. A tag name always mirrors its file name
(`task-card.component.js` → `app-task-card`), which is what `CMP-004` checks.

## Identifiers and vocabulary

- Feature ids (`task-board`) are used verbatim as the folder name in `specs/` and `src/features/`, the
  route id, and the `data-feature` attribute. One id, one string.
- Names describe the domain, not the UI: `activeTasks`, not `visibleList`; `archiveTask`, not
  `doThing`.
- Use **domain language from the spec**. If the spec says "board", no code says "list-of-cards".
- No abbreviations except a short, documented allowlist: `id`, `url`, `api`, `http`, `ui`, `el`
  (local DOM variable only), `btn` is **not** allowed. `taskConfig` beats `tskCfg`.
- No type/prefix noise in names: no `strName`, no `arrTasks`, no `objOptions`.
- Length is not a virtue. `task` beats `t`; `updatedAtMs` beats `updatedAtMillisecondsSinceEpoch`.
- Units are in the name when the unit is not obvious: `timeoutMs`, `sizeBytes`, `durationMs`.
- A function name starts with a verb (`loadTasks`, `formatDueDate`); a predicate reads as a claim
  (`isOverdue`); a selector starts with `select` (`selectVisibleTasks`).
- A store's actions are past-tense state events or imperative intents, never both in one store:
  `filterChanged`/`tasksLoaded` (events) or `setFilter` (intent) — pick one convention per store and
  document it in the store's `@file` header.

## Text and content

- User-visible copy lives in one place per feature (`src/features/<id>/strings.js`) or in a shared
  catalogue, never inline in a dozen templates, so it can be reviewed and translated.
- Sentences: sentence case for labels and headings ("Due date", not "Due Date"); full sentences with
  a period for help text and errors.
- Error messages state what to do ("Enter a due date on or after today"), never just what is wrong.
- Icon-only controls and `aria-label` values are written as commands ("Complete task", "Close
  dialog"), because a screen reader announces them as actions.

## Rules

| ID | Rule |
| --- | --- |
| N1 | One concept, one name, everywhere (spec, code, tests, docs). |
| N2 | Casing follows the table above, without exceptions. |
| N3 | Tag name mirrors file name; property mirrors attribute modulo case. |
| N4 | Booleans are prefixed `is`/`has`/`can`/`should` and never negative (`isVisible`, not `isHidden`). |
| N5 | Units are explicit when ambiguous. |
| N6 | User-visible text lives in a catalogued module, not in templates. |

## Anti-patterns

- `taskList` in one file and `tasks` in another for the same array.
- `handleClick` as a method name; name the intent it performs (`completeTask`).
- `toggle()` returning a state object; a toggle returns a boolean or nothing.
- A tag `app-TaskCard` or an attribute `dueAt` in markup — HTML lowercases both, and the mismatch
  surfaces as a mystery bug.
- Two names for one route (`/boards/:id` in the contract, `/board/:boardId` in the module).
