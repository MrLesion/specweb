# Conventions — JSDoc

**Scope.** JavaScript is the language; JSDoc is the type system. Types are checked by the TypeScript
compiler in `--checkJs` mode on every commit, so a wrong `@param` is a build failure, not a comment.
No `.ts` files, no build step for types (Article IX).

**Enforced by.** `npm run typecheck` (`tsc -p jsconfig.json`, `checkJs: true`, `strict: true`),
`tools/validate-components.mjs` (`CMP-001`, `CMP-002`, `CMP-007`, `CMP-008`, `CMP-014`).

## Required documentation by file kind

| File kind | Required tags |
| --- | --- |
| Every module | `@file`, `@module` (a short description of the file's responsibility, not a restatement) |
| Custom element | `@element <tag>`, plus `@attribute` per observed attribute and `@event`/`@type` per emitted event |
| Exported function | `@param` for each parameter, `@returns`, `@throws` for each error it can raise |
| Store | `@typedef` for its state slice and payloads, documented actions |
| Client | `@param`/`@returns` with domain types, `@throws {AppError}` |
| Utility | `@param`, `@returns`; note purity when the function has side-effect-free guarantees |
| Test | A `@see` pointing at the requirement, plus a name that already cites `R-n` |

## Tag reference

| Tag | Use | Notes |
| --- | --- | --- |
| `@typedef` / `@property` | Named structural types | Declared in `src/types.js`, imported in `@type` comments |
| `@type` | Inline annotation | Use for module constants and complex locals |
| `@param {T} name` | Parameter | Add `[name]` for optional, `[name=value]` for defaulted |
| `@returns {T}` | Return | Omit only for `void` |
| `@throws {AppError}` | Errors a caller must handle | Name the codes in the description |
| `@example` | Non-obvious usage | Required for public helpers with surprising semantics |
| `@fires` / `@event` / `@listens` | Event contract | `@event` on the dispatch site, `@listens` on the handler |
| `@attribute` | Custom element attribute | Must match an entry in `observedAttributes` |
| `@property` | Custom element property | Document the type and whether it reflects |
| `@cssprop` / `@csspart` | Styling API | Required for every public custom property and `part` |
| `@deprecated` | Superseded API | Include the replacement and the removal target |
| `@see` | Cross-reference | Link the requirement, ADR or document that explains *why* |

## Types

- `src/types.js` is the single home for shared typedefs (`Task`, `Route`, `AppError` meta, store
  slices). Import a type by name in a `@type` comment; never redefine the same shape twice.
- Structural types are preferred to inheritance: `{ id: string, title: string }` beats a class.
- Unions encode states instead of booleans: `'idle' | 'loading' | 'ready' | 'empty' | 'error'`.
- `Array<T>` or `T[]` (pick one per file, default `T[]`), `Record<string, T>` for maps, and
  `ReadonlyArray<T>` on exported constant lists.
- `unknown` at boundaries, narrowed before use. `any` fails review — the only exceptions are a
  narrowly scoped `/** @type {any} */` with an accompanying comment explaining the escape.
- DOM types come from `lib.dom.d.ts`; do not redeclare them. Use `HTMLElement` subclasses rather than
  `any` for element references.

## Element documentation

The component's contract is readable from its JSDoc alone:

```js
/**
 * @file Presentational card for a single task.
 * @module features/task-board/components/task-card
 */

/**
 * A task card. Reads attributes, emits intent, owns no data.
 *
 * @element app-task-card
 *
 * @attribute task-id   - Identifier of the task. Required.
 * @attribute title     - Display title. Required.
 * @attribute due-at    - ISO-8601 due date. Optional; no due date when absent.
 * @attribute done      - Present when the task is complete ('true'/'false').
 *
 * @property {boolean} done - Completion state; reflects to the `done` attribute.
 *
 * @cssprop --app-task-card-accent - Accent colour of the completion marker.
 * @csspart title - The title element.
 *
 * @event app:task-complete - User asked to complete the task.
 * @type {CustomEvent<{ taskId: string }>}
 */
```

## Type checking configuration

```jsonc
// jsconfig.json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "noEmit": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*.js", "tests/**/*.js"]
}
```

Type errors are build failures. Suppressing one requires `// @ts-expect-error <reason>` on the
immediately preceding line — `@ts-ignore` is forbidden because it suppresses even the mistakes that
would have been caught for free.

## Rules

| ID | Rule |
| --- | --- |
| JS1 | Every module has `@file` and `@module`. |
| JS2 | Every exported function has `@param`, `@returns` and any `@throws`. |
| JS3 | Custom elements document `@element`, `@attribute`, `@event`, `@cssprop`, `@csspart`. |
| JS4 | Shared shapes live in `src/types.js` as typedefs, referenced by name. |
| JS5 | `any` is forbidden outside a commented, narrowly scoped escape. |
| JS6 | State is expressed as unions, not as several booleans. |
| JS7 | `tsc --checkJs` passes with `strict: true`; `@ts-ignore` is forbidden. |

## Anti-patterns

- `@param {Object} options` with the real shape implicit; consumers then guess.
- Documenting the *what* the code already says ("`@returns {string} the title`" for `getTitle`).
- A `@typedef` per file for the same domain object, drifting shape by shape.
- `@ts-ignore` to ship; it silences the next six real errors too.
- Marking a parameter optional in JSDoc while the implementation requires it.
