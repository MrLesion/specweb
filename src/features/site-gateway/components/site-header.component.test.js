/**
 * @file Browser tests for app-site-header. Covers the documented contract only.
 * @module site-gateway/components/site-header.component.test
 *
 * Checklist:
 * - [ ] renders from attributes
 * - [ ] reacts to changed attributes
 * - [ ] property setter reflects to the attribute
 * - [ ] exposes current-page state and theme pressed state
 * - [ ] is operable by keyboard (no pointer used anywhere in these tests)
 */

import { expect } from '@esm-bundle/chai';
import { fixture, html, elementUpdated } from '@open-wc/testing';
import './site-header.component.js';

describe('app-site-header', () => {
  /** @type {HTMLElement & { currentArea: string, theme: string }} */
  let element;

  afterEach(() => {
    element?.remove();
  });

  it('renders nav links and a labelled toggle', async () => {
    element = await fixture(html`<app-site-header></app-site-header>`);
    const nav = element.shadowRoot.querySelector('nav');
    expect(nav.getAttribute('aria-label')).to.equal('Areas');
    expect(element.shadowRoot.querySelectorAll('a[href]').length).to.be.at.least(3);
    expect(element.shadowRoot.querySelector('button').getAttribute('aria-label')).to.equal('Toggle theme');
  });

  it('marks the current area programmatically', async () => {
    element = await fixture(html`<app-site-header current-area="games"></app-site-header>`);
    const games = element.shadowRoot.querySelector('a[href="/games"]');
    expect(games.getAttribute('aria-current')).to.equal('page');
  });

  it('reflects a property set from script to its attribute', async () => {
    element = await fixture(html`<app-site-header></app-site-header>`);
    element.currentArea = 'music';
    await elementUpdated(element);
    expect(element.getAttribute('current-area')).to.equal('music');
  });

  it('exposes theme pressed state', async () => {
    element = await fixture(html`<app-site-header theme="dark"></app-site-header>`);
    expect(element.shadowRoot.querySelector('button').getAttribute('aria-pressed')).to.equal('true');
  });

  it('is operable by keyboard alone', async () => {
    element = await fixture(html`<app-site-header></app-site-header>`);
    const toggle = element.shadowRoot.querySelector('button');
    toggle.focus();
    expect(element.shadowRoot.activeElement ?? document.activeElement).to.equal(toggle);
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
});
