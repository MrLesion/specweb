/**
 * @file Slim sticky site header. Presentational: reads attributes, navigates with real links.
 * @module site-gateway/components/site-header
 */

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  .header { block-size: var(--sw-size-header, 3rem); display: flex; align-items: center; gap: var(--sw-space-3, 0.75rem); background: var(--sw-surface, #fff); }
  .brand { font-weight: 700; color: var(--sw-text, #111); text-decoration: none; }
  .nav { display: flex; gap: var(--sw-space-2, 0.5rem); overflow-x: auto; flex: 1; }
  .nav a { color: var(--sw-text, #111); padding: 0.25rem 0.5rem; border-radius: var(--sw-radius-1, 0.25rem); }
  .nav a[aria-current="page"] { text-decoration: underline; }
  .toggle { min-block-size: 1.5rem; min-inline-size: 1.5rem; }
  :host { position: sticky; top: 0; z-index: var(--sw-z-header, 10); }
  a:focus-visible, button:focus-visible { outline: 0.125rem solid var(--sw-focus-ring, #00f); outline-offset: 0.125rem; }
  @media (prefers-reduced-motion: reduce) {
    .header { transition: none; }
  }
`);

const template = document.createElement('template');
// Static markup only. Any interpolation here would be an HTML sink for data (CMP-015).
template.innerHTML = `
  <div class="header" part="header">
    <a class="brand" part="brand" href="/">Gateway</a>
    <nav class="nav" part="nav" aria-label="Areas">
      <a href="/music" data-area="music">Music</a>
      <a href="/games" data-area="games">Games</a>
      <a href="/projects" data-area="projects">Projects</a>
    </nav>
    <button class="toggle" part="toggle" type="button" aria-pressed="false" aria-label="Toggle theme">Theme</button>
  </div>
`;

/**
 * Site header with area navigation and a theme toggle.
 *
 * @element app-site-header
 *
 * @attribute current-area - Active area id (music, games, projects). Optional.
 * @attribute theme - Current theme (light or dark). Optional; reflected from the property.
 *
 * @property {string} currentArea - Active area id; reflects to the `current-area` attribute.
 * @property {string} theme - Current theme; reflects to the `theme` attribute.
 *
 * @cssprop --sw-surface - Header background.
 * @csspart header - The header row container.
 * @csspart nav - The navigation region.
 * @csspart toggle - The theme toggle button.
 */
export class SiteHeaderElement extends HTMLElement {
  /** @type {string[]} */
  static observedAttributes = ['current-area', 'theme'];

  /** @type {ShadowRoot} */
  #root;

  /** @type {string} */
  #currentArea = '';

  /** @type {string} */
  #theme = 'light';

  /** @type {HTMLButtonElement | null} */
  #toggle = null;

  /** @type {Map<string, HTMLAnchorElement>} */
  #links = new Map();

  /** @type {(() => void) | null} */
  #unsubscribeTheme = null;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.adoptedStyleSheets = [sheet];
    this.#root.append(template.content.cloneNode(true));
    this.#toggle = this.#root.querySelector('.toggle');
    for (const link of this.#root.querySelectorAll('a[data-area]')) {
      const area = link.getAttribute('data-area') ?? '';
      this.#links.set(area, /** @type {HTMLAnchorElement} */ (link));
    }
  }

  connectedCallback() {
    this.#currentArea = this.getAttribute('current-area') ?? '';
    this.#theme = this.getAttribute('theme') ?? 'light';
    this.#render();
    this.#toggle?.addEventListener('click', this.#onToggle);
    this.#toggle?.addEventListener('keydown', this.#onToggleKey);
    this.#unsubscribeTheme = window.app?.theme?.subscribe((theme) => {
      this.#theme = theme;
      this.#render();
    }) ?? null;
  }

  disconnectedCallback() {
    this.#toggle?.removeEventListener('click', this.#onToggle);
    this.#toggle?.removeEventListener('keydown', this.#onToggleKey);
    this.#unsubscribeTheme?.();
    this.#unsubscribeTheme = null;
  }

  /**
   * @param {string} name Observed attribute name.
   * @param {string | null} oldValue Previous value.
   * @param {string | null} newValue Next value.
   * @returns {void}
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'current-area') this.#currentArea = newValue ?? '';
    if (name === 'theme') this.#theme = newValue ?? 'light';
    this.#render();
  }

  /** @returns {string} */
  get currentArea() {
    return this.#currentArea;
  }

  /** @param {string} next */
  set currentArea(next) {
    this.#currentArea = String(next ?? '');
    if (this.getAttribute('current-area') !== this.#currentArea) {
      this.setAttribute('current-area', this.#currentArea);
    } else {
      this.#render();
    }
  }

  /** @returns {string} */
  get theme() {
    return this.#theme;
  }

  /** @param {string} next */
  set theme(next) {
    this.#theme = String(next ?? 'light');
    if (this.getAttribute('theme') !== this.#theme) {
      this.setAttribute('theme', this.#theme);
    } else {
      this.#render();
    }
  }

  #render() {
    for (const [area, link] of this.#links) {
      if (area !== '' && area === this.#currentArea) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
    if (this.#toggle) {
      this.#toggle.setAttribute('aria-pressed', this.#theme === 'dark' ? 'true' : 'false');
      this.#toggle.textContent = this.#theme === 'dark' ? 'Light' : 'Dark';
    }
  }

  /** @returns {void} */
  #requestToggle() {
    window.app?.theme?.toggle();
  }

  /**
   * @param {MouseEvent} event Click event.
   * @returns {void}
   */
  #onToggle = (event) => {
    event.preventDefault();
    this.#requestToggle();
  };

  /**
   * @param {KeyboardEvent} event Key event.
   * @returns {void}
   */
  #onToggleKey = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#requestToggle();
    }
  };
}

customElements.define('app-site-header', SiteHeaderElement);
