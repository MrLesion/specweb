#!/usr/bin/env node
/**
 * @file validate-components — enforces standards/component-contract.yaml against every element module
 * (`*.component.js`, `*.element.js`, `*.form.js`): documentation, tag naming, observed attributes,
 * location, sibling tests, DOM sinks, shadow-root mode, pointer/keyboard parity and label wiring.
 * Rules CMP-001…CMP-019, defined in architecture/components.md.
 *
 * Zero dependencies: Node built-ins only (Node 18+). See .specweb/README.md for the shared CLI.
 *
 * @module tools/validate-components
 */

import path from 'node:path';
import { pathExists, readTextIfExists, toPosix, walkRoot } from './lib/files.mjs';
import { EXIT, Report, fatal, loadContract, parseArgs, usageText } from './lib/report.mjs';
import { asBoolean, asObject, asString, asStringArray } from './lib/yaml.mjs';
import { lineAt, maskComments } from './lib/source.mjs';

const TOOL = 'validate-components';
const CONTRACT_FILE = 'component-contract.yaml';
const CONTRACT_KIND = 'ComponentContract';
const SCAN_ROOT = 'src';

/**
 * @param {RegExp} pattern
 * @param {string} text
 * @param {number} [group]
 * @returns {Array<{ value: string, index: number }>} every match, in source order
 */
function matchAll(pattern, text, group = 1) {
  /** @type {Array<{ value: string, index: number }>} */
  const results = [];
  pattern.lastIndex = 0;
  let match = pattern.exec(text);
  while (match !== null) {
    const value = match[group] === undefined ? match[0] : match[group];
    results.push({ value, index: match.index });
    if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
    match = pattern.exec(text);
  }
  return results;
}

/**
 * @param {string} value
 * @returns {boolean} true when the value is kebab-case
 */
function isKebab(value) {
  return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value);
}

/**
 * @param {string} value kebab-case
 * @returns {string} PascalCase
 */
function toPascal(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Reason a value written into a DOM sink is unsafe, or null when the value is a constant.
 *
 * The only permitted `innerHTML` is a compile-time constant with no interpolation
 * (architecture/components.md); a template literal containing an interpolation is data and therefore
 * an XSS sink (Article VI).
 *
 * @param {string} text raw file contents
 * @param {number} index offset of the sink expression
 * @returns {string | null}
 */
function unsafeSinkReason(text, index) {
  const slice = text.slice(index);
  const equals = slice.indexOf('=');
  const rhs = (equals === -1 ? slice : slice.slice(equals + 1)).split(';')[0].split('\n')[0].trim();
  if (rhs === '') return null;
  if (rhs.startsWith('`')) {
    const end = rhs.indexOf('`', 1);
    const literal = end === -1 ? rhs : rhs.slice(0, end + 1);
    return literal.includes('${') ? 'an interpolated template literal is data, not markup' : null;
  }
  if (rhs.startsWith("'") || rhs.startsWith('"')) return null;
  return 'the assigned value is not a compile-time constant string';
}

async function main(argv) {
  const { options, unknown } = parseArgs(argv);
  if (options.help) {
    process.stdout.write(usageText(TOOL, 'Check element modules against the component contract', CONTRACT_FILE));
    return EXIT.OK;
  }
  if (unknown.length > 0) fatal(TOOL, `unknown or malformed option: ${unknown.join(', ')}`);

  const rootAbs = path.resolve(String(options.root));
  const standardsDir = options.standards
    ? path.resolve(String(options.standards))
    : path.join(rootAbs, '.specweb', 'standards');
  const contract = await loadContract({ standardsDir, fileName: CONTRACT_FILE, kind: CONTRACT_KIND });
  const report = new Report({
    tool: TOOL,
    contract,
    rootLabel: toPosix(rootAbs),
    standardsLabel: toPosix(path.join(standardsDir, CONTRACT_FILE)),
  });

  const config = {
    elementPrefix: asString(contract.elementPrefix, 'app-'),
    testSuffix: asString(contract.testSuffix, '.component.test.js'),
    classSuffix: asString(contract.classSuffix, 'Element'),
    shadowRootMode: asString(contract.shadowRootMode, 'open'),
    eventNamespace: asString(contract.eventNamespace, 'app:'),
    eventTypes: asStringArray(contract.eventTypes),
    requireKnownEventType: asBoolean(contract.requireKnownEventType, true),
    elementSuffixes: asObject(contract.elementSuffixes),
    requireTestSuffixes: asStringArray(contract.requireTestSuffixes),
  };
  const pointer = asObject(contract.pointerSemantics);
  const pointerEvents = asStringArray(pointer.events, ['click']);
  const labelWiring = asObject(contract.labelWiring);
  const labelControls = asStringArray(labelWiring.controls, ['input', 'select', 'textarea']);

  const srcAbs = path.join(rootAbs, 'src');
  if (!(await pathExists(srcAbs))) {
    if (!options.allowEmpty) {
      fatal(TOOL, 'no src/ directory under the repository root (pass --allow-empty to allow this)');
    }
    report.note('no src/ directory found — nothing to check (--allow-empty)');
    process.stdout.write(
      report.render({ format: options.format, quiet: options.quiet, maxWarnings: options.maxWarnings }),
    );
    return report.exitCode({ maxWarnings: options.maxWarnings });
  }

  const allFiles = (await walkRoot(rootAbs, SCAN_ROOT, {})).filter((file) => file.endsWith('.js'));
  const suffixes = Object.keys(config.elementSuffixes);
  const elementFiles = allFiles.filter((file) => suffixes.some((suffix) => file.endsWith(suffix)));
  report.note(`scanned: ${allFiles.length} source file(s); ${elementFiles.length} element module(s)`);
  if (elementFiles.length === 0) {
    report.note('no element modules found (*.component.js, *.element.js, *.form.js) — nothing to check');
  }

  for (const file of elementFiles) {
    await checkElement({ report, rootAbs, file, config, pointerEvents, labelControls });
  }

  process.stdout.write(
    report.render({ format: options.format, quiet: options.quiet, maxWarnings: options.maxWarnings }),
  );
  return report.exitCode({ maxWarnings: options.maxWarnings });
}

/**
 * Check one element module against the whole CMP rule set.
 *
 * @param {{
 *   report: Report, rootAbs: string, file: string,
 *   config: { elementPrefix: string, testSuffix: string, classSuffix: string, shadowRootMode: string,
 *     eventNamespace: string, eventTypes: string[], requireKnownEventType: boolean,
 *     elementSuffixes: Record<string, unknown>, requireTestSuffixes: string[] },
 *   pointerEvents: string[], labelControls: string[],
 * }} context
 * @returns {Promise<void>}
 */
async function checkElement({ report, rootAbs, file, config, pointerEvents, labelControls }) {
  const basename = file.slice(file.lastIndexOf('/') + 1);
  const suffix = Object.keys(config.elementSuffixes).find((entry) => basename.endsWith(entry)) ?? '';
  const name = basename.slice(0, basename.length - suffix.length);
  const text = await readTextIfExists(path.join(rootAbs, file));
  if (text === null) return;
  const masked = maskComments(text);
  /** @type {(index: number) => number} */
  const line = (index) => lineAt(text, index);

  // CMP-001 — file header.
  const fileTag = /@file\b/.exec(text);
  if (!fileTag) {
    report.add('CMP-001', {
      file,
      message: 'file-level JSDoc header with @file is missing (conventions/jsdoc.md, JS1)',
    });
  }

  // CMP-002/003/004 — the tag is declared in JSDoc and must match the prefix and the file name.
  const elementTag = /@element\s+([A-Za-z][\w-]*)/.exec(text);
  const tag = elementTag ? elementTag[1] : null;
  if (tag === null) {
    report.add('CMP-002', {
      file,
      line: fileTag ? line(fileTag.index) : 0,
      message: '@element JSDoc tag is missing; the tag name must be declared in the source of truth (architecture/components.md)',
    });
  } else {
    if (!tag.startsWith(config.elementPrefix)) {
      report.add('CMP-003', {
        file,
        line: line(elementTag.index),
        message: `tag "${tag}" does not use the "${config.elementPrefix}" prefix (conventions/naming.md)`,
      });
    }
    const expectedTag = `${config.elementPrefix}${name}`;
    if (tag !== expectedTag) {
      report.add('CMP-004', {
        file,
        line: line(elementTag.index),
        message: `tag "${tag}" does not match the file name (expected "${expectedTag}" from ${basename})`,
      });
    }
  }

  // CMP-005/006 — the element is defined here, once, with the declared tag.
  const defineMatch = /customElements\.define\(\s*(['"])([^'"]+)\1/.exec(masked);
  if (!defineMatch) {
    report.add('CMP-005', {
      file,
      message: 'no customElements.define call in this file; an element is defined where it lives (architecture/application.md, A7)',
    });
  } else if (tag !== null && defineMatch[2] !== tag) {
    report.add('CMP-006', {
      file,
      line: line(defineMatch.index),
      message: `customElements.define uses "${defineMatch[2]}" but @element declares "${tag}"`,
    });
  }

  // CMP-007/008/009 — attributes: observed, documented, kebab-case.
  const observedBlock = /static\s+observedAttributes\s*=\s*\[([\s\S]*?)\]/.exec(masked);
  const observed = observedBlock
    ? matchAll(/(['"])([\w-]+)\1/g, observedBlock[1], 2).map((match) => match.value)
    : [];
  const documented = matchAll(/@attribute\s+([\w-]+)/g, text).map((match) => match.value);
  const attributeLine = observedBlock ? line(observedBlock.index) : 0;
  for (const attribute of observed) {
    if (!isKebab(attribute)) {
      report.add('CMP-009', {
        file,
        line: attributeLine,
        message: `observed attribute "${attribute}" is not kebab-case (conventions/naming.md, N2)`,
      });
    }
    if (!documented.includes(attribute)) {
      report.add('CMP-007', {
        file,
        line: attributeLine,
        message: `observed attribute "${attribute}" has no @attribute documentation (architecture/components.md)`,
      });
    }
  }
  for (const attribute of documented) {
    if (!isKebab(attribute)) {
      report.add('CMP-009', {
        file,
        message: `documented attribute "${attribute}" is not kebab-case (conventions/naming.md, N2)`,
      });
    } else if (!observed.includes(attribute)) {
      report.add('CMP-008', {
        file,
        message: `@attribute "${attribute}" is documented but not observed; it is not an input of this element`,
      }, 'warning');
    }
  }
  // CMP-010 — location.
  const allowedPrefixes = asStringArray(config.elementSuffixes[suffix]);
  if (allowedPrefixes.length > 0 && !allowedPrefixes.some((prefix) => file.startsWith(prefix))) {
    report.add('CMP-010', {
      file,
      message: `"${suffix}" modules belong under ${allowedPrefixes.join(' or ')} (standards/component-contract.yaml)`,
    });
  }

  // CMP-011 — sibling test for suffixes that require one.
  if (config.requireTestSuffixes.includes(suffix)) {
    const directory = file.slice(0, file.lastIndexOf('/'));
    const testPath = `${directory}/${name}${config.testSuffix}`;
    if (!(await pathExists(path.join(rootAbs, testPath)))) {
      report.add('CMP-011', {
        file,
        message: `no sibling test file (${testPath}) — every component ships the test for its contract`,
      });
    }
  }

  // CMP-012 — exported class matches the file name.
  const classMatch = /export\s+class\s+([^\s{]+)\s+extends\s+HTMLElement/.exec(masked);
  const expectedClass = `${toPascal(name)}${config.classSuffix}`;
  if (!classMatch) {
    report.add('CMP-012', {
      file,
      message: `no exported class extending HTMLElement; expected "export class ${expectedClass} extends HTMLElement"`,
    });
  } else if (/^[A-Za-z_$][\w$]*$/.test(classMatch[1]) && classMatch[1] !== expectedClass) {
    report.add('CMP-012', {
      file,
      line: line(classMatch.index),
      message: `exported class "${classMatch[1]}" does not match the file name (expected "${expectedClass}")`,
    });
  }

  // CMP-013 — no global style injection, no document-level querying.
  const globalPatterns = [
    { pattern: /document\.head\b/g, what: 'document.head' },
    { pattern: /document\.body\b/g, what: 'document.body' },
    { pattern: /document\.querySelector(?:All)?\s*\(/g, what: 'a document-level query' },
    { pattern: /document\.getElementById\s*\(/g, what: 'document.getElementById' },
    { pattern: /document\.createElement\(\s*['"]style['"]/g, what: 'an injected <style> element' },
  ];
  for (const { pattern, what } of globalPatterns) {
    for (const match of matchAll(pattern, masked, 0)) {
      report.add('CMP-013', {
        file,
        line: line(match.index),
        message: `${what} in an element module; components own their styles and query their own root (architecture/components.md)`,
      });
    }
  }
  // CMP-014/CMP-019 — dispatched events are namespaced, documented and known.
  for (const match of matchAll(/dispatchEvent\(\s*new\s+CustomEvent\(\s*(['"])([^'"]+)\1/g, masked, 2)) {
    const type = match.value;
    if (!type.startsWith(config.eventNamespace)) {
      report.add('CMP-014', {
        file,
        line: line(match.index),
        message: `dispatched event "${type}" is not namespaced "${config.eventNamespace}" (architecture/events.md, E1)`,
      });
      continue;
    }
    if (!text.includes(`@event ${type}`)) {
      report.add('CMP-014', {
        file,
        line: line(match.index),
        message: `dispatched event "${type}" has no @event documentation (conventions/jsdoc.md, JS3)`,
      });
    }
    if (config.requireKnownEventType && !config.eventTypes.includes(type)) {
      report.add('CMP-019', {
        file,
        line: line(match.index),
        message: `event "${type}" is not in standards/component-contract.yaml (eventTypes); add the vocabulary entry in the same change (architecture/events.md)`,
      });
    }
  }

  // CMP-015 — data must never reach an HTML sink (Article VI).
  for (const match of matchAll(/\b(innerHTML|outerHTML)\s*=/g, masked, 0)) {
    const reason = unsafeSinkReason(masked, match.index);
    if (reason) {
      report.add('CMP-015', {
        file,
        line: line(match.index),
        message: `${reason} (Article VI; only a compile-time constant template is permitted)`,
      });
    }
  }
  for (const match of matchAll(/\binsertAdjacentHTML\s*\(/g, masked, 0)) {
    const reason = unsafeSinkReason(masked, match.index);
    if (reason) {
      report.add('CMP-015', {
        file,
        line: line(match.index),
        message: `insertAdjacentHTML — ${reason} (Article VI; use replaceChildren with cloned templates)`,
      });
    }
  }
  for (const match of matchAll(/document\.write\s*\(/g, masked, 0)) {
    report.add('CMP-015', {
      file,
      line: line(match.index),
      message: 'document.write is forbidden (conventions/javascript.md, Forbidden)',
    });
  }

  // CMP-016 — open shadow roots only.
  const closedRoot = /attachShadow\(\s*\{[^}]*mode\s*:\s*['"]closed['"]/.exec(masked);
  if (closedRoot) {
    report.add('CMP-016', {
      file,
      line: line(closedRoot.index),
      message: "closed shadow roots break testing, accessibility tooling and debugging; use mode: 'open'",
    });
  }

  // CMP-017 — a pointer handler needs a keyboard path and a role.
  for (const eventName of pointerEvents) {
    const listeners = matchAll(new RegExp(`\\baddEventListener\\s*\\(\\s*(['"])${eventName}\\1`, 'g'), masked, 0);
    if (listeners.length === 0) continue;
    const hasKeyboard = /\baddEventListener\s*\(\s*(['"])(keydown|keyup|keypress)\1/.test(masked);
    const hasRole = /\brole\s*[=:]/.test(masked);
    const hasTabindex = /tabindex/i.test(masked);
    if (!hasKeyboard || !(hasRole || hasTabindex)) {
      report.add('CMP-017', {
        file,
        line: line(listeners[0].index),
        message: `a "${eventName}" listener without a keyboard path plus role/tabindex is not operable without a pointer (WCAG 2.1.1; Article V)`,
      });
    }
  }

  // CMP-018 — rendered form controls are labelled.
  const controlPattern = new RegExp(`<\\s*(?:${labelControls.join('|')})\\b`);
  const control = controlPattern.exec(masked);
  if (control) {
    const wired = /(<label\b|aria-label\s*=|aria-labelledby\s*=|\bfor\s*=\s*['"])/.test(masked);
    if (!wired) {
      report.add('CMP-018', {
        file,
        line: line(control.index),
        message: 'a rendered form control has no wired label (visible <label for>, wrapping label, aria-label or aria-labelledby) — Article V',
      });
    }
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => fatal(TOOL, error));
