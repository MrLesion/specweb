/**
 * @file Form controller for <what it creates or edits>. Owns values, touched/dirty flags, validation
 * and submission state. Fields are generic elements; validation is pure and unit-tested.
 * @module features/<id>/<name>.form
 */

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  form { display: grid; gap: var(--sw-space-inline, 0.75rem); }
`);

const template = document.createElement('template');
template.innerHTML = `
  <form novalidate>
    <app-text-field name="title" label="Title" required></app-text-field>
    <div role="alert" class="alert" hidden></div>
    <button type="submit" part="submit">Save</button>
  </form>
`;

/** @typedef {{ title: string }} Values */

/**
 * <Name> form.
 *
 * @element app-<id>-form
 *
 * @attribute initial-title - Prefilled title, for edit flows. Optional.
 *
 * @cssprop --sw-space-inline - Gap between fields.
 *
 * @event app:form-submitted - Values passed client-side validation and the write succeeded.
 * @type {CustomEvent<{ formId: string, values: Values }>}
 * @event app:form-invalid - Submission was blocked by client-side validation.
 * @type {CustomEvent<{ formId: string, fields: Record<string, string> }>}
 */
export class <Name>FormElement extends HTMLElement {
  static observedAttributes = ['initial-title'];

  #form = null;
  #alert = null;
  #submit = null;
  /** @type {Record<string, string>} */
  #touched = {};
  /** @type {boolean} */
  #submitting = false;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [sheet];
    root.append(template.content.cloneNode(true));
    this.#form = root.querySelector('form');
    this.#alert = root.querySelector('.alert');
    this.#submit = root.querySelector('button[type="submit"]');
  }

  connectedCallback() {
    this.#form.addEventListener('submit', this.#onSubmit);
    this.#form.addEventListener('app:field-changed', this.#onFieldChanged);
    this.#form.addEventListener('focusout', this.#onFieldBlurred);
    this.#syncInitialValues();
  }

  disconnectedCallback() {
    // Every listener added above is released here (conventions/javascript.md, J5).
    this.#form.removeEventListener('submit', this.#onSubmit);
    this.#form.removeEventListener('app:field-changed', this.#onFieldChanged);
    this.#form.removeEventListener('focusout', this.#onFieldBlurred);
  }

  /** @param {string} name @param {string | null} oldValue @param {string | null} newValue */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'initial-title') this.#syncInitialValues();
  }

  /** @returns {Values} Collected by name from the controller, never by DOM traversal (F10). */
  #values() {
    /** @type {Record<string, string>} */
    const raw = {};
    for (const field of this.#fields()) {
      const name = field.getAttribute('name');
      if (name) raw[name] = field.getAttribute('value') ?? '';
    }
    return { title: raw.title ?? '' };
  }

  /** @returns {NodeListOf<HTMLElement>} The generic field elements this form composes. */
  #fields() {
    return this.#form.querySelectorAll('app-text-field, app-select-field');
  }

  /**
   * Pure validation: values in, field errors out, no DOM access — so it is unit-testable (F5).
   *
   * @param {Values} values
   * @returns {Record<string, string>} Field name -> message
   */
  #validate(values) {
    /** @type {Record<string, string>} */
    const errors = {};
    if (values.title.trim().length === 0) errors.title = 'Enter a title.';
    else if (values.title.length > 120) errors.title = 'Use 120 characters or fewer.';
    return errors;
  }

  /** @param {Record<string, string>} errors @returns {string[]} The invalid field names, in order. */
  #showErrors(errors) {
    const invalid = Object.keys(errors);
    for (const field of this.#fields()) {
      const name = field.getAttribute('name') ?? '';
      const visible = Boolean(this.#touched[name]) || invalid.includes(name);
      if (visible) field.setAttribute('error', errors[name] ?? '');
      else field.removeAttribute('error');
    }
    // The live region already exists in the DOM, so the message is announced (accessibility.md).
    this.#alert.textContent = invalid.length
      ? `Cannot save: ${invalid.length} field needs attention. ${errors[invalid[0]]}`
      : '';
    this.#alert.hidden = invalid.length === 0;
    return invalid;
  }

  #onSubmit = async (event) => {
    event.preventDefault();
    if (this.#submitting) return; // the only double-submit guard that also covers the keyboard path

    const values = this.#values();
    const errors = this.#validate(values);
    if (Object.keys(errors).length > 0) {
      for (const name of Object.keys(errors)) this.#touched[name] = true;
      const invalid = this.#showErrors(errors);
      for (const field of this.#fields()) {
        // Focus the first invalid field, not the form (forms.md, F6).
        if (field.getAttribute('name') === invalid[0]) {
          field.focus();
          break;
        }
      }
      this.dispatchEvent(new CustomEvent('app:form-invalid', {
        detail: { formId: 'app-<id>-form', fields: errors },
        bubbles: true,
        composed: true,
      }));
      return;
    }

    this.#submitting = true;
    this.#submit.disabled = true;
    this.#form.setAttribute('aria-busy', 'true');
    try {
      // The write goes through the feature client, never fetch (architecture/data-access.md, D1).
      await this.#save(values);
      this.dispatchEvent(new CustomEvent('app:form-submitted', {
        detail: { formId: 'app-<id>-form', values },
        bubbles: true,
        composed: true,
      }));
    } catch (error) {
      // Values are never discarded on failure (forms.md, F7).
      this.#alert.textContent = error instanceof Error && error.message
        ? 'Could not save. Your input is still here — try again.'
        : 'Could not save.';
      this.#alert.hidden = false;
    } finally {
      this.#submitting = false;
      this.#submit.disabled = false;
      this.#form.removeAttribute('aria-busy');
    }
  };

  #onFieldChanged = (event) => {
    const detail = /** @type {CustomEvent<{ name: string, value: string }>} */ (event).detail;
    this.#touched[detail.name] = true;
    this.#showErrors(this.#validate(this.#values()));
  };

  #onFieldBlurred = (event) => {
    const field = /** @type {HTMLElement} */ (event.target);
    const name = typeof field.getAttribute === 'function' ? field.getAttribute('name') : null;
    if (!name) return;
    this.#touched[name] = true;
    this.#showErrors(this.#validate(this.#values()));
  };

  #syncInitialValues() {
    const initial = this.getAttribute('initial-title');
    if (initial === null) return;
    for (const field of this.#fields()) {
      if (field.getAttribute('name') === 'title') field.setAttribute('value', initial);
    }
  }

  /**
   * @param {Values} values
   * @returns {Promise<void>}
   * @throws {AppError} whatever the feature client throws; the form only renders the outcome
   */
  async #save(values) {
    void values;
    throw new Error('Wire this to the feature client (skills/create-api-client).');
  }
}

customElements.define('app-<id>-form', <Name>FormElement);
