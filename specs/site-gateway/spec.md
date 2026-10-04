# Site Gateway

> Status: approved

## Problem

The site has no entry point: `src/demo.html` is a "Hello, world!" placeholder.
Visitors cannot discover music, games or projects, and there is no shared
frame (header, theme, routing) for the three areas.

## Requirements

- R-1 Slim sticky header: every view renders a single-row ~48px sticky header
  with site identity, nav links (music, games, projects) and a theme toggle.
  - AC-1.1 Header is visible on `/`, `/music`, `/games`, `/projects`.
  - AC-1.2 Header stays pinned while scrolling on a solid surface.
  - AC-1.3 Active link exposes current-page state programmatically.
  - AC-1.4 At 320px the nav scrolls horizontally; no hamburger.
- R-2 Theme preference: light/dark via `[data-theme]`, OS default, persisted
  choice, safe fallback, 4.5:1 text and 3:1 UI contrast in both themes.
  - AC-2.1 Default follows the OS preference.
  - AC-2.2 Toggle flips, persists and exposes pressed state.
  - AC-2.3 Corrupt stored values fall back without failure.
- R-3 Home gateway: `/` renders three cards linking to the areas with real
  `<a href>` targets.
  - AC-3.1 Three cards with title, blurb and link affordance.
  - AC-3.2 Cards navigate by click, keyboard, middle-click and copy-link.
- R-4 Shared item contract: `{ id, title, subtitle }` required; extras
  dropped; missing fields are PARSE errors.
  - AC-4.1 Every rendered row exposes all three fields.
  - AC-4.2 Unknown fields are ignored.
- R-5 Music list: `/music` heading plus three static rows.
  - AC-5.1 Three rows with title and subtitle.
  - AC-5.2 Rows do not navigate.
- R-6 Games list: `/games` heading plus three static rows.
  - AC-6.1 Three rows with title and subtitle.
- R-7 Projects list: `/projects` heading plus three static rows.
  - AC-7.1 Three rows with title and subtitle.
- R-8 List states: loading/empty/error with announced status; retry for
  NETWORK/TIMEOUT; message-only for permission failures.
  - AC-8.1 Loading exposes busy state.
  - AC-8.2 Empty shows a polite message.
  - AC-8.3 Recoverable failure offers retry; unrecoverable does not.
- R-9 Routing: `/`, `/music`, `/games`, `/projects` map to views; unknown
  paths render not-found inside the shell; title follows route; focus moves
  to the outlet.
  - AC-9.1 Not-found keeps the header with a home link.
  - AC-9.2 Title and focus update on navigation.
- R-10 Accessibility: keyboard-complete, visible focus, named controls,
  no colour-only meaning, reduced-motion honoured.
  - AC-10.1 Keyboard-only journey completes without traps.
  - AC-10.2 All controls expose accessible names.
- R-11 No-JavaScript baseline: header, headings, lists and links render as
  semantic HTML; navigation works as full page loads.
  - AC-11.1 Baseline content is reachable with JS disabled.

## Acceptance criteria

Covered per requirement above (AC-n.m cites R-n).

## States and errors

Loading (`aria-busy`), ready, empty (`role=status`), error (`role=alert`,
retry for NETWORK/TIMEOUT only). Client errors are `AppError` codes;
aborts are silent.

## Accessibility

WCAG 2.2 AA: semantic landmarks, one `h1` per view, `aria-current`,
live regions present before population, focus to outlet on navigation,
`scroll-margin-top` under the sticky header, 24px targets, contrast
per theme, reduced-motion and contrast preferences honoured.

## Security and privacy

No auth in v1 (all routes public). Data via `textContent` only, never
`innerHTML` from data. No secrets in logs, URLs or errors. Theme
preference is the only persisted value, validated on read.

## Out of scope

Per-type metadata, detail routes, search, hamburger menu, real endpoint
integration, `.specweb/` contract changes.
