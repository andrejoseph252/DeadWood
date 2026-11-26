// The simulation must run headless. Walk the import graph from each headless entry point
// and fail if anything reaches three.js (or any other bare package import).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HEADLESS = ['src/sim/index.js', 'src/world/plot.js', 'src/world/obstacles.js', 'src/core/random.js', 'src/core/noise.js'];
const IMPORT_RE = /\b(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/g;

function importsOf(file) {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(IMPORT_RE)].map((m) => m[1] || m[2] || m[3]);
}

for (const entry of HEADLESS) {
  test(`${entry} stays headless (no three.js, no packages)`, () => {
    const seen = new Set(), stack = [resolve(root, entry)];
    while (stack.length) {
      const file = stack.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      if (!file.endsWith('.js')) continue;   // JSON data files have no imports
      for (const spec of importsOf(file)) {
        assert.ok(spec.startsWith('.'), `${relative(root, file)} imports package '${spec}'`);
        stack.push(resolve(dirname(file), spec));
      }
    }
  });
}
