// Delivery status labels. The VS Code extension's old site described planned
// features next to shipped ones; every page of the vscode segment now declares
// `status` (available, in-development or planned), which Doc.astro renders as a
// badge, so a planned feature never reads as shipped.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DOCS = new URL('../src/content/docs', import.meta.url).pathname;
const STATUSES = ['available', 'in-development', 'planned'];
// Segments whose every page must declare a status.
const REQUIRED = ['vscode'];

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : [];
});
const statusOf = (file) => {
  const fm = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  return fm?.[1].match(/^status:\s*["']?([a-z-]+)["']?\s*$/m)?.[1] ?? null;
};

test('every page of a status segment declares a valid status', () => {
  const bad = [];
  for (const seg of REQUIRED) {
    for (const f of walk(join(DOCS, seg))) {
      const s = statusOf(f);
      if (!STATUSES.includes(s)) bad.push(`${f.slice(DOCS.length + 1)}: ${s ?? 'no status'}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('no page anywhere uses an unknown status', () => {
  const bad = walk(DOCS).map((f) => [f, statusOf(f)]).filter(([, s]) => s && !STATUSES.includes(s));
  assert.deepEqual(bad.map(([f, s]) => `${f}: ${s}`), []);
});

test('the not-available-yet page is labelled planned', () => {
  assert.equal(statusOf(join(DOCS, 'vscode/reference/not-available-yet.md')), 'planned');
});
