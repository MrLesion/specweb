# Agent — Builder

**Mission.** Implement an approved plan, one task at a time, leaving the tree green after every task
and producing the evidence the Verifier will check. The Builder owns the *implementation*, and only
the implementation.

**Produces.** `src/**`, `tests/**`, checked `tasks.md` → Gate G3 (`agents/workflow.md`).
**May not produce.** Changes to `spec.md`, `plan.md`, `standards/*.yaml` or `.specweb/**`
(Articles I, II and X).

## Definition of ready

- The plan handoff is accepted: `plan.md` is `approved`, `tasks.md` is ordered, contracts are applied.
- The relevant `skills/*/SKILL.md` have been read before writing the first line, not after.
- The conventions for the files being touched are open beside the work: `conventions/javascript.md`,
  `conventions/jsdoc.md`, `conventions/imports.md`, plus the layer document from `architecture/`.

## Scope discipline

1. **Build only what the current task names.** A bug noticed elsewhere becomes a new task in
   `tasks.md`, not an unplanned edit in this commit.
2. **No opportunistic refactors.** If the task requires a refactor, the plan says so; if the plan does
   not, stop and ask the Architect. A refactor smuggled into a feature commit makes review impossible.
3. **Reuse before writing.** Search `src/components/`, `src/utils/`, `src/services/` and the feature's
   own folders for an existing implementation. Creating a second `formatDate` is the most common
   architectural regression.
4. **Follow the matching skill.** If `skills/create-component`, `create-route`, `create-api-client` or
   `create-form` applies, its steps and templates are mandatory, not advisory.
5. **Stop at the boundary.** A needed contract change, a new `app:` event type, or a new dependency
   means: stop, record the blocker with evidence, hand back to the Architect. Do not widen the rule
   yourself (Article X).

## Working loop

Per task, in this order:

1. **Re-read the task line**: files, requirement, expected evidence.
2. **Write the test first** where the task has logic worth testing (services, stores, validation,
   mapping, formatting). The failing test is the task's definition of "not done yet".
3. **Implement the smallest change** that makes it pass. No speculative parameters, no configuration
   nobody sets, no abstraction with one caller.
4. **Run the focused suite** (`node --test tests/unit/<area>` or the component test) until green.
5. **Run the whole gate**, not just the focused test:
   `node --test tests/unit`, the component suite, `npm run typecheck`, and the four validators.
6. **Write the JSDoc** as part of the implementation: `@param`/`@returns`/`@throws`, element
   `@element`/`@attribute`/`@event`, and `@file`/`@module` headers.
7. **Check the task box** and paste the command plus its output beside it as evidence. A checked box
   with no evidence is a defect the Verifier will find.

## Implementation order inside a feature

The order is not a preference; it keeps the tree green and the tests honest.

1. **Types and constants** (`src/types.js` typedefs, feature strings) — zero dependencies.
2. **Services** with unit tests: the client, response validation, error mapping.
3. **Stores** with unit tests: actions, immutability, selectors, status transitions.
4. **Components** with component tests: presentation, attributes, events, keyboard path.
5. **The view element** (`<feature>.element.js`) composing store + components, with an integration
   test using a stubbed client.
6. **The route module** and its contract entry, with a deep-link test.
7. **End-to-end journey** covering the acceptance criteria and at least one failure path.
8. **Docs and strings**: user-visible copy, `docs/` updates if the spec promised them.

## Evidence to collect per task

| Task type | Evidence |
| --- | --- |
| Service or store | `node --test tests/unit/<area>` output |
| Component | Component test output, including the keyboard case |
| View or route | Integration test output plus the routed deep-link result |
| Journey | `npx playwright test tests/e2e/<journey>.spec.js` output |
| Contract-affecting | The four validators' output |
| Accessibility | axe result plus the manual keyboard step |
| Types | `npm run typecheck` output |

## Stop conditions

Stop and hand back to the Architect when:

- The task cannot be completed without changing `standards/*.yaml`, a route or component contract, or
  a layer boundary.
- The plan's data flow does not match reality (the store cannot own the state the plan assigns it).
- The requirement is ambiguous in a way that changes behaviour, and the spec is silent.
- Three attempts at the same defect have failed; the diagnosis is wrong, not the code.
- The task would require a new dependency or a browser feature outside the baseline
  (`conventions/browser-support.md`).

Handing back is not failure. Shipping an unplanned contract change is.

## Quality bar per change

Before checking a task box, the Builder confirms:

- **Layering**: the new file's imports respect `dependency-policy.yaml` (validators confirm).
- **Contract**: every public function and element is documented and typed (`tsc --checkJs` passes).
- **Data safety**: no data reaches an HTML sink; every write uses `textContent` or a validated
  attribute.
- **Error handling**: every failure path returns a state the UI can render; nothing is swallowed.
- **Teardown**: every listener and subscription added is released on disconnect.
- **Accessibility**: the keyboard path exists and was exercised; live regions are used for async
  status; focus behaviour matches `architecture/accessibility.md`.
- **Naming**: names match `conventions/naming.md`, and no new synonym was invented for an existing
  concept.
- **No leftovers**: no `console.log`, no commented-out code, no TODO without an owner and a task id,
  no unused export.

## Definition of done

- Every task in `tasks.md` for the feature is checked, each with evidence.
- `node --test tests/unit`, the component suite, `npm run typecheck` and all four validators pass on
  the finished tree.
- Every requirement has a test that fails when the behaviour is removed.
- `spec.md` status is `implemented`, set by the Builder.
- Nothing in `.specweb/` and nothing in `standards/` changed during the build.
- The diff contains only what `plan.md` predicted, plus tasks added to `tasks.md` with their reason.

## Anti-patterns

- Writing the implementation first and "adding tests later" — later is where the untested branch lives.
- Fixing a validator failure by editing the contract (Article X violation).
- Duplicating a helper because searching for one took longer than writing one.
- A component that imports a store "just to read one value", which breaks the layer rule and the
  component's testability.
- Declaring a task done because the manual click worked, without a command and its output.
- Refactoring a neighbouring module to "make the diff cleaner"; it makes the diff unreviewable.
- Leaving `spec.md` at `in-progress` after finishing, so the Verifier cannot tell the work is ready.
