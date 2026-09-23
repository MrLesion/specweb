/**
 * @file <One sentence: what this element is and what it is responsible for.>
 * @module components/<name>
 */

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  .root { padding: var(--sw-space-inline, 0.75rem); border-radius: var(--sw-radius-2, 0.5rem); }
  @media (prefers-reduced-motion: reduce) {
    .root { transition: none; }
  }
`);

const template = document.createElement('template');
// Static markup only. Any interpolation here would be an HTML sink for data (CMP-015).
template.innerHTML = `
  <div class="root" part="root">
    <p class="label"></p>
  </div>
`;

/**
 * <One sentence describing the element's contract.>
 *
 * @element <tag-name>
 *
 * @attribute label - <Meaning, and whether it is required.>
 * @attribute value - <Meaning. Optional; empty when absent.>
 *
 * @property {string} value - <Meaning; reflects to the `value` attribute.>
 *
 * @cssprop --<tag-name>-accent - <What it tints.>
 * @csspart root - The outer container.
 *
 * @event app:<noun>-<verb> - <What the user did. Dispatched on user intent, not on attribute change.>
 * @type {CustomEvent<{ value: string }>}
 */
export class <Name>Element extends HTMLElement {
  /** @type {string[]} */
  static observedAttributes = ['label', 'value'];

  /** @type {ShadowRoot} */
  #root;

  #labelNode = null;
  #value = '';

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' }); // closed roots break testing and a11y tooling
    this.#root.adoptedStyleSheets = [sheet];
    this.#root.append(template.content.cloneNode(true));
    this.#labelNode = this.#root.querySelector('.label');
  }

  connectedCallback() {
    this.#render();
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'value') this.#value = newValue ?? '';
    this.#render();
  }

  /** @returns {string} */
  get value() {
    return this.#value;
  }

  /** @param {string} next */
  set value(next) {
    this.#value = String(next ?? '');
    // Reflect so markup and script can never disagree.
    if (this.getAttribute('value') !== this.#value) this.setAttribute('value', this.#value);
    else this.#render();
  }

  #render() {
    // Data reaches the DOM through textContent only.
    if (this.#labelNode) this.#labelNode.textContent = this.getAttribute('label') ?? '';
  }

  /** @param {string} value */
  #emitIntent(value) {
    this.dispatchEvent(new CustomEvent('app:<noun>-<verb>', {
      detail: { value },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('<tag-name>', <Name>Element);
