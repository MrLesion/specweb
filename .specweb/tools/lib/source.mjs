/**
 * @file Source analysis for the SpecWeb validators: comment masking that preserves offsets, import
 * extraction with line numbers, layer derivation from paths, and import-specifier classification.
 *
 * Masking is deliberately careful: a `//` inside a string, a URL or a CSS-in-template-literal must
 * not be mistaken for a comment, or the validators would report imports that do not exist and miss
 * imports that do.
 *
 * @module tools/lib/source
 */

/**
 * Blank out comments while preserving every character offset (and every newline), so line numbers
 * computed on the masked text match the original file.
 *
 * @param {string} text
 * @returns {string}
 */
export function maskComments(text) {
  const chars = text.split('');
  const length = chars.length;
  let i = 0;
  /** @type {string[]} */
  const stack = ['code'];
  const blank = (index) => {
    if (chars[index] !== '\n' && chars[index] !== '\r') chars[index] = ' ';
  };
  while (i < length) {
    const mode = stack[stack.length - 1];
    const char = chars[i];
    const next = chars[i + 1];
    if (mode === 'code') {
      if (char === '/' && next === '/') {
        blank(i);
        blank(i + 1);
        i += 2;
        stack.push('line');
        continue;
      }
      if (char === '/' && next === '*') {
        blank(i);
        blank(i + 1);
        i += 2;
        stack.push('block');
        continue;
      }
      if (char === '"') {
        stack.push('double');
        i += 1;
        continue;
      }
      if (char === "'") {
        stack.push('single');
        i += 1;
        continue;
      }
      if (char === '`') {
        stack.push('template');
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (mode === 'line') {
      if (char === '\n') stack.pop();
      else blank(i);
      i += 1;
      continue;
    }
    if (mode === 'block') {
      if (char === '*' && next === '/') {
        blank(i);
        blank(i + 1);
        i += 2;
        stack.pop();
        continue;
      }
      blank(i);
      i += 1;
      continue;
    }
    if (mode === 'double' || mode === 'single') {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if ((mode === 'double' && char === '"') || (mode === 'single' && char === "'")) stack.pop();
      i += 1;
      continue;
    }
    if (mode === 'interp') {
      if (char === '}') stack.pop();
      i += 1;
      continue;
    }
    // template literal: keep the markup, and re-enter code mode inside `${ ... }`
    if (char === '\\') {
      i += 2;
      continue;
    }
    if (char === '`') {
      stack.pop();
      i += 1;
      continue;
    }
    if (char === '$' && next === '{') {
      stack.push('interp', 'code');
      i += 2;
      continue;
    }
    i += 1;
  }
  return chars.join('');
}

/**
 * @param {string} text
 * @param {number} index
 * @returns {number} the 1-based line number of a character offset
 */
export function lineAt(text, index) {
  let line = 1;
  const limit = Math.min(index, text.length);
  for (let i = 0; i < limit; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

/**
 * @typedef {object} ImportRecord
 * @property {string} specifier the raw specifier as written
 * @property {number} line 1-based line number
 * @property {boolean} dynamic true for `import(...)`
 */

/**
 * Extract every static import, side-effect import, re-export and dynamic import.
 *
 * @param {string} text raw file contents
 * @returns {ImportRecord[]} deduplicated by line and specifier, in source order
 */
export function extractImports(text) {
  const masked = maskComments(text);
  /** @type {ImportRecord[]} */
  const records = [];
  const patterns = [
    { pattern: /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g, dynamic: true, group: 2 },
    { pattern: /\bimport\s+(?!\()([^;]*?)\bfrom\s*(['"])([^'"]+)\2/g, dynamic: false, group: 3 },
    { pattern: /\bimport\s*(['"])([^'"]+)\1/g, dynamic: false, group: 2 },
    { pattern: /\bexport\s+[^;{}]*?\bfrom\s*(['"])([^'"]+)\1/g, dynamic: false, group: 3 },
  ];
  for (const { pattern, dynamic, group } of patterns) {
    pattern.lastIndex = 0;
    let match = pattern.exec(masked);
    while (match !== null) {
      const specifier = match[group];
      if (typeof specifier === 'string') {
        records.push({ specifier, line: lineAt(masked, match.index), dynamic });
      }
      match = pattern.exec(masked);
    }
  }
  const seen = new Set();
  return records
    .filter((record) => {
      const key = `${record.line}:${record.specifier}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.line - b.line || (a.specifier < b.specifier ? -1 : 1));
}

/**
 * Derive the layer for a repository-relative POSIX path, longest matching pattern first.
 *
 * @param {string} relativePath
 * @param {Array<{ name: string, patterns: string[] }>} layers
 * @returns {string | null}
 */
export function layerForPath(relativePath, layers) {
  /** @type {{ name: string, length: number } | null} */
  let best = null;
  for (const layer of layers) {
    for (const pattern of layer.patterns) {
      if (relativePath === pattern || relativePath.startsWith(`${pattern}/`)) {
        if (!best || pattern.length > best.length) best = { name: layer.name, length: pattern.length };
      }
    }
  }
  return best ? best.name : null;
}

/**
 * @param {string} relativePath
 * @returns {string | null} the feature id for paths under src/features/<id>/
 */
export function featureIdForPath(relativePath) {
  const match = /^src\/features\/([^/]+)\//.exec(relativePath);
  return match ? match[1] : null;
}

/**
 * @param {string} relativePath POSIX path
 * @returns {boolean} true when the path is a feature's public entry point
 */
export function isFeatureEntry(relativePath) {
  return /^src\/features\/[^/]+\/index\.js$/.test(relativePath);
}

/**
 * @typedef {object} SpecifierClass
 * @property {'relative' | 'root-relative' | 'protocol' | 'alias' | 'package'} kind
 * @property {string} value the package name, protocol or raw specifier
 * @property {string} [aliasTarget] resolved alias path, relative to the repository root
 */

/**
 * @param {string} specifier
 * @param {Record<string, string>} [aliases]
 * @returns {SpecifierClass}
 */
export function classifySpecifier(specifier, aliases = {}) {
  if (specifier.startsWith('.') && (specifier === '.' || specifier === '..' || specifier[1] === '/')) {
    return { kind: 'relative', value: specifier };
  }
  if (specifier.startsWith('/')) return { kind: 'root-relative', value: specifier.slice(1) };
  const aliasKey = Object.keys(aliases)
    .filter((key) => specifier === key || specifier.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (aliasKey) {
    const suffix = specifier === aliasKey ? '' : specifier.slice(aliasKey.length + 1);
    const target = aliases[aliasKey];
    return { kind: 'alias', value: specifier, aliasTarget: suffix ? `${target}/${suffix}` : target };
  }
  const protocol = /^([a-z][a-z0-9+.-]*):/i.exec(specifier);
  if (protocol) return { kind: 'protocol', value: protocol[1].toLowerCase() };
  const segments = specifier.split('/');
  const name = specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
  return { kind: 'package', value: name };
}

/**
 * Resolve a local specifier (relative or alias) to a repository-relative POSIX path.
 *
 * @param {string} fromFile repository-relative POSIX path of the importing file
 * @param {string} target repository-relative path that may still contain `.` and `..`
 * @returns {{ path: string, escaped: boolean }} `escaped` is true when the path climbs above the root
 */
export function normalisePath(fromFile, target) {
  const fromDir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/')) : '';
  const combined = `${fromDir}/${target}`;
  /** @type {string[]} */
  const stack = [];
  let escaped = false;
  for (const segment of combined.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (stack.length === 0) escaped = true;
      else stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return { path: stack.join('/'), escaped };
}
