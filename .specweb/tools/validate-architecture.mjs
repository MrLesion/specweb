#!/usr/bin/env node
/**
 * @file validate-architecture — enforces standards/dependency-policy.yaml: layer boundaries, feature
 * isolation, forbidden paths, the dependency allowlist (Article IX) and the decision-record requirement
 * (Article VIII). Rules ARCH-001…ARCH-013, defined in architecture/application.md.
 *
 * Zero dependencies: Node built-ins only (Node 18+). See .specweb/README.md for the shared CLI.
 *
 * @module tools/validate-architecture
 */

import path from 'node:path';
import { buildIndex, pathExists, readTextIfExists, toPosix, walkRoot } from './lib/files.mjs';
import { EXIT, Report, allRulesDisabled, fatal, loadContract, parseArgs, usageText } from './lib/report.mjs';
import { asArray, asBoolean, asObject, asString, asStringArray } from './lib/yaml.mjs';
import {
  classifySpecifier,
  extractImports,
  featureIdForPath,
  isFeatureEntry,
  layerForPath,
  normalisePath,
} from './lib/source.mjs';

const TOOL = 'validate-architecture';
const CONTRACT_FILE = 'dependency-policy.yaml';
const CONTRACT_KIND = 'DependencyPolicy';
const SCAN_ROOTS = ['src', 'tests'];

/** Suffix-to-location rules (architecture/application.md, conventions/file-structure.md). */
const SUFFIX_PLACEMENT = [
  {
    suffix: '.component.js',
    prefixes: ['src/components/', 'src/features/'],
    where: 'src/components/** or src/features/*/components/**',
  },
  { suffix: '.element.js', prefixes: ['src/features/'], where: 'src/features/<id>/**' },
  { suffix: '.route.js', prefixes: ['src/features/', 'src/routes/'], where: 'src/features/<id>/** or src/routes/**' },
  { suffix: '.form.js', prefixes: ['src/features/'], where: 'src/features/<id>/**' },
  {
    suffix: '.store.js',
    prefixes: ['src/state/', 'src/features/'],
    where: 'src/state/** or src/features/<id>/stores/**',
  },
  {
    suffix: '.client.js',
    prefixes: ['src/features/', 'src/services/'],
    where: 'src/features/<id>/services/** or src/services/**',
  },
];

/** Segments allowed after the first in a file name (conventions/naming.md). */
const ALLOWED_NAME_SEGMENTS = new Set([
  'js', 'mjs', 'component', 'element', 'route', 'store', 'client', 'form', 'utils', 'util',
  'test', 'spec', 'config', 'constants', 'types', 'guard', 'guards', 'router', 'registry',
]);

/**
 * Kebab-case check: every dot-separated segment is kebab-case, and every segment after the first is a
 * recognised suffix.
 *
 * @param {string} basename
 * @returns {string | null} the offending segment, or null when the name is acceptable
 */
function offendingNameSegment(basename) {
  const segments = basename.split('.');
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (i > 0 && !ALLOWED_NAME_SEGMENTS.has(segment)) return segment;
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(segment)) return segment;
  }
  return null;
}

/**
 * @param {string} relativePath
 * @param {string[]} prefixes
 * @returns {boolean}
 */
function underAny(relativePath, prefixes) {
  return prefixes.some((prefix) => relativePath.startsWith(prefix));
}

/**
 * Read every decision record as one blob, so a dependency can be grepped against the log.
 *
 * @param {string} directory absolute decisions directory
 * @returns {Promise<string>}
 */
async function readDecisionRecords(directory) {
  const files = await walkRoot(directory, '.', { ignores: [] });
  const texts = await Promise.all(
    files.filter((file) => file.endsWith('.md')).map((file) => readTextIfExists(path.join(directory, file))),
  );
  return texts.filter((text) => typeof text === 'string').join('\n');
}

async function main(argv) {
  const { options, unknown } = parseArgs(argv);
  if (options.help) {
    process.stdout.write(
      usageText(TOOL, 'Check layer boundaries, feature isolation and the dependency policy', CONTRACT_FILE),
    );
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

  const layers = asArray(contract.layers).map((entry) => {
    const record = asObject(entry);
    return {
      name: asString(record.name, '(unnamed)'),
      patterns: asStringArray(record.patterns),
    };
  });
  const layerNames = layers.map((layer) => layer.name);
  const allowedMap = asObject(contract.allowed);
  const forbiddenPaths = asStringArray(contract.forbiddenPaths);
  const aliases = asObject(contract.aliases);
  const externals = asObject(contract.externals);
  const externalAllow = asStringArray(externals.allow);
  const requireDecisionRecord = asBoolean(externals.requireDecisionRecord, false);
  const decisionDirectory = asString(externals.decisionDirectory, '.specweb/decisions');
  const sharedComponents = asObject(contract.sharedComponents);
  const sharedPatterns = asStringArray(sharedComponents.patterns);
  const sharedForbiddenLayers = asStringArray(sharedComponents.forbiddenLayers);
  const featureIsolation = asObject(contract.featureIsolation);
  const isolationEnabled = asBoolean(featureIsolation.enabled, true);

  /**
   * @param {string} layer
   * @returns {string[]} the layers this one may import (itself always included)
   */
  const allowedFor = (layer) => {
    const declared = asStringArray(allowedMap[layer]);
    return declared.includes(layer) ? declared : [...declared, layer];
  };

  // ARCH-013 — a contract that disables every rule enforces nothing (Article X).
  if (allRulesDisabled(contract)) {
    report.add('ARCH-013', {
      file: CONTRACT_FILE,
      message: 'every rule in this contract is disabled; the contract enforces nothing (Article X)',
    });
  }

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

  const index = await buildIndex(rootAbs, SCAN_ROOTS, {});
  const sourceFiles = (await walkRoot(rootAbs, 'src', {})).filter((file) => file.endsWith('.js'));
  report.note(`scanned: ${sourceFiles.length} source file(s); ${index.files.size} file(s) indexed`);

  await checkSource({
    report,
    rootAbs,
    sourceFiles,
    index,
    layers,
    layerNames,
    allowedFor,
    forbiddenPaths,
    aliases,
    externalAllow,
    sharedPatterns,
    sharedForbiddenLayers,
    isolationEnabled,
  });
  await checkAliases({ report, rootAbs, aliases });
  if (requireDecisionRecord) {
    await checkDecisionRecords({ report, rootAbs, externalAllow, decisionDirectory, sourceFiles, aliases, decisionsText: await loadDecisionsText(rootAbs, decisionDirectory) });
  }

  process.stdout.write(
    report.render({ format: options.format, quiet: options.quiet, maxWarnings: options.maxWarnings }),
  );
  return report.exitCode({ maxWarnings: options.maxWarnings });
}

/**
 * @param {string} rootAbs
 * @param {string} decisionDirectory repository-relative
 * @returns {Promise<string>}
 */
async function loadDecisionsText(rootAbs, decisionDirectory) {
  const directory = path.join(rootAbs, decisionDirectory);
  if (!(await pathExists(directory))) return '';
  return readDecisionRecords(directory);
}

/**
 * The core check: every source file's layer, name, suffix placement and imports.
 *
 * @param {{
 *   report: Report, rootAbs: string, sourceFiles: string[], index: { files: Set<string>, dirs: Set<string> },
 *   layers: Array<{ name: string, patterns: string[] }>, layerNames: string[],
 *   allowedFor: (layer: string) => string[], forbiddenPaths: string[],
 *   aliases: Record<string, unknown>, externalAllow: string[],
 *   sharedPatterns: string[], sharedForbiddenLayers: string[], isolationEnabled: boolean,
 * }} context
 * @returns {Promise<void>}
 */
async function checkSource(context) {
  const {
    report, rootAbs, sourceFiles, index, layers, layerNames, allowedFor, forbiddenPaths,
    aliases, externalAllow, sharedPatterns, sharedForbiddenLayers, isolationEnabled,
  } = context;

  for (const file of sourceFiles) {
    const basename = file.slice(file.lastIndexOf('/') + 1);
    const layer = layerForPath(file, layers);
    if (!layer) {
      report.add('ARCH-001', {
        file,
        message: 'file is not inside a known layer directory; add it to `layers` in standards/dependency-policy.yaml or move the file',
      });
    }
    const badSegment = offendingNameSegment(basename);
    if (badSegment) {
      report.add('ARCH-010', {
        file,
        message: `file name segment "${badSegment}" is not kebab-case (conventions/naming.md, N2)`,
      }, 'warning');
    }
    for (const placement of SUFFIX_PLACEMENT) {
      if (!basename.endsWith(placement.suffix)) continue;
      if (!underAny(file, placement.prefixes)) {
        report.add('ARCH-007', {
          file,
          message: `"${placement.suffix}" files belong in ${placement.where} (conventions/file-structure.md, FS1)`,
        }, 'warning');
      }
    }

    const text = await readTextIfExists(path.join(rootAbs, file));
    if (text === null) continue;
    for (const record of extractImports(text)) {
      const specifier = classifySpecifier(record.specifier, aliases);
      if (specifier.kind === 'package') {
        if (!externalAllow.includes(specifier.value)) {
          report.add('ARCH-005', {
            file,
            line: record.line,
            message: `external dependency "${specifier.value}" is not in standards/dependency-policy.yaml (externals.allow) — Article IX: no runtime dependency without an ADR`,
          });
        }
        continue;
      }
      if (specifier.kind === 'protocol') {
        report.add('ARCH-005', {
          file,
          line: record.line,
          message: `import of "${record.specifier}" is not resolvable in the browser (${specifier.value} URL)`,
        });
        continue;
      }

      let target = specifier.value;
      if (specifier.kind === 'relative') {
        const resolved = normalisePath(file, record.specifier);
        if (resolved.escaped) {
          report.add('ARCH-009', {
            file,
            line: record.line,
            message: `import "${record.specifier}" resolves outside the repository root (conventions/imports.md, I3)`,
          });
          continue;
        }
        target = resolved.path;
      } else if (specifier.kind === 'alias') {
        target = specifier.aliasTarget ?? specifier.value;
      }

      const missingExtension = specifier.kind !== 'alias' && !record.specifier.endsWith('.js');

      let resolvedTarget = target;
      if (!index.files.has(resolvedTarget) && index.files.has(`${resolvedTarget}/index.js`)) {
        resolvedTarget = `${resolvedTarget}/index.js`;
      }
      const forbidden = forbiddenPaths.find(
        (entry) => resolvedTarget === entry || resolvedTarget.startsWith(`${entry}/`),
      );
      if (forbidden) {
        report.add('ARCH-006', {
          file,
          line: record.line,
          message: `import of "${record.specifier}" reaches into "${forbidden}", which the application may not depend on (Article X)`,
        });
        continue;
      }
      if (!index.files.has(resolvedTarget)) {
        const hint = missingExtension ? '; relative imports must include the .js extension' : '';
        report.add('ARCH-008', {
          file,
          line: record.line,
          message: `cannot resolve "${record.specifier}" (looked for ${resolvedTarget})${hint}`,
        });
        continue;
      }
      if (missingExtension) {
        report.add('ARCH-008', {
          file,
          line: record.line,
          message: `import "${record.specifier}" must include the .js extension (conventions/imports.md, I1)`,
        });
      }

      const targetLayer = layerForPath(resolvedTarget, layers);
      if (!targetLayer || !layerNames.includes(targetLayer)) {
        report.add('ARCH-001', {
          file,
          line: record.line,
          message: `import target ${resolvedTarget} is outside the known layers (standards/dependency-policy.yaml, \`layers\`)`,
        });
        continue;
      }
      if (layer && targetLayer !== layer && !allowedFor(layer).includes(targetLayer)) {
        report.add('ARCH-002', {
          file,
          line: record.line,
          message: `the ${layer} layer may not import the ${targetLayer} layer (${resolvedTarget}) — dependencies flow downward only (Article III)`,
        });
      }
      if (isolationEnabled) {
        const fromFeature = featureIdForPath(file);
        const toFeature = featureIdForPath(resolvedTarget);
        if (fromFeature && toFeature && fromFeature !== toFeature && !isFeatureEntry(resolvedTarget)) {
          report.add('ARCH-003', {
            file,
            line: record.line,
            message: `cross-feature import of ${resolvedTarget} must go through src/features/${toFeature}/index.js (Article III)`,
          });
        }
      }
      if (underAny(file, sharedPatterns) && sharedForbiddenLayers.includes(targetLayer)) {
        report.add('ARCH-004', {
          file,
          line: record.line,
          message: `a shared component may not import the ${targetLayer} layer (${resolvedTarget}) — shared components stay presentational (architecture/components.md)`,
        });
      }
    }
  }
}

/**
 * ARCH-011 — an alias whose target directory does not exist resolves to nothing at runtime.
 *
 * @param {{ report: Report, rootAbs: string, aliases: Record<string, unknown> }} context
 * @returns {Promise<void>}
 */
async function checkAliases({ report, rootAbs, aliases }) {
  for (const [alias, target] of Object.entries(aliases)) {
    if (typeof target !== 'string') continue;
    if (!(await pathExists(path.join(rootAbs, target)))) {
      report.add('ARCH-011', {
        file: CONTRACT_FILE,
        message: `alias "${alias}" points at "${target}", which does not exist`,
      });
    }
  }
}

/**
 * ARCH-012 — an allowlisted dependency must be justified by a decision record (Article VIII).
 *
 * @param {{
 *   report: Report, rootAbs: string, externalAllow: string[], decisionDirectory: string,
 *   sourceFiles: string[], aliases: Record<string, unknown>, decisionsText: string,
 * }} context
 * @returns {Promise<void>}
 */
async function checkDecisionRecords(context) {
  const { report, rootAbs, externalAllow, decisionDirectory, sourceFiles, aliases, decisionsText } = context;
  if (externalAllow.length === 0) return;
  for (const file of sourceFiles) {
    const text = await readTextIfExists(path.join(rootAbs, file));
    if (text === null) continue;
    for (const record of extractImports(text)) {
      const specifier = classifySpecifier(record.specifier, aliases);
      if (specifier.kind !== 'package') continue;
      if (!externalAllow.includes(specifier.value)) continue;
      if (decisionsText.includes(specifier.value)) continue;
      report.add('ARCH-012', {
        file,
        line: record.line,
        message: `"${specifier.value}" is allowlisted but no decision record in ${decisionDirectory} mentions it (Article VIII)`,
      });
    }
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => fatal(TOOL, error));
