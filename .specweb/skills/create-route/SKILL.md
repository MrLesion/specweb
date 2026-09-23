---
name: create-route
description: Add a route to the application: a feature route module, the contract entry, the view element and the deep-link test.
---

# Skill — create-route

**Purpose.** Add a navigable route that is lazy, guardable, deep-linkable and declared in the contract
— so the route table and the code can never disagree.

**Used by.** Builder (Architect approves the contract entry). **Rules.** `architecture/routing.md`,
`standards/route-contract.yaml` (`RTE-001`…`RTE-011`), `ARCH-011`.

## When to use

- A new screen, or a new deep-linkable state of an existing screen (`/boards/:boardId`).
- An existing view becomes reachable by a second URL shape (a filter, a tab, a sort order).

## When not to use

- A purely visual change within one route; that is a component change.
- A URL that duplicates an existing route's content without a reason to bookmark it; prefer a query
  parameter on the existing route and say why in the plan.

## Inputs

| Input | Source |
| --- | --- |
| Route purpose and URL shape | `plan.md` |
| Feature id and view element tag | `specs/<id>/spec.md` |
| Guard requirements (auth, role, entitlement) | `plan.md`, spec's security section |

## Procedure

1. **Choose the route id and path.** The id is a stable kebab-case identifier; the path uses `:params`
   only, with no regular expressions. Check for a conflicting path (`RTE-007`).
2. **Copy `templates/route.js`** to `src/features/<id>/<id>.route.js` and fill it in.
3. **Declare the route** in `standards/route-contract.yaml` under `routes:`, with `id`, `path`,
   `module`, `element`, `title`, `guard`, `lazy` and `spec`. This is an Architect-approved contract
   delta (Article X).
4. **Register the route** in `src/routes/registry.js` so the router can see it.
5. **Ensure the view element exists** (`skills/create-component`, named `<id>.element.js`), and that
   it is defined by the feature entry point (`RTE-011`).
6. **Add the guard** (or `guard: null` deliberately) as a pure function export in
   `src/routes/guards.js` (`RTE-006`). Guards run before the chunk loads.
7. **Verify the navigation contract**: `document.title` is set from the route, focus moves to the
   outlet after mount, and back/forward restores scroll and state.
8. **Write the tests**: deep link (direct load), navigation from a link, unknown id → not-found, and
   the guard's redirect or error.
9. **Run the checks** before checking the task box.

## Templates

| Template | Destination |
| --- | --- |
| `templates/route.js` | `src/features/<id>/<id>.route.js` |

## Verification

```bash
node .specweb/tools/validate-routes.mjs --root .
node .specweb/tools/validate-architecture.mjs --root .
npx playwright test tests/e2e
```

## Done criteria

- The contract entry and the module agree on `id`, `path` and `title` (`RTE-003`, `RTE-004`).
- The view loads through a dynamic `import()` (`RTE-005`).
- The route names the spec it implements (`RTE-008`).
- A direct load of the URL renders the view, not a blank outlet.
- Keyboard focus lands on the new content after navigation, and the title is announced correctly.
- `not-found` still renders for unmatched paths.

## Common mistakes

- Adding the module without the contract entry; `RTE-002` fails and the route table becomes a lie.
- A static `import` of the view, which quietly removes code splitting (`RTE-005`).
- Fetching data inside the route module; data loading belongs to the view or its store.
- Parsing the path by hand with `location.pathname.split('/')` instead of taking route params.
- A guard that renders instead of returning a decision, which makes navigation untestable.
- Forgetting that a detail route needs a "no such record" state — an empty shell is not an error state.
