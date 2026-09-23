# <Feature name>

> Status: draft
> Owner: <name> · Created: <YYYY-MM-DD> · Design: <link or none>

## Problem

What the user is trying to accomplish, what they do today instead, and what the status quo costs.
Write this in the stakeholder's words first, then translate. No solutions here.

## Users and contexts

Who uses this, on which devices and connections, with which assistive technology, under what time
pressure. Include the contexts you are *not* designing for.

## Requirements

Numbered, permanent, one behaviour each, in EARS form (`agents/explorer.md`). No file names, no
libraries, no data structures.

- **R-1** The board shall show the number of open tasks.
- **R-2** When the user completes a task, the app shall remove it from the open list within 200 ms of
  the response arriving.
- **R-3** While the board is loading, the app shall show a busy indicator and disable the filter
  controls.
- **R-4** If the list request fails, the app shall keep the existing list visible, show an actionable
  message, and offer a retry that repeats the exact request.

## Acceptance criteria

Each criterion cites its requirement and is written as the check the Verifier will run.

- **AC-1.1** Given 3 open tasks, when the board loads, then "3 open" is visible and correct after a
  task is completed.
- **AC-2.1** Given a task card focused via keyboard, when `Enter` is pressed, then the task leaves the
  open list and the change is announced once.
- **AC-4.1** Given the network is offline, when the board loads, then the previous list (if any) stays
  visible with an offline message and a retry control receives focus only when activated.

## States and errors

| State | Expected behaviour |
| --- | --- |
| Loading | |
| Empty | |
| Partial / stale | |
| Failed | |
| Offline | |
| Unauthorised | |

## Accessibility

The keyboard path, focus behaviour, announcements, target sizes and reflow expectations specific to
this feature (`architecture/accessibility.md`).

## Security and privacy

New inputs, new outputs to the DOM, new storage, new endpoints, and whether any of the data is
personal. State "no new sinks" explicitly when that is true.

## Out of scope

What this feature deliberately does not do, so it is not argued at G4. Naming a non-goal is as
valuable as naming a goal.

## Open questions

| Question | Owner | Blocking? |
| --- | --- | --- |
| | | no |
