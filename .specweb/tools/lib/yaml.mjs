/**
 * @file Minimal YAML reader for the SpecWeb standards contracts. Supports the documented subset:
 * block mappings, block sequences, `- key: value` sequence items with continuation lines, flow
 * sequences (`[a, b]`), empty flow collections (`[]`, `{}`), quoted and bare scalars, booleans,
 * numbers, null, and `#` comments (including inline comments outside quotes).
 *
 * Deliberately unsupported — and rejected with a line number rather than mis-parsed: block scalars
 * (`|`, `>`), anchors and aliases, tags, multi-document streams, complex keys, inline mappings and
 * multi-line flow collections. The contracts in standards/ stay inside the subset, so hitting an
 * unsupported construct means someone hand-edited a contract into something the tools cannot read.
 *
 * @module tools/lib/yaml
 */

/**
 * Split a line into its content and line number, stripping comments outside quotes.
 *
 * @param {string} raw
 * @param {number} lineNo
 * @returns {{ indent: number, content: string, lineNo: number } | null} null for blank lines
 */
function readLine(raw, lineNo) {
  const withoutComment = stripComment(raw, lineNo);
  if (withoutComment.trim() === '') return null;
  if (/^\t/.test(withoutComment)) throw new Error(`tabs are not allowed for indentation (line ${lineNo})`);
  const match = /^( *)/.exec(withoutComment);
  const indent = match ? match[1].length : 0;
  return { indent, content: withoutComment.slice(indent).trimEnd(), lineNo };
}

/**
 * Remove a trailing comment, respecting single and double quotes.
 *
 * @param {string} text
 * @param {number} lineNo
 * @returns {string}
 */
function stripComment(text, lineNo) {
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === '\\' && quote === '"') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '#' && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i);
  }
  if (quote) throw new Error(`unterminated string (line ${lineNo})`);
  return text;
}

/**
 * Split `key: value` on the first mapping separator: a colon at end of line, or one followed by a
 * space. A colon inside a value (a URL, a path parameter, a time) is therefore not a separator.
 *
 * @param {string} content
 * @param {number} lineNo
 * @returns {{ key: string, rest: string }}
 */
function splitKey(content, lineNo) {
  let quote = null;
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (quote) {
      if (char === '\\' && quote === '"') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === ':' && (i === content.length - 1 || content[i + 1] === ' ')) {
      return { key: parseKey(content.slice(0, i).trim(), lineNo), rest: content.slice(i + 1).trim() };
    }
  }
  throw new Error(`expected "key: value" but found "${content}" (line ${lineNo})`);
}

/**
 * @param {string} key
 * @param {number} lineNo
 * @returns {string}
 */
function parseKey(key, lineNo) {
  if (key === '') throw new Error(`empty key (line ${lineNo})`);
  const quoted = /^(['"])([\s\S]*)\1$/.exec(key);
  return quoted ? quoted[2] : key;
}

/**
 * @param {string} text
 * @param {number} lineNo
 * @returns {unknown}
 */
function parseScalar(text, lineNo) {
  const value = text.trim();
  if (value === '') return null;
  if (value === '[]') return [];
  if (value === '{}') return {};
  if (value.startsWith('[')) return parseFlowSequence(value, lineNo);
  if (value.startsWith('{')) {
    throw new Error(`inline mappings are not supported (line ${lineNo}); use block style`);
  }
  if (value.startsWith('|') || value.startsWith('>')) {
    throw new Error(`block scalars are not supported (line ${lineNo}); use a single-line string`);
  }
  if (value.startsWith('&') || value.startsWith('*') || value.startsWith('!')) {
    throw new Error(`anchors, aliases and tags are not supported (line ${lineNo})`);
  }
  const quoted = /^(['"])([\s\S]*)\1$/.exec(value);
  if (quoted) return unescapeQuoted(quoted[2], quoted[1]);
  if (value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

/**
 * @param {string} body
 * @param {string} quote
 * @returns {string}
 */
function unescapeQuoted(body, quote) {
  const decoded = quote === '"'
    ? body.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    : body.replace(/''/g, "'");
  return decoded;
}

/**
 * @param {string} text
 * @param {number} lineNo
 * @returns {unknown[]}
 */
function parseFlowSequence(text, lineNo) {
  if (!text.endsWith(']')) {
    throw new Error(`flow sequence must close on the same line (line ${lineNo})`);
  }
  const inner = text.slice(1, -1).trim();
  if (inner === '') return [];
  /** @type {string[]} */
  const parts = [];
  let current = '';
  let quote = null;
  for (const char of inner) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ',') {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => parseScalar(part, lineNo));
}

/**
 * Parse a block (mapping or sequence) starting at `start` whose lines share `indent`.
 *
 * @param {Array<{ indent: number, content: string, lineNo: number }>} lines
 * @param {number} start
 * @param {number} indent
 * @returns {{ value: unknown, next: number }}
 */
function parseBlock(lines, start, indent) {
  const first = lines[start];
  if (!first) throw new Error('unexpected end of document');
  return first.content.startsWith('- ') || first.content === '-'
    ? parseSequence(lines, start, indent)
    : parseMapping(lines, start, indent);
}

/**
 * @param {Array<{ indent: number, content: string, lineNo: number }>} lines
 * @param {number} start
 * @param {number} indent
 * @returns {{ value: Record<string, unknown>, next: number }}
 */
function parseMapping(lines, start, indent) {
  /** @type {Record<string, unknown>} */
  const result = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new Error(`unexpected indentation (line ${line.lineNo})`);
    if (line.content.startsWith('- ') || line.content === '-') break;
    const { key, rest } = splitKey(line.content, line.lineNo);
    if (rest === '') {
      const next = lines[i + 1];
      if (next && next.indent > indent) {
        const child = parseBlock(lines, i + 1, next.indent);
        result[key] = child.value;
        i = child.next;
      } else {
        result[key] = null;
        i += 1;
      }
      continue;
    }
    result[key] = parseScalar(rest, line.lineNo);
    i += 1;
  }
  return { value: result, next: i };
}

/**
 * @param {Array<{ indent: number, content: string, lineNo: number }>} lines
 * @param {number} start
 * @param {number} indent
 * @returns {{ value: unknown[], next: number }}
 */
function parseSequence(lines, start, indent) {
  /** @type {unknown[]} */
  const items = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new Error(`unexpected indentation (line ${line.lineNo})`);
    if (!(line.content.startsWith('- ') || line.content === '-')) break;
    const rest = line.content === '-' ? '' : line.content.slice(2).trim();
    if (rest === '') {
      const next = lines[i + 1];
      if (next && next.indent > indent) {
        const child = parseBlock(lines, i + 1, next.indent);
        items.push(child.value);
        i = child.next;
      } else {
        items.push(null);
        i += 1;
      }
      continue;
    }
    if (looksLikeMapping(rest)) {
      /** @type {Array<{ indent: number, content: string, lineNo: number }>} */
      const childLines = [{ indent: indent + 2, content: rest, lineNo: line.lineNo }];
      let j = i + 1;
      while (j < lines.length && lines[j].indent > indent) {
        childLines.push(lines[j]);
        j += 1;
      }
      items.push(parseMapping(childLines, 0, indent + 2).value);
      i = j;
      continue;
    }
    items.push(parseScalar(rest, line.lineNo));
    i += 1;
  }
  return { value: items, next: i };
}

/**
 * @param {string} content
 * @returns {boolean}
 */
function looksLikeMapping(content) {
  try {
    splitKey(content, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a YAML document within the supported subset.
 *
 * @param {string} text
 * @returns {unknown} the document as plain objects, arrays and scalars
 * @throws {Error} with a line number when the document uses an unsupported construct
 */
export function parseYaml(text) {
  const source = text.replace(/^\uFEFF/, '');
  /** @type {Array<{ indent: number, content: string, lineNo: number }>} */
  const lines = [];
  source.split(/\r?\n/).forEach((raw, index) => {
    const line = readLine(raw, index + 1);
    if (line) lines.push(line);
  });
  if (lines.length === 0) return {};
  if (lines[0].content.startsWith('---')) lines.shift();
  if (lines.length === 0) return {};
  const parsed = parseBlock(lines, 0, lines[0].indent);
  if (parsed.next !== lines.length) {
    const lineNo = lines[parsed.next] ? lines[parsed.next].lineNo : '?';
    throw new Error(`could not parse the document past line ${lineNo}`);
  }
  return parsed.value;
}

/**
 * Read one mapping field, failing with a readable message when it is absent.
 *
 * @param {unknown} document
 * @param {string} key
 * @param {string} contractName
 * @returns {unknown}
 */
export function requireKey(document, key, contractName) {
  if (typeof document !== 'object' || document === null || !(key in document)) {
    throw new Error(`${contractName}: required key "${key}" is missing`);
  }
  return /** @type {Record<string, unknown>} */ (document)[key];
}

/**
 * @param {unknown} value
 * @returns {unknown[]}
 */
export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
export function asObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {};
}

/**
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export function asString(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

/**
 * @param {unknown} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function asBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * @param {unknown} value
 * @param {string[]} fallback
 * @returns {string[]}
 */
export function asStringArray(value, fallback = []) {
  const list = asArray(value).filter((entry) => typeof entry === 'string');
  return list.length > 0 ? /** @type {string[]} */ (list) : fallback;
}
