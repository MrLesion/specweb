# Tasks

## 1. Shell entry, stores, services, views and routes

- [x] 1.1 Flatten entry to `index.html` plus `src/main.js` with header, main outlet, footer and live region; verify the page loads with one module script and landmarks present
- [x] 1.2 Implement shell, tokens, theme, transport, storage, validator, stub clients, stores, loading, shared components, views and routes with unit tests; verify `node --test` passes (22 tests)
- [ ] 1.3 Browser component suite for header, gateway-card and item-card (attributes, properties, keyboard)
- [ ] 1.4 Keyboard-only journey, focus visibility, names, live regions and reduced-motion manual results
- [ ] 1.5 No-JavaScript baseline renders header, headings, lists and links as semantic HTML
- [ ] 1.6 Contrast audit 4.5:1 text and 3:1 UI in both themes with token audit plus rendered spot check
- [ ] 1.7 SpecWeb validators plus test suites with recorded command outputs for verification evidence

## Blocker

- Validators `validate-architecture`/`validate-routes` cannot pass unmodified: `walkRoot(root, 'src')` returns `src/`-relative paths (for example `app/config.js`) while layer prefixes and `src/` path checks expect repo-relative paths (for example `src/app`). Do not edit `.specweb/` to make the feature pass (Article X). Route declarations are staged in `specs/site-gateway/contracts/route-contract-delta.md` for Architect approval.
