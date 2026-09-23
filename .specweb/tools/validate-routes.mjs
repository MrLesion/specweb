#!/usr/bin/env node
/**
 * @file validate-routes — enforces standards/route-contract.yaml: every declared route exists and
 * agrees with its module (id, path, title, element, guard, spec), every route module is declared, lazy
 * routes really are lazy, and a not-found route exists. Rules RTE-001…RTE-011, defined in
 * architecture/routing.md.
 *
 * Zero dependencies: Node built-ins only (Node 18+). See .specweb/README.md for the shared CLI.
 *
 * @module tools/validate-routes
 */

import path from 'node:path';
import { pathExists, readTextIfExists, toPosix, walkRoot } from './lib/files.mjs';
import { EXIT, Report, fatal, loadContract, parseArgs, usageText } from './lib/report.mjs';
import { asArray, asBoolean, asObject, asString, asStringArray } from './lib/yaml.mjs';
import { maskComments } from './lib/source.mjs';

const TOOL = 'validate-routes';
const CONTRACT_FILE = 'route-contract.yaml';
const CONTRACT_KIND = 'RouteContract';
const SCAN_ROOT = 'src';

/**
 * Find the object literal that follows `export const route =` and return its balanced-brace body.
 *
 * @param {string} text raw module contents
 * @returns {{ body: string, index: number } | null}
 */
function readRouteLiteral(text) {
  const masked = maskComments(text);
  const declaration = /export\s+const\s+route\s*(?::[^=]+)?=\s*\{/.exec(masked);
  if (!declaration) return null;
  const start = masked.indexOf('{', declaration.index);
  let depth = 0;
  for (let i = start; i < masked.length; i += 1) {
    const char = masked[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { body: masked.slice(start + 1, i), index: declaration.index };
    }
  }
  return null;
}

/**
 * @param {string} body route object literal body
 * @param {string} key
 * @returns {string | null} the string value of a `key: 'value'` field
 */
function stringField(body, key) {
  const match = new RegExp(`\\b${key}\\s*:\\s*(['"])([^'"]*)\\1`).exec(body);
  return match ? match[2] : null;
}

/**
 * @param {string} body route object literal body
 * @param {string} key
 * @returns {boolean} true when the field is present as `key: null`
 */
function nullField(body, key) {
  return new RegExp(`\\b${key}\\s*:\\s*null\\b`).test(body);
}

/**
 * Exported names from a module: `export function x`, `export const x`, `export async function x`.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
function exportedNames(text) {
  const masked = maskComments(text);
  const names = new Set();
  for (const match of masked.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(match[1]);
  }
  for (const match of masked.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name.trim());
    }
  }
  return names;
}

async function main(argv) {
  const { options, unknown } = parseArgs(argv);
  if (options.help) {
    process.stdout.write(usageText(TOOL, 'Check the route table against the route modules', CONTRACT_FILE));
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
    routeFileSuffix: asString(contract.routeFileSuffix, '.route.js'),
    guardsModule: asString(contract.guardsModule, 'src/routes/guards.js'),
    routerModule: asString(contract.routerModule, 'src/routes/router.js'),
    registryModule: asString(contract.registryModule, 'src/routes/registry.js'),
    requiredRouteIds: asStringArray(contract.requiredRouteIds, ['not-found']),
    requireLazy: asBoolean(contract.requireLazy, true),
    requireSpecReference: asBoolean(contract.requireSpecReference, true),
    titleRequired: asBoolean(contract.titleRequired, true),
    specsDirectory: asString(contract.specsDirectory, 'specs'),
  };

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

  const declared = asArray(contract.routes)
    .map((entry) => {
      const record = asObject(entry);
      return {
        id: asString(record.id, ''),
        path: asString(record.path, ''),
        module: asString(record.module, ''),
        element: asString(record.element, ''),
        title: asString(record.title, ''),
        guard: typeof record.guard === 'string' ? record.guard : null,
        lazy: asBoolean(record.lazy, true),
        spec: asString(record.spec, ''),
      };
    })
    .filter((route) => route.module !== '');

  const sourceFiles = (await walkRoot(rootAbs, SCAN_ROOT, {})).filter((file) => file.endsWith('.js'));
  const routeFiles = sourceFiles.filter((file) => file.endsWith(config.routeFileSuffix));
  report.note(
    `scanned: ${sourceFiles.length} source file(s); ${routeFiles.length} route module(s); ${declared.length} declared route(s)`,
  );

  for (const [label, moduleFile] of [
    ['router', config.routerModule],
    ['registry', config.registryModule],
    ['guards', config.guardsModule],
  ]) {
    if (!(await pathExists(path.join(rootAbs, moduleFile)))) {
      report.note(`note: ${label} module ${moduleFile} not found (architecture/routing.md expects it)`);
    }
  }

  // RTE-002 — a route module that exists must be declared, or the reviewable table is already stale.
  const declaredModules = new Set(declared.map((route) => route.module));
  for (const file of routeFiles) {
    if (!declaredModules.has(file)) {
      report.add('RTE-002', {
        file,
        message: 'route module is not declared in standards/route-contract.yaml; add it to `routes:` so review sees it',
      });
    }
  }

  // Guards that exist, and element tags defined anywhere in the application.
  const guardsText = (await readTextIfExists(path.join(rootAbs, config.guardsModule))) ?? '';
  const guardNames = exportedNames(guardsText);
  const definedTags = new Set();
  for (const file of sourceFiles) {
    const text = await readTextIfExists(path.join(rootAbs, file));
    if (text === null) continue;
    for (const match of maskComments(text).matchAll(/customElements\.define\(\s*(['"])([^'"]+)\1/g)) {
      definedTags.add(match[2]);
    }
  }

  const seenPaths = new Map();
  const ids = new Set();

  for (const route of declared) {
    ids.add(route.id);
    if (route.path !== '') {
      if (seenPaths.has(route.path)) {
        report.add('RTE-007', {
          file: CONTRACT_FILE,
          message: `path "${route.path}" is declared more than once ("${seenPaths.get(route.path)}" and "${route.id}")`,
        });
      } else {
        seenPaths.set(route.path, route.id);
      }
    }
    if (!(await pathExists(path.join(rootAbs, route.module)))) {
      report.add('RTE-001', {
        file: CONTRACT_FILE,
        message: `declared route "${route.id}" points at ${route.module}, which does not exist`,
      });
      continue;
    }

    const text = await readTextIfExists(path.join(rootAbs, route.module));
    if (text === null) continue;
    const literal = readRouteLiteral(text);
    if (literal === null || !/export\s+const\s+route\s*[:=]/.test(text)) {
      report.add('RTE-009', {
        file: route.module,
        message: 'module must export a named `route` object (architecture/routing.md)',
      });
      continue;
    }
    const body = literal.body;

    const modulePath = stringField(body, 'path');
    if (modulePath !== null && modulePath !== route.path) {
      report.add('RTE-003', {
        file: route.module,
        message: `module path "${modulePath}" does not match the contract path "${route.path}"`,
      });
    }

    const moduleTitle = stringField(body, 'title');
    if (config.titleRequired && (moduleTitle === null || moduleTitle === '')) {
      report.add('RTE-004', {
        file: route.module,
        message: 'route object has no `title`; the router sets document.title from it (architecture/routing.md)',
      });
    } else if (moduleTitle !== null && route.title !== '' && moduleTitle !== route.title) {
      report.add('RTE-004', {
        file: route.module,
        message: `module title "${moduleTitle}" does not match the contract title "${route.title}"`,
      }, 'warning');
    }

    if (route.lazy && config.requireLazy && !/import\s*\(/.test(body)) {
      report.add('RTE-005', {
        file: route.module,
        message: 'route is marked lazy but `load` does not use a dynamic import(); code splitting is lost (architecture/routing.md)',
      });
    }

    const guardName = stringField(body, 'guard');
    if (guardName !== null) {
      if (!guardNames.has(guardName)) {
        report.add('RTE-006', {
          file: route.module,
          message: `guard "${guardName}" is not exported by ${config.guardsModule} (architecture/routing.md)`,
        });
      }
    } else if (!nullField(body, 'guard') && route.guard !== null) {
      report.add('RTE-006', {
        file: route.module,
        message: `route declares no \`guard\`; use \`guard: '${route.guard}'\` to match the contract, or \`guard: null\` to say "none" deliberately`,
      }, 'warning');
    }

    const specId = stringField(body, 'spec') ?? route.spec;
    if (config.requireSpecReference) {
      if (specId === '') {
        report.add('RTE-008', {
          file: route.module,
          message: 'route does not name the `spec` it implements (architecture/routing.md)',
        });
      } else if (!(await pathExists(path.join(rootAbs, config.specsDirectory, specId, 'spec.md')))) {
        report.add('RTE-008', {
          file: route.module,
          message: `route names spec "${specId}" but ${config.specsDirectory}/${specId}/spec.md does not exist`,
        });
      }
    }

    const elementTag = stringField(body, 'element');
    if (elementTag !== null && !definedTags.has(elementTag)) {
      report.add('RTE-011', {
        file: route.module,
        message: `route renders <${elementTag}> but no module calls customElements.define('${elementTag}')`,
      });
    }
  }

  // RTE-010 — an application with routes must declare its terminal routes.
  if (declared.length > 0 || routeFiles.length > 0) {
    for (const requiredId of config.requiredRouteIds) {
      const asModuleFile = routeFiles.some((file) => file.endsWith(`/${requiredId}${config.routeFileSuffix}`));
      if (!ids.has(requiredId) && !asModuleFile) {
        report.add('RTE-010', {
          file: CONTRACT_FILE,
          message: `required route "${requiredId}" is not declared; every application with routes needs it (architecture/routing.md)`,
        });
      }
    }
  } else {
    report.note('no routes declared and no route modules found — nothing to check');
  }

  process.stdout.write(
    report.render({ format: options.format, quiet: options.quiet, maxWarnings: options.maxWarnings }),
  );
  return report.exitCode({ maxWarnings: options.maxWarnings });
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => fatal(TOOL, error));
