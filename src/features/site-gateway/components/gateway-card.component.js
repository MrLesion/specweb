/**
 * @file Gateway card linking to one area. Presentational: reads attributes, owns no data.
 * @module site-gateway/components/gateway-card
 */

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  .card { padding: var(--sw-space-3, 0.75rem); border-radius: var(--sw-radius-2, 0.5rem); background: var(--sw-surface, #fff); color: var(--sw-text, #111); }
  .card a { color: var(--sw-action, #00f); }
  a:focus-visible { outline: 0.125rem solid var(--sw-focus-ring, #00f); outline-offset: 0.125rem; }
  @media (prefers-reduced-motion: reduce) {
    .card { transition: none; }
  }
`);

const template = document.createElement('template');
// Static markup only. Any interpolation here would be an HTML sink for data (CMP-015).
template.innerHTML = `
  <div class="card" part="card">
    <h2 class="card__title" part="title"></h2>
    <p class="card__blurb" part="blurb"></p>
    <a class="card__link" part="link">Open</a>
  </div>
`;

/**
 * Gateway card for one area. Renders a real link to the area path.
 *
 * @element app-gateway-card
 *
 * @attribute title - Card title. Required.
 * @attribute blurb - Short description. Optional.
 * @attribute href - Area path the card links to. Required.
 *
 * @property {string} title - Card title; reflects to the `title` attribute.
 * @property {string} href - Area path; reflects to the `href` attribute.
 *
 * @cssprop --sw-surface - Card background.
 * @csspart card - The card container.
 * @csspart link - The area link.
 */
export class GatewayCardElement extends HTMLElement {
  /** @type {string[]} */
  static observedAttributes = ['title', 'blurb', 'href'];

  /** @type {ShadowRoot} */
  #root;

  /** @type {string} */
  #title = '';

  /** @type {string} */
  #href = '/';

  /** @type {HTMLHeadingElement | null} */
  #titleNode = null;

  /** @type {HTMLParagraphElement | null} */
  #blurbNode = null;

  /** @type {HTMLAnchorElement | null} */
  #linkNode = null;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.adoptedStyleSheets = [sheet];
    this.#root.append(template.content.cloneNode(true));
    this.#titleNode = this.#root.querySelector('.card__title');
    this.#blurbNode = this.#root.querySelector('.card__blurb');
    this.#linkNode = this.#root.querySelector('.card__link');
  }

  connectedCallback() {
    this.#title = this.getAttribute('title') ?? '';
    this.#href = this.getAttribute('href') ?? '/';
    this.#render();
  }

  /**
   * @param {string} name Observed attribute name.
   * @param {string | null} oldValue Previous value.
   * @param {string | null} newValue Next value.
   * @returns {void}
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'title') this.#title = newValue ?? '';
    if (name === 'href') this.#href = newValue ?? '/';
    this.#render();
  }

  /** @returns {string} */
  get title() {
    return this.#title;
  }

  /** @param {string} next */
  set title(next) {
    this.#title = String(next ?? '');
    if (this.getAttribute('title') !== this.#title) {
      this.setAttribute('title', this.#title);
    } else {
      this.#render();
    }
  }

  /** @returns {string} */
  get href() {
    return this.#href;
  }

  /** @param {string} next */
  set href(next) {
    this.#href = String(next ?? '/');
    if (this.getAttribute('href') !== this.#href) {
      this.setAttribute('href', this.#href);
    } else {
      this.#render();
    }
  }

  #render() {
    if (this.#titleNode) this.#titleNode.textContent = this.getAttribute('title') ?? this.#title;
    if (this.#blurbNode) this.#blurbNode.textContent = this.getAttribute('blurb') ?? '';
    if (this.#linkNode) {
      const href = this.getAttribute('href') ?? this.#href;
      this.#linkNode.setAttribute('href', href);
      this.#linkNode.textContent = `Open ${this.getAttribute('title') ?? this.#title}`;
    }
  }
}

customElements.define('app-gateway-card', GatewayCardElement);
