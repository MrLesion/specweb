/**
 * @file Global error boundary. Logs structured records and renders a non-destructive fallback.
 * @module app/error-boundary
 */

/**
 * Install global error and rejection handlers. Never clears the page.
 *
 * @param {{ onError?: (record: { type: string, message: string }) => void }} [hooks] Optional hooks for tests.
 * @returns {() => void} Teardown removing the listeners.
 */
export function installErrorHandlers(hooks = {}) {
  /**
   * @param {{ type: string, message: string }} record Structured record.
   * @returns {void}
   */
  function report(record) {
    if (hooks.onError) {
      hooks.onError(record);
      return;
    }
    const status = document.querySelector('#app-status');
    if (status) status.textContent = record.message;
  }

  /**
   * @param {ErrorEvent} event Error event.
   * @returns {void}
   */
  function onError(event) {
    report({ type: 'error', message: 'Something went wrong.' });
    void event;
  }

  /**
   * @param {PromiseRejectionEvent} event Rejection event.
   * @returns {void}
   */
  function onRejection(event) {
    report({ type: 'unhandledrejection', message: 'Something went wrong.' });
    void event;
  }

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
