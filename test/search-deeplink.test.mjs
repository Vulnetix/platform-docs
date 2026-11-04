// The www.vulnetix.com footer links to https://docs.vulnetix.com/?search. The
// search dialog must open on arrival for that link, take any terms given as
// ?search=<terms>, and drop the parameter so a reload does not reopen it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SEARCH = readFileSync(new URL('../src/components/Search.astro', import.meta.url), 'utf8');
const LAYOUT = readFileSync(new URL('../src/layouts/Doc.astro', import.meta.url), 'utf8');

test('every page carries the search dialog', () => {
  assert.match(LAYOUT, /<Search \/>/);
});

test('?search opens the dialog, prefilled with its terms', () => {
  assert.match(SEARCH, /params\.has\('search'\)/);
  assert.match(SEARCH, /input\.value = params\.get\('search'\) \?\? ''/);
  assert.match(SEARCH, /params\.has\('search'\)\) \{[\s\S]*?open\(\);/);
});

test('the parameter is dropped from the address bar, other parameters and the hash kept', () => {
  assert.match(SEARCH, /params\.delete\('search'\)/);
  assert.match(SEARCH, /history\.replaceState\(null, '', location\.pathname \+ \(rest \? `\?\$\{rest\}` : ''\) \+ location\.hash\)/);
});
