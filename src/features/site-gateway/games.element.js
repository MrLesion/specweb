/**
 * @file Games list view element. Subscribes to the games store; renders static rows.
 * @module features/site-gateway/games.element
 */

import './components/item-card.component.js';
import { actions, getState, selectCanRetry, selectOrderedItems, subscribe } from './stores/games.store.js';
import { list } from './services/games.client.js';
import { loadList } from './services/load-list.js';

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  .list-view { display: grid; gap: var(--sw-space-2, 0.5rem); scroll-margin-top: var(--sw-size-header, 3rem); }
  ul { display: grid; gap: var(--sw-space-2, 0.5rem); list-style: none; padding: 0; margin: 0; }
  button { min-block-size: 1.5rem; min-inline-size: 1.5rem; }
  button:focus-visible { outline: 0.125rem solid var(--sw-focus-ring, #00f); outline-offset: 0.125rem; }
  @media (prefers-reduced-motion: reduce) {
    .list-view { transition: none; }
  }
`);

const template = document.createElement('template');
// Static markup only. Any interpolation here would be an HTML sink for data (CMP-015).
template.innerHTML = `
  <section class="list-view" part="list-view" aria-labelledby="games-title">
    <h1 id="games-title" part="title">Games</h1>
    <p class="status" part="status" role="status">Loading games.</p>
    <ul class="items" part="items"></ul>
    <button class="retry" part="retry" type="button" hidden>Retry</button>
  </section>
`;

/**
 * Games list view.
 *
 * @element app-games-view
 *
 * @csspart list-view - The list section.
 */
export class GamesViewElement extends HTMLElement {
  /** @type {string[]} */
  static observedAttributes = [];

  /** @type {ShadowRoot} */
  #root;

  /** @type {HTMLParagraphElement | null} */
  #statusNode = null;

  /** @type {HTMLUListElement | null} */
  #listNode = null;

  /** @type {HTMLButtonElement | null} */
  #retryNode = null;

  /** @type {(() => void) | null} */
  #unsubscribe = null;

  /** @type {AbortController | null} */
  #loader = null;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.adoptedStyleSheets = [sheet];
    this.#root.append(template.content.cloneNode(true));
    this.#statusNode = this.#root.querySelector('.status');
    this.#listNode = this.#root.querySelector('.items');
    this.#retryNode = this.#root.querySelector('.retry');
  }

  connectedCallback() {
    this.#unsubscribe = subscribe(() => this.#render());
    this.#retryNode?.addEventListener('click', this.#onRetry);
    this.#retryNode?.addEventListener('keydown', this.#onRetryKey);
    this.#refresh();
    this.#render();
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#retryNode?.removeEventListener('click', this.#onRetry);
    this.#retryNode?.removeEventListener('keydown', this.#onRetryKey);
    this.#loader?.abort();
    this.#loader = null;
  }

  /**
   * Called when the router removes the view.
   *
   * @returns {void}
   */
  disconnect() {
    this.remove();
  }

  #refresh() {
    this.#loader?.abort();
    this.#loader = new AbortController();
    void loadList(actions, { list }, { signal: this.#loader.signal });
  }

  #render() {
    const state = getState();
    const items = selectOrderedItems(state);
    if (this.#statusNode) {
      if (state.status === 'loading' || state.status === 'idle') {
        this.setAttribute('aria-busy', 'true');
        this.#statusNode.textContent = 'Loading games.';
      } else if (state.status === 'empty') {
        this.removeAttribute('aria-busy');
        this.#statusNode.textContent = 'No games yet.';
      } else if (state.status === 'error') {
        this.removeAttribute('aria-busy');
        this.#statusNode.textContent = state.error?.message ?? 'Loading games failed.';
        this.#statusNode.setAttribute('role', 'alert');
      } else {
        this.removeAttribute('aria-busy');
        this.#statusNode.textContent = `${String(items.length)} games items.`;
        this.#statusNode.setAttribute('role', 'status');
      }
    }
    if (this.#listNode) {
      this.#listNode.replaceChildren();
      for (const item of items) {
        const row = document.createElement('li');
        const card = document.createElement('app-item-card');
        card.setAttribute('item-id', item.id);
        card.setAttribute('title', item.title);
        card.setAttribute('subtitle', item.subtitle);
        row.append(card);
        this.#listNode.append(row);
      }
    }
    if (this.#retryNode) {
      if (selectCanRetry(state)) {
        this.#retryNode.hidden = false;
      } else {
        this.#retryNode.hidden = true;
      }
    }
  }

  /**
   * @param {MouseEvent} event Click event.
   * @returns {void}
   */
  #onRetry = (event) => {
    event.preventDefault();
    this.#refresh();
  };

  /**
   * @param {KeyboardEvent} event Key event.
   * @returns {void}
   */
  #onRetryKey = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#refresh();
    }
  };
}

customElements.define('app-games-view', GamesViewElement);
