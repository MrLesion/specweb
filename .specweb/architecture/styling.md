# Architecture — Styling

**Scope.** How CSS is organised, how components are themed, and why the stylesheet never becomes a
second, undocumented architecture. The rule is simple: **tokens decide values, layers decide
precedence, components own their own styles and nothing else's.**

**Enforced by.** `architecture/styling.md` review rules (`skills/verify-architecture`),
`tools/validate-components.mjs` (`CMP-013`, no global style injection).

## Cascade layers

`src/styles/main.css` declares the layer order once. Everything else contributes *into* a layer, so
precedence is declared rather than discovered:

```css
@layer reset, tokens, base, layout, components, features, utilities;
```

| Layer | Contains | May not contain |
| --- | --- | --- |
| `reset` | Minimal normalisation (`box-sizing`, margins, `img` behaviour) | Opinionated styling |
| `tokens` | `:root` custom properties, theme overrides | Selectors targeting elements |
| `base` | Element defaults (`body`, `a`, `button`, typography, focus rings) | Component-specific rules |
| `layout` | Page-level grids and containers, the shell regions | Component internals |
| `components` | Shared component styles (usually inside shadow roots) | Page layout |
| `features` | Feature-specific composition rules | Values that belong in tokens |
| `utilities` | Small single-purpose helpers | Anything multi-property or contextual |

Unlayered CSS is forbidden in `src/styles/`: it silently outranks every layer and destroys the
ordering guarantee. A rule that must win uses `!important` only inside `utilities` and only for a
documented reason (for example `[hidden] { display: none !important }`).

## Tokens

Two tiers, and only two. **Primitives** describe what a value *is*; **semantic tokens** describe what
it is *for*. Components use semantic tokens exclusively, which is what makes theming and contrast
audits mechanical.

```css
:root {
  /* primitives */
  --sw-colour-blue-600: oklch(54% 0.18 254);
  --sw-space-3: 0.75rem;
  --sw-radius-2: 0.5rem;

  /* semantic — the only tokens components may reference */
  --sw-surface: var(--sw-colour-white);
  --sw-text: var(--sw-colour-grey-900);
  --sw-text-muted: var(--sw-colour-grey-600);
  --sw-action: var(--sw-colour-blue-600);
  --sw-focus-ring: var(--sw-colour-blue-600);
  --sw-space-inline: var(--sw-space-3);
  --sw-duration-fast: 120ms;
}
```

- Naming: `--sw-<category>-<role>[-<variant>]`, with categories `colour`, `space`, `radius`, `font`,
  `duration`, `elevation`, `size` and `z`.
- Every semantic colour token is defined in **both** themes, and each token that carries text has a
  documented contrast ratio (`accessibility.md`).
- No raw hex value, `px` font size, `rem` spacing or magic number appears in a component stylesheet.
  A value needed twice becomes a token; a value needed once may be a local custom property prefixed
  with the component name.

## Theming

- Light and dark are the same stylesheet with different token values, selected by `[data-theme]` on
  the root element, with `prefers-color-scheme` as the default when the user has not chosen.
- The user's choice is a preference and is persisted through `src/services/storage.js`
  (`state.md`, rule S7).
- Only the tokens layer differs between themes: a component that needs a `[data-theme]` selector to
  look right is using the wrong token.

## Component styles

Components ship styles as a shared `CSSStyleSheet`, constructed once at module scope and adopted
into each instance's shadow root:

```js
const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  .card { padding: var(--sw-space-inline); border-radius: var(--sw-radius-2); }
  @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
`);
```

- `:host` styles the element itself; `::slotted()` is used sparingly and never with descendant
  selectors, which cannot work.
- The public styling API is **CSS custom properties and `part`**, documented in the component's
  JSDoc. A consumer that reaches into `shadowRoot` is a defect (`components.md`).
- Selector depth is capped at three. A rule needing more depth means an element is missing, not that
  a selector is missing.

## Responsive and layout

- Layout is intrinsic first: `flex-wrap`, `grid-template-columns: repeat(auto-fit, minmax(...))`,
  `gap`. Media queries are for *layout changes*, not for spacing tweaks.
- Container queries (`container-type: inline-size`) are preferred for components, because a
  component's width is a property of its container, not of the viewport.
- `min-width` breakpoints only, plus `prefers-reduced-motion` and `prefers-contrast` queries.
- No fixed heights on text containers, and no truncated interactive text without an accessible
  alternative.
- `z-index` values come from tokens (`--sw-z-*`) so stacking order is declared once.
- Logical properties (`margin-inline`, `padding-block`, `inset-inline-start`) are used throughout, so
  right-to-left support works by setting `dir` rather than by mirroring stylesheets.

## Motion

- Durations come from tokens: under 200ms for feedback, under 300ms for transitions.
- Animation never blocks interaction and never delays a state change the user must see; it is
  dropped entirely under `prefers-reduced-motion: reduce`.
- Only `transform` and `opacity` are animated; layout-affecting properties are not.

## Rules

| ID | Rule |
| --- | --- |
| Y1 | Layer order is declared in `main.css`; no unlayered CSS in `src/styles/`. |
| Y2 | Components reference semantic tokens only; no literals for colour, spacing, radius or duration. |
| Y3 | Both themes define every semantic token, and contrast is verified per theme. |
| Y4 | Component styles are constructable stylesheets adopted by the component. |
| Y5 | The styling API is custom properties and `part`; no external `shadowRoot` access. |
| Y6 | Logical properties throughout; no directional hard-coded insets. |
| Y7 | Reduced-motion and increased-contrast preferences are honoured. |
| Y8 | Selector depth ≤ 3, and no `!important` outside `utilities`. |

## Anti-patterns

- An inline `style="..."` attribute used for theming, which defeats both the cascade and the tokens.
- Per-component media queries that duplicate the same breakpoint constant; breakpoints are declared
  once, or avoided in favour of container queries.
- Styling by tag (`div > p`) across feature boundaries, coupling layout to markup you do not own.
- A new token per screen (`--sw-checkout-blue`); that is a primitive wearing a feature name.
- `!important` used to beat a specificity problem created by a deep selector.
