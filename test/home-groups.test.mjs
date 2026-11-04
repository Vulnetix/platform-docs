// The home page lists every segment once, under one of the GROUPS headings in
// src/lib/nav.ts. (nav.ts uses import.meta.glob, so it is read as text here.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const nav = readFileSync(join(ROOT, 'src/lib/nav.ts'), 'utf8');
const groups = [...nav.matchAll(/\{ title: '([^']+)', ids: \[([^\]]*)\] \}/g)]
  .map((m) => ({ title: m[1], ids: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]) }));
const segments = [
  'software-factory',
  ...readdirSync(join(ROOT, 'src/segments')).filter((n) => n.endsWith('.json')).map((n) => n.replace(/\.json$/, '')),
];

test('every segment is in exactly one home page group', () => {
  assert.ok(groups.length > 1, 'GROUPS parsed from nav.ts');
  const listed = groups.flatMap((g) => g.ids);
  assert.deepEqual([...listed].sort(), [...segments].sort());
  assert.equal(new Set(listed).size, listed.length, 'a segment is listed twice');
});

test('group headings are sentence case with no dashes', () => {
  for (const { title } of groups) {
    assert.doesNotMatch(title, /[–—]/);
    const words = title.split(' ').slice(1).filter((w) => /^[A-Z][a-z]/.test(w));
    const names = new Set(['CLI', 'Software', 'Factory', 'SBOM', 'VEX', 'VDB', 'API']);
    assert.deepEqual(words.filter((w) => !names.has(w)), [], `${title} is not sentence case`);
  }
});
