# Verification — site gateway

> Status: FAIL

## Scope

Implements R-1 through R-11 (header, theme, gateway, shared contract,
three static lists, async states, routing, accessibility, no-JS baseline).

## Evidence

```
$ node --test tests/unit/site-gateway/item-list.test.js tests/unit/site-gateway/clients.test.js tests/unit/site-gateway/stores.test.js tests/unit/site-gateway/services.test.js
# tests 22
# pass 22
# fail 0
```

```
$ node .specweb/tools/validate-components.mjs --root .
SpecWeb validate-components (specweb.dev/v1)
0 errors, 0 warnings
PASS
```

```
$ node .specweb/tools/validate-architecture.mjs --root .
FAIL — ARCH-001 for every file under src/ plus ARCH-007 warnings.
Cause: walkRoot(root, 'src') returns src/-relative paths (app/config.js)
while layer prefixes expect repo-relative paths (src/app). Platform defect,
not a feature defect. No .specweb/ edit made (Article X).
```

```
$ node .specweb/tools/validate-routes.mjs --root .
FAIL — RTE-002 for all five route modules (undeclared).
Cause: same path-prefix defect plus routes absent from
.specweb/standards/route-contract.yaml. Delta staged in
specs/site-gateway/contracts/route-contract-delta.md for Architect approval.
```

Browser component suite (`@web/test-runner`), keyboard/contrast/zoom manual
passes and no-JS check are not run: no browser runner or dev dependency is
installed and adding one requires an ADR (Article IX).

## Verdict

FAIL — implementation complete and unit-tested, but platform validators and
manual/browser evidence remain blocked as recorded above.
