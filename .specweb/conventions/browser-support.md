# Conventions — Browser Support

**Scope.** Which browsers the application supports, which platform features it may rely on without
detection, and what to do when a feature is missing. The baseline is deliberately recent, because it
is what removes the need for a transpiler, a polyfill bundle and a framework (Article IX).

**Enforced by.** `tools/validate-architecture.mjs` (`ARCH-005`, `ARCH-006` — no dependency may
substitute for a platform feature), `skills/verify-architecture/SKILL.md` (baseline review).

## Baseline

Support means "evergreen, two versions behind the current stable release of the four major engines":

| Engine | Minimum | Notes |
| --- | --- | --- |
| Chrome / Edge (Chromium) | last 2 stable releases | Reference implementation for most features below |
| Firefox | last 2 stable releases (ESR accepted) | Accessibility-tree behaviour differs; test focus paths here |
| Safari (macOS and iOS) | last 2 major releases | Constrains date/`Intl`, storage eviction and PWA install |
| Android WebView | Chromium-equivalent, last 2 | Same engine rules as Chrome |

Anything older requires a decision record naming the browser, the reason and a removal date. "No build
step" is a property of this platform, and old browsers are what destroy it.

## Features relied on without detection

Baseline-safe and usable directly:

- ES2022: class fields, `#private`, top-level `await`, `??=`, `Array.prototype.at`, `Object.hasOwn`.
- Modules: `<script type="module">`, dynamic `import()`, import maps where aliases are enabled.
- Custom Elements v1, Shadow DOM v1, `<template>`, `ElementInternals` for form participation.
- `adoptedStyleSheets` / `CSSStyleSheet`, CSS custom properties, `@layer`, `:is()`/`:where()`/`:has()`,
  container queries, `color-mix()`, `oklch`.
- `fetch`, `AbortController`, `URLSearchParams`, `structuredClone`, `Intl.*`, `ResizeObserver`,
  `IntersectionObserver`, `MutationObserver`.
- `<dialog>`, `loading="lazy"`, `inert`, `:focus-visible`, `prefers-*` media queries.

## Features that require detection or a fallback

| Feature | Strategy |
| --- | --- |
| `showPopover` / popover API | Detect; fall back to `<dialog>` or a positioned element with manual focus handling. |
| View Transitions | Enhancement only: navigation is correct without it, and reduced motion disables it. |
| File System Access, Web Share, Clipboard write | Detect and hide the affordance entirely when absent; never render a broken button. |
| Web Authentication, Notifications, Geolocation | Detect plus a user-initiated request path; permission denial is a normal state. |
| Service Worker / offline cache | Detect; the app is fully usable online without it, and storage eviction is handled. |
| `Navigation` API, `scheduler.yield`, `requestIdleCallback` | Optional performance paths with a microtask/timer fallback. |

```js
if ('showPopover' in HTMLElement.prototype) { /* enhanced path */ }
```

Detection is **capability based**, never user-agent based. A user-agent string is used for diagnostics
only, never to branch behaviour.

## Polyfills

- None by default. A polyfill is a *runtime dependency* and therefore requires a decision record
  (`constitution.md`, Article IX) naming the browser gap, the size cost and the removal date.
- Core-js-style "just in case" bundles are forbidden: they patch globals for every visitor in order to
  serve an unsupported minority.
- When a polyfill is approved it is loaded conditionally — feature detection first, and only on the
  code path that needs it.

## Progressive enhancement

The application stays *functional* without CSS and *usable* when JavaScript arrives late:

1. Real HTML first: links are `<a href>`, forms are `<form>` with a real `action`, controls are real
   controls, tables are `<table>`.
2. Enhance on top: the router intercepts link clicks; the form controller adds validation on top of
   the browser's own.
3. A no-JS or partial-JS visitor sees content and working links, not an empty `<div id="app">`.
4. Content that exists only after JavaScript runs is announced through a live region so it is not
   silently missed.

## CSS support rules

- Prefer widely supported features over clever ones: `grid`, `flex`, custom properties, `:is()`,
  `clamp()` and logical properties are baseline; newer syntax is checked against the baseline table
  before use.
- `@supports` is for *visual* enhancements, never for core layout: a layout that collapses without
  support is a defect, not graceful degradation.
- Vendor prefixes are not written by hand; a property that needs one does not meet the baseline.
- `@media (prefers-reduced-motion: reduce)`, `(prefers-contrast: more)` and `(forced-colors: active)`
  are supported paths, not optional extras.

## Testing matrix

| Level | Engines covered |
| --- | --- |
| Component and integration (`@web/test-runner`) | Chromium, Firefox, WebKit (covers Safari's engine) |
| End-to-end (Playwright) | Chromium, Firefox, WebKit, plus a mobile viewport project for touch and target size |
| Manual, per feature | At least one real Safari pass (iOS or macOS) for storage, focus and `Intl` behaviour |
| Accessibility | NVDA on Windows/Firefox, VoiceOver on macOS/Safari (`accessibility.md`) |

An engine difference that changes behaviour is never worked around silently: it is recorded in the
feature's `verification.md`, and in a decision record when it changes the contract.

## Rules

| ID | Rule |
| --- | --- |
| B1 | Support is limited to the baseline table above. |
| B2 | No polyfill without a decision record and a removal date. |
| B3 | Feature detection is by capability, never by user agent. |
| B4 | Core functionality works without CSS and without JavaScript-enhanced paths. |
| B5 | A missing optional capability hides the affordance instead of breaking it. |
| B6 | `prefers-reduced-motion`, `prefers-contrast` and `forced-colors` are honoured. |
| B7 | All three engines run the component and integration suites; Safari also gets a manual pass. |

## Anti-patterns

- `if (isSafari)` — branching on identity rather than capability.
- Shipping a feature behind a permanent flag because "some users cannot run it", with no removal date.
- `@supports` around core layout, so unsupported engines get an unusable page instead of an ugly one.
- Treating `localStorage` as durable: it is evictable, so anything important must be re-fetchable.
- Adding a build step for one syntax feature that every supported browser already parses.
