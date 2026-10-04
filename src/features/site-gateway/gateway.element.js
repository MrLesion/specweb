/**
 * @file Gateway view element composing the three area cards.
 * @module features/site-gateway/gateway.element
 */

import './components/gateway-card.component.js';

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  .gateway { display: grid; gap: var(--sw-space-3, 0.75rem); scroll-margin-top: var(--sw-size-header, 3rem); }
  ul { display: grid; gap: var(--sw-space-3, 0.75rem); list-style: none; padding: 0; margin: 0; }
  a:focus-visible { outline: 0.125rem solid var(--sw-focus-ring, #00f); outline-offset: 0.125rem; }
  @media (prefers-reduced-motion: reduce) {
    .gateway { transition: none; }
  }
`);

const template = document.createElement('template');
// Static markup only. Any interpolation here would be an HTML sink for data (CMP-015).
template.innerHTML = `
  <section class="gateway" part="gateway" aria-labelledby="gateway-title">
    <h1 id="gateway-title" part="title">Welcome</h1>
    <p part="blurb">Pick a door.</p>
    <ul part="areas">
      <li><app-gateway-card title="Music" blurb="Listen to tracks." href="/music"></app-gateway-card></li>
      <li><app-gateway-card title="Games" blurb="Play games." href="/games"></app-gateway-card></li>
      <li><app-gateway-card title="Projects" blurb="Browse projects." href="/projects"></app-gateway-card></li>
    </ul>
  </section>
`;

/**
 * Home gateway view with three area cards.
 *
 * @element app-gateway
 *
 * @csspart gateway - The gateway section.
 */
export class GatewayElement extends HTMLElement {
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
   * Called when the router mounts the view.
   *
   * @returns {void}
   */
  disconnect() {
  }
}

customElements.define('app-gateway', GatewayElement);
