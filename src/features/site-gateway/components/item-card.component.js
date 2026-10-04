/**
 * @file Static item card for one list row. Presentational: reads attributes, owns no data.
 * @module site-gateway/components/item-card
 */

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  .item { padding: var(--sw-space-2, 0.5rem); border-radius: var(--sw-radius-1, 0.25rem); background: var(--sw-surface, #fff); color: var(--sw-text, #111); }
  .item__subtitle { color: var(--sw-text-muted, #555); }
  @media (prefers-reduced-motion: reduce) {
    .item { transition: none; }
  }
`);

const template = document.createElement('template');
// Static markup only. Any interpolation here would be an HTML sink for data (CMP-015).
template.innerHTML = `
  <div class="item" part="item">
    <h3 class="item__title" part="title"></h3>
    <p class="item__subtitle" part="subtitle"></p>
  </div>
`;

/**
 * Static row for one shared-shape item. Rows do not navigate in v1.
 *
 * @element app-item-card
 *
 * @attribute item-id - Stable identifier. Required.
 * @attribute title - Item title. Required.
 * @attribute subtitle - Item subtitle. Required.
 *
 * @property {string} title - Item title; reflects to the `title` attribute.
 *
 * @cssprop --sw-surface - Row background.
 * @csspart item - The row container.
 * @csspart title - The title element.
 * @csspart subtitle - The subtitle element.
 */
export class ItemCardElement extends HTMLElement {
  /** @type {string[]} */
  static observedAttributes = ['item-id', 'title', 'subtitle'];

  /** @type {ShadowRoot} */
  #root;

  /** @type {string} */
  #title = '';

  /** @type {HTMLHeadingElement | null} */
  #titleNode = null;

  /** @type {HTMLParagraphElement | null} */
  #subtitleNode = null;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.adoptedStyleSheets = [sheet];
    this.#root.append(template.content.cloneNode(true));
    this.#titleNode = this.#root.querySelector('.item__title');
    this.#subtitleNode = this.#root.querySelector('.item__subtitle');
  }

  connectedCallback() {
    this.#title = this.getAttribute('title') ?? '';
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

  #render() {
    if (this.#titleNode) this.#titleNode.textContent = this.getAttribute('title') ?? this.#title;
    if (this.#subtitleNode) this.#subtitleNode.textContent = this.getAttribute('subtitle') ?? '';
  }
}

customElements.define('app-item-card', ItemCardElement);
