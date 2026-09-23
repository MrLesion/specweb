/**
 * @file Tool harness shared by the SpecWeb validators: uniform arguments, contract loading, rule
 * configuration, finding collection, deterministic human/JSON rendering, and exit codes.
 *
 * @module tools/lib/report
 */

import path from 'node:path';
import { parseYaml, asObject } from './yaml.mjs';
import { readTextIfExists, toPosix } from './files.mjs';

/** The contract set every validator asserts before it does anything else. */
export const API_VERSION = 'specweb.dev/v1';

/** Uniform exit codes across all four tools (see .specweb/README.md). */
export const EXIT = { OK: 0, FINDINGS: 1, ERROR: 2 };

/**
 * Run a function, turning any thrown error into a uniform tool failure (exit 2).
 *
 * @param {string} tool
 * @param {unknown} error
 * @returns {never}
 */
export function fatal(tool, error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`SpecWeb ${tool}: ${message}\n`);
  process.stderr.write('The check did not run to completion (exit 2).\n');
  process.exit(EXIT.ERROR);
}

/**
 * Describe the options every tool accepts.
 *
 * @param {string} tool
 * @param {string} description
 * @param {string} contractFile
 * @returns {string}
 */
export function usageText(tool, description, contractFile) {
  return [
    `${tool} — ${description}`,
    '',
    `Reads .specweb/standards/${contractFile} and validates the repository against it.`,
    '',
    'Usage:',
    `  node .specweb/tools/${tool} [options]`,
    '',
    'Options:',
    '  --root <dir>            Repository root to validate (default: the current directory)',
    '  --standards <dir>       Directory holding the contracts (default: <root>/.specweb/standards)',
    '  --format <human|json>   Output format (default: human)',
    '  --quiet                 Print findings without the informational header',
    '  --allow-empty           Exit 0 when the repository has nothing to check',
    '  --max-warnings <n>      Fail when warnings exceed n (default: 0)',
    '  -h, --help              Show this help',
    '',
    'Exit codes: 0 ok, 1 findings at error severity, 2 tool or usage error',
    '',
  ].join('\n');
}

/**
 * Parse the uniform option set. Unknown options are usage errors, never silently ignored.
 *
 * @param {string[]} argv
 * @returns {{ options: Record<string, any>, unknown: string[] }}
 */
export function parseArgs(argv) {
  /** @type {Record<string, any>} */
  const options = {
    root: process.cwd(),
    standards: null,
    format: 'human',
    quiet: false,
    allowEmpty: false,
    maxWarnings: 0,
    help: false,
  };
  /** @type {string[]} */
  const unknown = [];
  const valueKeys = new Set(['root', 'standards', 'format', 'max-warnings']);
  const flags = new Set(['quiet', 'allow-empty', 'help']);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('-')) {
      unknown.push(token);
      continue;
    }
    const stripped = token.replace(/^--?/, '');
    const equals = stripped.indexOf('=');
    const key = equals === -1 ? stripped : stripped.slice(0, equals);
    const inline = equals === -1 ? null : stripped.slice(equals + 1);
    if (key === 'h') {
      options.help = true;
    } else if (flags.has(key) && inline === null) {
      options[key === 'allow-empty' ? 'allowEmpty' : key] = true;
    } else if (valueKeys.has(key)) {
      const value = inline ?? argv[i + 1];
      if (value === undefined || (inline === null && value.startsWith('-'))) {
        unknown.push(token);
        continue;
      }
      if (inline === null) i += 1;
      if (key === 'max-warnings') options.maxWarnings = Number.parseInt(value, 10);
      else options[key] = value;
    } else {
      unknown.push(token);
    }
  }
  if (options.format !== 'human' && options.format !== 'json') unknown.push(`--format ${options.format}`);
  if (!Number.isFinite(options.maxWarnings)) unknown.push('--max-warnings');
  return { options, unknown };
}

/**
 * Load and validate one contract from the standards directory.
 *
 * @param {{ standardsDir: string, fileName: string, kind: string }} spec
 * @returns {Promise<Record<string, unknown>>}
 * @throws {Error} when the file is missing, unreadable, or not the contract this tool expects
 */
export async function loadContract({ standardsDir, fileName, kind }) {
  const absolute = path.join(standardsDir, fileName);
  const text = await readTextIfExists(absolute);
  if (text === null) throw new Error(`contract not found: ${toPosix(absolute)}`);
  let document;
  try {
    document = parseYaml(text);
  } catch (error) {
    throw new Error(`${fileName}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const contract = asObject(document);
  if (contract.apiVersion !== API_VERSION) {
    throw new Error(`${fileName}: apiVersion must be "${API_VERSION}" but is "${String(contract.apiVersion)}"`);
  }
  if (contract.kind !== kind) {
    throw new Error(`${fileName}: kind must be "${kind}" but is "${String(contract.kind)}"`);
  }
  return contract;
}

/**
 * Build a rule resolver: the contract supplies `enabled` and `severity` per rule id, the tool
 * supplies the default severity. A rule absent from the contract keeps its default.
 *
 * @param {Record<string, unknown>} contract
 * @returns {(ruleId: string, defaultSeverity?: 'error' | 'warning') => { enabled: boolean, severity: 'error' | 'warning' }}
 */
export function makeRuleResolver(contract) {
  const rules = asObject(contract.rules);
  return (ruleId, defaultSeverity = 'error') => {
    const configured = asObject(rules[ruleId]);
    const severity = configured.severity === 'warning' || configured.severity === 'error'
      ? configured.severity
      : defaultSeverity;
    return { enabled: configured.enabled !== false, severity };
  };
}

/**
 * True when the contract declares rules and disables every one of them — the no-op contract guard
 * Article X depends on.
 *
 * @param {Record<string, unknown>} contract
 * @returns {boolean}
 */
export function allRulesDisabled(contract) {
  const entries = Object.entries(asObject(contract.rules));
  if (entries.length === 0) return true;
  return entries.every(([, value]) => asObject(value).enabled === false);
}

/**
 * Collects findings and renders them deterministically.
 */
export class Report {
  /**
   * @param {{ tool: string, contract: Record<string, unknown>, rootLabel: string, standardsLabel: string }} spec
   */
  constructor({ tool, contract, rootLabel, standardsLabel }) {
    this.tool = tool;
    this.contract = contract;
    this.rootLabel = rootLabel;
    this.standardsLabel = standardsLabel;
    this.resolve = makeRuleResolver(contract);
    /** @type {Array<{ rule: string, severity: string, file: string, line: number, message: string }>} */
    this.findings = [];
    /** @type {string[]} */
    this.notes = [];
  }

  /**
   * Record a finding, respecting the contract's enabled/severity configuration for the rule.
   *
   * @param {string} rule
   * @param {{ file?: string, line?: number, message: string }} finding
   * @param {'error' | 'warning'} [defaultSeverity]
   * @returns {void}
   */
  add(rule, finding, defaultSeverity = 'error') {
    const { enabled, severity } = this.resolve(rule, defaultSeverity);
    if (!enabled) return;
    this.findings.push({
      rule,
      severity,
      file: finding.file ?? '(repository)',
      line: finding.line ?? 0,
      message: finding.message,
    });
  }

  /**
   * @param {string} note
   * @returns {void}
   */
  note(note) {
    this.notes.push(note);
  }

  /** @returns {{ errors: number, warnings: number }} */
  counts() {
    let errors = 0;
    let warnings = 0;
    for (const finding of this.findings) {
      if (finding.severity === 'error') errors += 1;
      else warnings += 1;
    }
    return { errors, warnings };
  }

  /**
   * @param {{ maxWarnings?: number }} [options]
   * @returns {number} the process exit code
   */
  exitCode(options = {}) {
    const { errors, warnings } = this.counts();
    return errors > 0 || warnings > (options.maxWarnings ?? 0) ? EXIT.FINDINGS : EXIT.OK;
  }

  /**
   * @param {{ format?: 'human' | 'json', quiet?: boolean, maxWarnings?: number }} [options]
   * @returns {string}
   */
  render(options = {}) {
    const format = options.format ?? 'human';
    const maxWarnings = options.maxWarnings ?? 0;
    const { errors, warnings } = this.counts();
    const status = errors > 0 || warnings > maxWarnings ? 'fail' : 'pass';
    const sorted = [...this.findings].sort(compareFindings);
    if (format === 'json') {
      return `${JSON.stringify({
        tool: this.tool,
        apiVersion: API_VERSION,
        status,
        root: this.rootLabel,
        standards: this.standardsLabel,
        notes: this.notes,
        counts: { errors, warnings },
        findings: sorted,
      }, null, 2)}\n`;
    }
    /** @type {string[]} */
    const lines = [`SpecWeb ${this.tool} (${API_VERSION})`];
    if (!options.quiet) {
      lines.push(`root: ${this.rootLabel}`);
      lines.push(`standards: ${this.standardsLabel}`);
      for (const note of this.notes) lines.push(note);
    }
    for (const finding of sorted) {
      const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file;
      lines.push(`  ${finding.rule} ${finding.severity} ${location} — ${finding.message}`);
    }
    lines.push(
      `${errors} ${errors === 1 ? 'error' : 'errors'}, ${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`,
    );
    lines.push(status === 'pass' ? 'PASS' : 'FAIL');
    return `${lines.join('\n')}\n`;
  }
}

/**
 * Deterministic ordering: severity, then file, then line, then rule.
 *
 * @param {{ severity: string, file: string, line: number, rule: string }} a
 * @param {{ severity: string, file: string, line: number, rule: string }} b
 * @returns {number}
 */
export function compareFindings(a, b) {
  if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  if (a.rule !== b.rule) return a.rule < b.rule ? -1 : 1;
  return 0;
}
