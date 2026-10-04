/**
 * @file Browser tests for app-item-card. Covers the documented contract only.
 * @module site-gateway/components/item-card.component.test
 *
 * Checklist:
 * - [ ] renders from attributes
 * - [ ] reacts to changed attributes
 * - [ ] property setter reflects to the attribute
 * - [ ] rows stay static (no link)
 * - [ ] is readable without pointer interaction
 */

import { expect } from '@esm-bundle/chai';
import { fixture, html, elementUpdated } from '@open-wc/testing';
import './item-card.component.js';

describe('app-item-card', () => {
  /** @type {HTMLElement & { title: string }} */
  let element;

  afterEach(() => {
    element?.remove();
  });

  it('renders title and subtitle from attributes', async () => {
    element = await fixture(html`<app-item-card item-id="a" title="A" subtitle="B"></app-item-card>`);
    expect(element.shadowRoot.textContent).to.contain('A');
    expect(element.shadowRoot.textContent).to.contain('B');
  });

  it('reacts when an observed attribute changes', async () => {
    element = await fixture(html`<app-item-card item-id="a" title="First" subtitle="B"></app-item-card>`);
    element.setAttribute('title', 'Second');
    await elementUpdated(element);
    expect(element.shadowRoot.textContent).to.contain('Second');
  });

  it('reflects a property set from script to its attribute', async () => {
    element = await fixture(html`<app-item-card item-id="a" title="A" subtitle="B"></app-item-card>`);
    element.title = 'From script';
    await elementUpdated(element);
    expect(element.getAttribute('title')).to.equal('From script');
  });

  it('stays static with no navigation link', async () => {
    element = await fixture(html`<app-item-card item-id="a" title="A" subtitle="B"></app-item-card>`);
    expect(element.shadowRoot.querySelector('a')).to.equal(null);
  });
});
