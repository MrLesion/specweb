#!/usr/bin/env node
/**
 * @file validate-spec-coverage — enforces standards/feature-contract.yaml: every feature has its
 * four gate artifacts (SPC-001…SPC-004), every spec and plan has its required sections (SPC-005),
 * every requirement has acceptance criteria (SPC-006), every feature folder pairs with a spec and
 * vice versa (SPC-007), verification carries a verdict plus command evidence (SPC-008), tasks are
 * complete when the spec claims to be implemented (SPC-009), the spec Status is valid and
 * consistent with its artifacts (SPC-010), and no template placeholders survive (SPC-011).
 *
 * Zero dependencies: Node built-ins only (Node 18+). See .specweb/README.md for the shared CLI.
 *
 * @module tools/validate-spec-coverage
 */

import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { isDirectory, pathExists, readTextIfExists, toPosix } from './lib/files.mjs';
import { EXIT, Report, fatal, loadContract, parseArgs, usageText } from './lib/report.mjs';
import { asArray, asBoolean, asObject, asString, asStringArray } from './lib/yaml.mjs';

const TOOL = 'validate-spec-coverage';
const CONTRACT_FILE = 'feature-contract.yaml';
const CONTRACT_KIND = 'FeatureContract';

const VALID_STATUSES = ['draft', 'approved', 'in-progress', 'implemented', 'verified', 'superseded'];
const VALID_VERDICTS = ['PASS', 'PASS WITH ISSUES', 'FAIL'];
const IMPLEMENTED_STATUSES = new Set(['implemented', 'verified']);

/**
 * Case-insensitive markdown heading lookup. Returns the body under the heading.
 *
 * @param {string} text
 * @param {string} name
 * @returns {string | null} null when the heading is absent
 */
function sectionBody(text, name) {
  const lines = text.split(/\r?\n/);
  const wanted = name.trim().toLowerCase();
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[i]);
    if (!match) continue;
    if (start === -1 && match[2].trim().toLowerCase() === wanted) {
      start = i;
      continue;
    }
    if (start !== -1) {
      end = i;
      break;
    }
  }
  if (start === -1) return null;
  return lines.slice(start + 1, end).join('\n');
}

/**
 * @param {string} patternSource
 * @param {string} flags
 * @returns {RegExp | null}
 */
function safeRegExp(patternSource, flags) {
  try {
    return new RegExp(patternSource, flags);
  } catch {
    return null;
  }
}

/**
 * @param {string} text
 * @returns {string | null} the Status value, or null when no Status line exists
 */
function readSpecStatus(text) {
  const match = /^[ \t]*>[^\n]*Status\s*:\s*([A-Za-z][A-Za-z -]*)/mi.exec(text);
  return match ? match[1].trim().toLowerCase() : null;
}

/**
 * @param {string} text
 * @returns {string | null} the verification verdict, or null when absent
 */
function readVerdict(text) {
  const quoted = /^[ \t]*>[^\n]*Status\s*:\s*(`?)(PASS WITH ISSUES|PASS|FAIL)\1/mi.exec(text);
  if (quoted) return quoted[2];
  const bare = /^\s*`?(PASS WITH ISSUES|PASS|FAIL)`?\s*—/m.exec(text);
  return bare ? bare[1] : null;
}

/**
 * @param {string} text
 * @returns {boolean} true when template placeholder text remains
 */
function hasPlaceholder(text) {
  const angleTokens = /<(Feature name|feature-id|YYYY-MM-DD|link or none|command|path|output|revision|name|n)>/;
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const stripped = line.trim();
    if (/^#\s+<[^<>\n]+>/.test(stripped)) return true;
    if (/^>\s*(Owner|Architect|Verifier):\s*<name>/.test(stripped)) return true;
    if (angleTokens.test(stripped)) return true;
  }
  return false;
}
async function listSubdirs(parentAbs) {
  try {
    const entries = await readdir(parentAbs, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

async function main(argv) {
  const { options, unknown } = parseArgs(argv);
  if (options.help) {
    process.stdout.write(usageText(TOOL, 'Check feature specs against the feature contract', CONTRACT_FILE));
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

  const specsDirectory = asString(contract.specsDirectory, 'specs');
  const sourceDirectory = asString(contract.sourceDirectory, 'src/features');
  const featureIdPattern = safeRegExp(asString(contract.featureIdPattern, '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'), '');
  const requiredArtifacts = asStringArray(contract.requiredArtifacts, ['spec.md', 'plan.md', 'tasks.md', 'verification.md']);
  const specSections = asStringArray(contract.specSections, []);
  const planSections = asStringArray(contract.planSections, []);
  const reqCfg = asObject(contract.requirements);
  const reqPatternSrc = asString(reqCfg.pattern, 'R-(\\d+)');
  const critPatternSrc = asString(reqCfg.criteriaPattern, 'AC-(\\d+)\\.(\\d+)');
  const requireAcceptanceCriteria = asBoolean(reqCfg.requireAcceptanceCriteria, true);
  const minimumCoverage = Number(reqCfg.minimumCriteriaCoverage ?? 1.0);
  const tasksCfg = asObject(contract.tasks);
  const requireWhenImplemented = asBoolean(tasksCfg.requireWhenImplemented, true);
  const uncheckedSrc = asString(tasksCfg.uncheckedPattern, String.raw`^\s*-\s\[ \]`);
  const checkedSrc = asString(tasksCfg.checkedPattern, String.raw`^\s*-\s*\[x\]`);
  const verCfg = asObject(contract.verification);
  const evidenceSrc = asString(verCfg.evidencePattern, '^(node|npx|npm|pnpm|yarn|deno)\\s');
  const minimumEvidence = Number(verCfg.minimumEvidenceCommands ?? 1);
  const requireEvidence = asBoolean(verCfg.requireCommandEvidence, true);
  const covCfg = asObject(contract.coverage);
  const requireSpecForSource = asBoolean(covCfg.requireSpecForSource, true);
  const requireSourceForSpec = asBoolean(covCfg.requireSourceForSpec, true);
  const ignoreDirs = new Set(asArray(covCfg.ignoreSourceDirectories).filter((e) => typeof e === 'string'));

  const reqRe = safeRegExp(reqPatternSrc, 'm');
  const critRe = safeRegExp(critPatternSrc, 'g');
  const uncheckedRe = safeRegExp(uncheckedSrc, 'm');
  const checkedRe = safeRegExp(checkedSrc, 'mi');
  const evidenceRe = safeRegExp(evidenceSrc, 'm');
  if (!featureIdPattern || !reqRe || !critRe || !uncheckedRe || !checkedRe || !evidenceRe) {
    fatal(TOOL, `${CONTRACT_FILE}: an invalid regex pattern makes the contract unenforceable`);
  }
  const specsExist = await isDirectory(path.join(rootAbs, specsDirectory));
  const sourceExist = await isDirectory(path.join(rootAbs, sourceDirectory));
  const allSpecIds = specsExist ? await listSubdirs(path.join(rootAbs, specsDirectory)) : [];
  const allSourceIds = sourceExist
    ? (await listSubdirs(path.join(rootAbs, sourceDirectory))).filter((n) => !ignoreDirs.has(n))
    : [];
  if (allSpecIds.length === 0 && allSourceIds.length === 0) {
    report.note('no specs and no feature sources found — nothing to check');
    process.stdout.write(report.render({ format: options.format, quiet: options.quiet, maxWarnings: options.maxWarnings }));
    return report.exitCode({ maxWarnings: options.maxWarnings });
  }
  const artifactRule = { 'spec.md': 'SPC-001', 'plan.md': 'SPC-002', 'tasks.md': 'SPC-003', 'verification.md': 'SPC-004' };
  for (const id of allSpecIds) {
    const prefix = toPosix(path.join(specsDirectory, id));
    if (featureIdPattern.test(id) === false) {
      report.add('SPC-007', { file: prefix, message: 'feature id does not match featureIdPattern (file-structure.md)' });
    }
    for (const artifact of requiredArtifacts) {
      const rule = artifactRule[artifact] ?? 'SPC-001';
      if (!(await pathExists(path.join(rootAbs, specsDirectory, id, artifact)))) {
        report.add(rule, { file: `${prefix}/${artifact}`, message: `required artifact "${artifact}" is missing (workflow.md gates)` });
      }
    }
    const specText = await readTextIfExists(path.join(rootAbs, specsDirectory, id, 'spec.md'));
    const planText = await readTextIfExists(path.join(rootAbs, specsDirectory, id, 'plan.md'));
    const tasksText = await readTextIfExists(path.join(rootAbs, specsDirectory, id, 'tasks.md'));
    const verText = await readTextIfExists(path.join(rootAbs, specsDirectory, id, 'verification.md'));
    if (specText !== null) {
      for (const section of specSections) {
        const body = sectionBody(specText, section);
        if (body === null || body.trim() === '') {
          report.add('SPC-005', { file: `${prefix}/spec.md`, message: `required section "## ${section}" is missing or empty` });
        }
      }
    }
    if (planText !== null) {
      for (const section of planSections) {
        const body = sectionBody(planText, section);
        if (body === null || body.trim() === '') {
          report.add('SPC-005', { file: `${prefix}/plan.md`, message: `required section "## ${section}" is missing or empty` });
        }
      }
    }
    /** @type {Set<string>} */
    const reqs = new Set();
    if (specText !== null) {
      const re = new RegExp(reqRe.source, '');
      for (const line of specText.split(/\r?\n/)) {
        const m = re.exec(line);
        if (m) reqs.add(m[1]);
      }
      if (reqs.size === 0) {
        report.add('SPC-006', { file: `${prefix}/spec.md`, message: 'no numbered requirements (R-n) found (Article I)' });
      } else if (requireAcceptanceCriteria) {
        /** @type {Map<string, number>} */
        const per = new Map();
        const cre = new RegExp(critRe.source, 'g');
        for (const m of specText.matchAll(cre)) per.set(m[1], (per.get(m[1]) ?? 0) + 1);
        const covered = [...reqs].filter((n) => (per.get(n) ?? 0) > 0).length;
        if (covered / reqs.size < minimumCoverage) {
          const missing = [...reqs].filter((n) => !(per.get(n) ?? 0)).sort((a, b) => Number(a) - Number(b));
          report.add('SPC-006', { file: `${prefix}/spec.md`, message: `criteria coverage ${covered}/${reqs.size}; R-${missing.join(', R-')} lack AC-n.m` });
        }
      }
    }
    if (requireSourceForSpec && sourceExist && !allSourceIds.includes(id)) {
      report.add('SPC-007', { file: prefix, message: `spec "${id}" has no ${sourceDirectory}/${id}/ folder (FS2)` });
    }
    if (verText !== null) {
      const verdict = readVerdict(verText);
      if (verdict === null || !VALID_VERDICTS.includes(verdict)) {
        report.add('SPC-008', { file: `${prefix}/verification.md`, message: 'no verdict (PASS, PASS WITH ISSUES, FAIL) recorded' });
      }
      if (requireEvidence) {
        const evRe = new RegExp(evidenceRe.source, '');
        let count = 0;
        let inFence = false;
        let blockCommands = 0;
        let blockOther = 0;
        let evidencedBlocks = 0;
        for (const line of verText.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (trimmed.startsWith('```')) {
            if (inFence && blockCommands > 0 && blockOther > 0) evidencedBlocks += 1;
            inFence = !inFence;
            blockCommands = 0;
            blockOther = 0;
            continue;
          }
          const stripped = line.replace(/^\s*[`$>\s]+/, '');
          if (/<(command|output|revision|name)>/.test(stripped)) continue;
          if (evRe.test(stripped)) {
            count += 1;
            if (inFence) blockCommands += 1;
          } else if (inFence && trimmed !== '') {
            blockOther += 1;
          }
        }
        if (inFence && blockCommands > 0 && blockOther > 0) evidencedBlocks += 1;
        const fenced = evidencedBlocks >= 1;
        if (count < minimumEvidence || !fenced) {
          report.add('SPC-008', { file: `${prefix}/verification.md`, message: 'no command + verbatim-output evidence (Article VII)' });
        }
      }
    }
    const status = specText === null ? null : readSpecStatus(specText);
    if (tasksText !== null && status !== null && IMPLEMENTED_STATUSES.has(status) && requireWhenImplemented) {
      if (new RegExp(uncheckedRe.source, 'm').test(tasksText)) {
        report.add('SPC-009', { file: `${prefix}/tasks.md`, message: `Status is "${status}" but tasks.md has unchecked tasks` });
      }
    }
    if (specText !== null && (status === null || !VALID_STATUSES.includes(status))) {
      report.add('SPC-010', { file: `${prefix}/spec.md`, message: 'no valid Status line (draft, approved, in-progress, implemented, verified, superseded)' });
    }
    if (status === 'verified' && verText !== null && readVerdict(verText) === 'FAIL') {
      report.add('SPC-010', { file: `${prefix}/spec.md`, message: 'Status is "verified" but verification.md records FAIL' });
    }
    for (const [artifact, text] of [['spec.md', specText], ['plan.md', planText], ['tasks.md', tasksText], ['verification.md', verText]]) {
      if (text !== null && hasPlaceholder(text)) {
        report.add('SPC-011', { file: `${prefix}/${artifact}`, message: 'template placeholder text remains' }, 'warning');
      }
    }
  }
  if (requireSpecForSource) {
    for (const id of allSourceIds) {
      if (!allSpecIds.includes(id)) {
        report.add('SPC-007', { file: toPosix(path.join(sourceDirectory, id)), message: `source folder "${id}" has no ${specsDirectory}/${id}/spec.md (Article I)` });
      }
    }
  }
  process.stdout.write(report.render({ format: options.format, quiet: options.quiet, maxWarnings: options.maxWarnings }));
  return report.exitCode({ maxWarnings: options.maxWarnings });
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => fatal(TOOL, error));



