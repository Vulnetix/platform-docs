import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { metaDescription, MAX_DESCRIPTION } from '../migration/generators/description.mjs';

// A description is the subtitle under a page title and its meta description.
// Search engines cut it at about 160 characters, so a longer one reads as a
// sentence that stops in the middle.

const docs = new URL('../src/content/docs/', import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((e) => {
  const p = join(d, e);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : [];
});

test('every page description fits a search result', () => {
  const long = [];
  for (const f of walk(docs)) {
    const fm = readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    const d = yaml.load(fm[1]).description ?? '';
    if (d.length > MAX_DESCRIPTION) long.push(`${f.slice(docs.length)} (${d.length})`);
  }
  assert.deepEqual(long, [], `descriptions over ${MAX_DESCRIPTION} characters`);
});

test('metaDescription keeps a short description as it is', () => {
  assert.equal(metaDescription('  Reads   an SBOM. '), 'Reads an SBOM.');
});

test('metaDescription ends a long one at its strongest clause', () => {
  const s = 'Reports session, authentication and identity cookies set without HttpOnly in Go, Node.js, PHP, Python and Java, and framework settings that turn the session cookie\'s HttpOnly flag off.';
  assert.equal(metaDescription(s), 'Reports session, authentication and identity cookies set without HttpOnly in Go, Node.js, PHP, Python and Java.');
});

test('metaDescription prefers a clause over a list item', () => {
  const s = `${'a'.repeat(70)}; ${'b'.repeat(40)}, ${'c'.repeat(60)}`;
  assert.equal(metaDescription(s), `${'a'.repeat(70)}.`);
});

test('metaDescription falls back to a word boundary and says it continues', () => {
  const r = metaDescription('word '.repeat(60));
  assert.ok(r.length <= MAX_DESCRIPTION, `${r.length} characters`);
  assert.ok(r.endsWith('word…'), r);
});
