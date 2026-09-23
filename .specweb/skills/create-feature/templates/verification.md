# Verification — <Feature name>

> Spec: ./spec.md · Plan: ./plan.md
> Status: FAIL
> Verifier: <name> · Date: <YYYY-MM-DD> · Reviewed revision: <commit or branch>

## Scope of this verification

What was verified, against which revision, and — importantly — what was not.

## Requirement coverage

One row per requirement. The command is run against the reviewed revision; the result is its verbatim
output.

| Requirement | Test | Command | Result |
| --- | --- | --- | --- |
| R-1 | | `<command>` | |

### R-<n> — <short requirement title>

Command:
```
<command>
```

Output:
```
<verbatim output>
```

Notes: what was additionally checked by hand (keyboard, screen reader, zoom, offline).

## Platform checks

```
$ node .specweb/tools/validate-architecture.mjs
$ node .specweb/tools/validate-components.mjs
$ node .specweb/tools/validate-routes.mjs
$ node .specweb/tools/validate-spec-coverage.mjs
$ npm run typecheck
$ node --test tests/unit
```

Paste each command with its output, including the finding counts.

## Accessibility

Automated (axe) results, then the manual passes: keyboard-only, screen reader with the announcements
observed, 200% zoom, 320px reflow, reduced motion.

## Security

`SEC-1` … `SEC-10` from `architecture/security.md`, each answered as pass, fail or not applicable,
with the finding and its evidence.

## Error and state paths

Each failure path exercised, with the command used to force it and the observed behaviour: loading,
empty, partial, failed, offline, unauthorised, aborted, malformed response.

## Defects found

| ID | Severity | Status | Reproduction | Follow-up task |
| --- | --- | --- | --- | --- |
| | | | | |

## Known limitations

What was not verified and why. An unstated gap is the Verifier's responsibility, not the Builder's.

## Verdict

`FAIL` — <what must be re-verified before this can pass>
