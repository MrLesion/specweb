/**
 * @file Not-found view element rendered inside the shell for unknown paths.
 * @module features/site-gateway/not-found.element
 */

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  .not-found { display: grid; gap: var(--sw-space-2, 0.5rem); scroll-margin-top: var(--sw-size-header, 3rem); }
  a:focus-visible { outline: 0.125rem solid var(--sw-focus-ring, #00f); outline-offset: 0.125rem; }
  @media (prefers-reduced-motion: reduce) {
    .not-found { transition: none; }
  }
`);

const template = document.createElement('template');
// Static markup only. Any interpolation here would be an HTML sink for data (CMP-015).
template.innerHTML = `
  <section class="not-found" part="not-found" aria-labelledby="not-found-title">
    <h1 id="not-found-title" part="title">Page not found</h1>
    <p part="message">The page does not exist.</p>
    <a part="home-link" href="/">Back to home</a>
  </section>
`;

/**
 * Not-found view.
 *
 * @element app-not-found
 *
 * @csspart not-found - The not-found section.
 */
export class NotFoundElement extends HTMLElement {
  /** @type {string[]} */
  static observedAttributes = [];

  /** @type {ShadowRoot} */
  #root;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.adoptedStyleSheets = [sheet];
    this.#root.append(template.content.cloneNode(true));
  }

  /**
   * Called when the router removes the view.
   *
   * @returns {void}
   */
  disconnect() {
  }
}

customElements.define('app-not-found', NotFoundElement);
