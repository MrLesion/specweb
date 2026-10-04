# Site gateway — route contract delta

This change declares five routes. Each entry matches its module one-to-one
(`RTE-001`…`RTE-004`): `id`, `path`, `title`, `element`, `guard: null`
(public views) and `lazy: true` (dynamic `import()` in every `load()`).
Every route names `spec: site-gateway`, whose spec lives at
`specs/site-gateway/spec.md`.

```yaml
routes:
  - id: gateway
    path: /
    module: src/features/site-gateway/gateway.route.js
    element: app-gateway
    title: Welcome
    guard: null
    lazy: true
    spec: site-gateway
  - id: music
    path: /music
    module: src/features/site-gateway/music.route.js
    element: app-music-view
    title: Music
    guard: null
    lazy: true
    spec: site-gateway
  - id: games
    path: /games
    module: src/features/site-gateway/games.route.js
    element: app-games-view
    title: Games
    guard: null
    lazy: true
    spec: site-gateway
  - id: projects
    path: /projects
    module: src/features/site-gateway/projects.route.js
    element: app-projects-view
    title: Projects
    guard: null
    lazy: true
    spec: site-gateway
  - id: not-found
    path: '*'
    module: src/features/site-gateway/not-found.route.js
    element: app-not-found
    title: Page not found
    guard: null
    lazy: true
    spec: site-gateway
```
