/**
 * @file Browser tests for app-gateway-card. Covers the documented contract only.
 * @module site-gateway/components/gateway-card.component.test
 *
 * Checklist:
 * - [ ] renders from attributes
 * - [ ] reacts to changed attributes
 * - [ ] property setter reflects to the attribute
 * - [ ] link target is a real href
 * - [ ] is operable by keyboard (no pointer used anywhere in these tests)
 */

import { expect } from '@esm-bundle/chai';
import { fixture, html, elementUpdated } from '@open-wc/testing';
import './gateway-card.component.js';

describe('app-gateway-card', () => {
  /** @type {HTMLElement & { title: string, href: string }} */
  let element;

  afterEach(() => {
    element?.remove();
  });

  it('renders title and a real link', async () => {
    element = await fixture(html`<app-gateway-card title="Music" blurb="Listen." href="/music"></app-gateway-card>`);
    const link = element.shadowRoot.querySelector('a');
    expect(link.getAttribute('href')).to.equal('/music');
    expect(link.textContent).to.contain('Music');
  });

  it('reacts when an observed attribute changes', async () => {
    element = await fixture(html`<app-gateway-card title="First" href="/music"></app-gateway-card>`);
    element.setAttribute('title', 'Second');
    await elementUpdated(element);
    expect(element.shadowRoot.querySelector('a').textContent).to.contain('Second');
  });

  it('reflects a property set from script to its attribute', async () => {
    element = await fixture(html`<app-gateway-card title="Music" href="/music"></app-gateway-card>`);
    element.href = '/games';
    await elementUpdated(element);
    expect(element.getAttribute('href')).to.equal('/games');
  });

  it('is operable by keyboard alone', async () => {
    element = await fixture(html`<app-gateway-card title="Music" href="/music"></app-gateway-card>`);
    const link = element.shadowRoot.querySelector('a');
    link.focus();
    expect(element.shadowRoot.activeElement ?? document.activeElement).to.equal(link);
  });
});
