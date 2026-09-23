# Architecture — Testing

**Scope.** What is tested, at which level, with which tool, and what counts as evidence. The goal is
not a coverage number; it is *confidence that a specific requirement still holds*.

**Enforced by.** `standards/feature-contract.yaml` (`testing` section);
`tools/validate-spec-coverage.mjs` (`SPC-004`, `SPC-008`, `SPC-009`); `tools/validate-components.mjs`
(`CMP-011`).

## Levels

| Level | Tool | Scope | Runs in |
| --- | --- | --- | --- |
| Unit | `node --test` | Pure functions, stores, reducers, selectors, validation, error mapping | Node, no DOM |
| Component | `@web/test-runner` + Playwright (Chromium, Firefox, WebKit) | One custom element's contract: render, attributes, properties, events, keyboard | Real browser |
| Integration | `@web/test-runner` | A view with its store and a stubbed client; the router mounting a route | Real browser |
| End-to-end | Playwright | Critical user journeys against a running build, including auth and error paths | Real browser |
| Accessibility | axe inside component and integration tests + manual passes | See `accessibility.md` | Real browser |

The shape is a pyramid, not a diamond: many unit tests, a component test for every element, a few
integration tests per feature, and end-to-end coverage for the handful of journeys the business
would notice breaking.

## File locations and naming

| Kind | Path |
| --- | --- |
| Unit | `tests/unit/<area>/<file>.test.js` |
| Component | beside the component: `src/**/components/<name>.component.test.js` (required, `CMP-011`) |
| Integration | `tests/integration/<feature>.test.js` |
| End-to-end | `tests/e2e/<journey>.spec.js` |
| Fixtures and fakes | `tests/support/<name>.js` |

Test names describe behaviour and cite the requirement they protect:
`it('R-4: rejects a due date before today', ...)`. A test nobody can map to a requirement is either
missing its requirement or testing an implementation detail.

## Required coverage per feature

1. Every requirement has at least one test that fails if the requirement is removed.
2. Every acceptance criterion in `spec.md` maps to at least one test, and the mapping is listed in
   `verification.md`.
3. Every error path in `data-access.md`'s taxonomy that the feature can produce has a test with the
   client stubbed to return that failure.
4. Every form has a test for invalid submission (nothing sent, focus moved, errors announced) and a
   test for a failed submission (input preserved).
5. Every route has a test for the direct-load case (deep link) and the not-found case.

Percentage coverage is not a gate; it is a diagnostic. A feature with 95% coverage and no keyboard
test is not tested.

## Determinism

Tests are deterministic, hermetic and parallel-safe:

- No real network. Clients are stubbed at the module boundary with `tests/support/` fakes; a test
  that reaches the network is a defect, not a flake.
- Time, randomness and ids are injected: `clock`, `random`, `idFactory`. `await clock.tick(1000)`
  rather than `setTimeout` races.
- No shared mutable state between tests; each test creates its own store instance, and DOM fixtures
  are removed in a `finally` block.
- No ordering dependency; the suite passes with `--test-shuffle` and with a single test selected.
- A test that needs retries is fixed, not stabilised by a retry configuration.

## Evidence

A verifier's evidence is a command and its output, pasted verbatim:

```
$ node --test tests/unit
# tests 148 # pass 148 # fail 0
$ npx web-test-runner --coverage
Ran 63 tests, 0 failed. Coverage 87% statements.
$ npx playwright test tests/e2e
9 passed (41s)
```

Prose summaries, screenshots without a command, and "verified manually" are not evidence
(Article VII).

## Rules

| ID | Rule |
| --- | --- |
| T1 | Every requirement has a test that fails when the behaviour is removed. |
| T2 | Every component has a sibling component test covering its documented contract. |
| T3 | Every error path the feature can produce is tested with a stub. |
| T4 | Tests never touch the network, the clock or shared mutable state directly. |
| T5 | Tests are order-independent and pass in random order. |
| T6 | Accessibility checks run inside component and integration tests. |
| T7 | `verification.md` records command + output for every suite run. |
| T8 | No test asserts on an implementation detail the public contract does not promise. |

## Anti-patterns

- Asserting on shadow DOM class names, which turns a refactor into a red suite.
- Mocking the module under test instead of its dependency.
- `await new Promise(r => setTimeout(r, 50))` as synchronisation; it produces a suite that is slow and
  occasionally red.
- End-to-end tests as the only tests for a complex feature; the feedback loop becomes minutes long
  and the failure message names a selector instead of a rule.
- Deleting a failing test to land a change. The test is the requirement; fix one of them explicitly.
