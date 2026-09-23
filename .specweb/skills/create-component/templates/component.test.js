/**
 * @file Browser tests for <tag-name>. Covers the documented contract only:
 * attributes in, properties in, events out, keyboard operation.
 * @module components/<name>.component.test
 *
 * Checklist:
 * - [ ] renders from attributes
 * - [ ] reacts to changed attributes
 * - [ ] property setter reflects to the attribute
 * - [ ] emits the documented event, with the documented detail
 * - [ ] is operable by keyboard (no pointer used anywhere in these tests)
 * - [ ] has no axe violations in its default state
 */

import { expect } from '@esm-bundle/chai';
import { fixture, html, elementUpdated } from '@open-wc/testing'; // browser test helpers
import { axe } from 'axe-core';
import './<name>.component.js';

describe('<tag-name>', () => {
  /** @type {HTMLElement & { value: string }} */
  let element;

  afterEach(() => {
    element?.remove();
  });

  it('renders the label from the attribute', async () => {
    element = await fixture(html`<<tag-name> label="Due today"></<tag-name>>`);
    expect(element.getAttribute('label')).to.equal('Due today');
    // Assert on the public contract, not on internal classes.
    expect(element.textContent.trim()).to.equal('Due today');
  });

  it('reacts when an observed attribute changes', async () => {
    element = await fixture(html`<<tag-name> label="First"></<tag-name>>`);
    element.setAttribute('label', 'Second');
    await elementUpdated(element);
    expect(element.textContent.trim()).to.equal('Second');
  });

  it('reflects a property set from script to its attribute', async () => {
    element = await fixture(html`<<tag-name>></<tag-name>>`);
    element.value = 'from-script';
    await elementUpdated(element);
    expect(element.getAttribute('value')).to.equal('from-script');
  });

  it('emits the documented event with its detail', async () => {
    element = await fixture(html`<<tag-name> value="42"></<tag-name>>`);
    const received = new Promise((resolve) => {
      element.addEventListener('app:<noun>-<verb>', (event) => resolve(event.detail), { once: true });
    });
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(await received).to.deep.equal({ value: '42' });
  });

  it('is operable by keyboard alone', async () => {
    element = await fixture(html`<<tag-name> value="1"></<tag-name>>`);
    const control = element.shadowRoot.querySelector('button') ?? element;
    control.focus();
    expect(element.shadowRoot.activeElement ?? document.activeElement).to.equal(control);
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Space', bubbles: true }));
  });

  it('has no axe violations', async () => {
    element = await fixture(html`<<tag-name> label="Check"></<tag-name>>`);
    const results = await axe(element);
    expect(results.violations).to.deep.equal([]);
  });
});
