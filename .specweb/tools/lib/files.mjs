/**
 * @file Filesystem helpers for the SpecWeb validators: deterministic walking, POSIX-normalised
 * relative paths, and a precomputed index of files and directories so import resolution is a Set
 * lookup instead of a stat call per import.
 *
 * @module tools/lib/files
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/** Never scanned, never reported on: build output, caches and other people's code. */
export const DEFAULT_IGNORES = [
  'node_modules',
  '.git',
  '.specweb',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  'playwright-report',
  'test-results',
  '.vscode',
];

/**
 * @param {string} value
 * @returns {string} the path with forward slashes
 */
export function toPosix(value) {
  return value.split(path.sep).join('/').replace(/\/+/g, '/');
}

/**
 * @param {string} absolutePath
 * @returns {Promise<boolean>}
 */
export async function pathExists(absolutePath) {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} absolutePath
 * @returns {Promise<boolean>}
 */
export async function isDirectory(absolutePath) {
  try {
    return (await stat(absolutePath)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Walk a directory tree and return files as POSIX paths relative to `rootAbs`, sorted.
 *
 * @param {string} rootAbs
 * @param {{ ignores?: string[] }} [options]
 * @returns {Promise<string[]>}
 */
export async function walkFiles(rootAbs, options = {}) {
  const ignores = new Set(options.ignores ?? DEFAULT_IGNORES);
  /** @type {string[]} */
  const results = [];

  /**
   * @param {string} absoluteDir
   * @returns {Promise<void>}
   */
  async function visit(absoluteDir) {
    let entries;
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (ignores.has(entry.name)) continue;
      const absoluteChild = path.join(absoluteDir, entry.name);
      if (entry.isDirectory()) await visit(absoluteChild);
      else if (entry.isFile()) results.push(toPosix(path.relative(rootAbs, absoluteChild)));
    }
  }

  await visit(rootAbs);
  return results.sort();
}

/**
 * List directories (POSIX paths relative to `rootAbs`, recursive, sorted, excluding `rootAbs`).
 *
 * @param {string} rootAbs
 * @param {{ ignores?: string[] }} [options]
 * @returns {Promise<string[]>}
 */
export async function listDirectories(rootAbs, options = {}) {
  const ignores = new Set(options.ignores ?? DEFAULT_IGNORES);
  /** @type {string[]} */
  const results = [];

  /**
   * @param {string} absoluteDir
   * @returns {Promise<void>}
   */
  async function visit(absoluteDir) {
    let entries;
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (!entry.isDirectory() || ignores.has(entry.name)) continue;
      const absoluteChild = path.join(absoluteDir, entry.name);
      results.push(toPosix(path.relative(rootAbs, absoluteChild)));
      await visit(absoluteChild);
    }
  }

  await visit(rootAbs);
  return results.sort();
}

/**
 * @param {string} absolutePath
 * @returns {Promise<string | null>} file contents, or null when the file does not exist
 */
export async function readTextIfExists(absolutePath) {
  try {
    return await readFile(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * @typedef {object} FileIndex
 * @property {Set<string>} files POSIX paths relative to the index root
 * @property {Set<string>} dirs POSIX directory paths relative to the index root
 */

/**
 * Build an index of every file and directory under each root, for O(1) existence checks.
 *
 * @param {string} rootAbs
 * @param {string[]} roots repository-relative roots, e.g. ['src', 'tests']
 * @param {{ ignores?: string[] }} [options]
 * @returns {Promise<FileIndex & { scanned: number }>}
 */
export async function buildIndex(rootAbs, roots, options = {}) {
  const files = new Set();
  const dirs = new Set();
  let scanned = 0;
  for (const root of roots) {
    const absoluteRoot = path.join(rootAbs, root);
    if (!(await isDirectory(absoluteRoot))) continue;
    const walked = await walkFiles(absoluteRoot, options);
    for (const relative of walked) {
      files.add(relative);
      scanned += 1;
    }
    for (const directory of await listDirectories(absoluteRoot, options)) dirs.add(directory);
  }
  return { files, dirs, scanned };
}

/**
 * Every file under a root, as POSIX paths relative to the repository root.
 *
 * @param {string} rootAbs
 * @param {string} relativeRoot
 * @param {{ ignores?: string[] }} [options]
 * @returns {Promise<string[]>}
 */
export async function walkRoot(rootAbs, relativeRoot, options = {}) {
  const absoluteRoot = path.join(rootAbs, relativeRoot);
  if (!(await isDirectory(absoluteRoot))) return [];
  return walkFiles(absoluteRoot, options);
}
