---
name: create-api-client
description: Add a feature API client that validates responses, maps errors to AppError codes and stays inside the service layer.
---

# Skill — create-api-client

**Purpose.** Add the only sanctioned way for a feature to talk to the network: a small client with
typed functions, response validation and an error taxonomy the UI can branch on.

**Used by.** Builder. **Rules.** `architecture/data-access.md` (D1–D7), `ARCH-002`, Article VI.

## When to use

- A feature needs data from, or writes data to, an endpoint.
- An existing endpoint gains a new operation.

## When not to use

- Reading a static file that ships with the app; that is an import, not a request.
- A one-off request in the shell (for example the session probe); that belongs in
  `src/services/`, not in a feature client.

## Inputs

| Input | Source |
| --- | --- |
| Endpoint paths and methods | API documentation or `specs/<id>/spec.md` |
| Response shapes (success and error) | API samples, captured in `specs/<id>/assets/` |
| Domain types the UI needs | `src/types.js` |
| Failure behaviours the UI must show | `plan.md` → *Failure modes* |

## Procedure

1. **Create `src/features/<id>/services/<name>.client.js`** from `templates/client.js`.
2. **Import `request`** from `src/services/http.js`. Never call `fetch` here or anywhere else (D1).
3. **Write one exported function per operation**, named after the resource operation
   (`list`, `get`, `create`, `update`, `remove`), each taking typed arguments and receiving an
   `AbortSignal`.
4. **Validate the response** with a small guard per shape before mapping it to a domain object. Unknown
   fields are dropped, missing required fields raise `AppError('PARSE', …)` with the offending path
   (D3).
5. **Map date and number fields once**, here, so no component ever parses a wire format.
6. **Do not invent error codes.** The taxonomy lives in the transport (`data-access.md`); a client may
   only add a code when it has a distinct user-visible behaviour, and then the taxonomy is updated in
   the same change.
7. **Invalidate explicitly**: after a mutation, invalidate the reads it affects (D4), rather than
   relying on a TTL or a refetch on every render.
8. **Write unit tests with a stubbed transport**: success, each failure code the feature handles, an
   aborted request, and a malformed body.
9. **Run the checks** before checking the task box.

## Templates

| Template | Destination |
| --- | --- |
| `templates/client.js` | `src/features/<id>/services/<name>.client.js` |

## Verification

```bash
node .specweb/tools/validate-architecture.mjs --root .
node --test tests/unit
npm run typecheck
```

## Done criteria

- `fetch` appears nowhere outside `src/services/` (validator-confirmed).
- Every exported function is typed with JSDoc and returns domain objects, never `Response` or an
  envelope.
- Every failure path the UI claims to handle is covered by a unit test with a stub.
- No secret, token or PII is logged, and no untrusted value is interpolated into a URL without
  `encodeURIComponent`.
- Cancellation propagates: passing an aborted signal rejects with an abort, and the UI treats it as
  "nothing happened".

## Common mistakes

- Building the full URL in the client, escaping the base-URL validation in the transport.
- Trusting the response shape and deep-accessing `body.items[0].id`.
- Retrying a `POST` in the client "because it felt transient"; retries belong to the transport, for
  idempotent methods only.
- Creating a second client for the same resource in another feature, so two features cache the same
  data differently.
- Returning `null` on failure, forcing every caller to guess what happened.
