// Every segment home is served at /<segment>/, and its own path redirects
// there (src/lib/home-redirects.mjs, wired into astro.config.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homeRedirects } from '../src/lib/home-redirects.mjs';

const ROOT = join(import.meta.dirname, '..');
const homes = () => {
  const dir = join(ROOT, 'src/segments');
  const json = readdirSync(dir).filter((n) => n.endsWith('.json'))
    .map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')));
  const nav = readFileSync(join(ROOT, 'src/lib/nav.ts'), 'utf8');
  const sf = nav.match(/id: 'software-factory',[\s\S]*?home: '([^']+)'/);
  assert.ok(sf, 'the Software Factory segment in nav.ts has a home');
  return [...json, { id: 'software-factory', home: sf[1] }];
};

test('each segment home path redirects to the segment root', () => {
  const map = homeRedirects();
  for (const s of homes()) {
    assert.equal(map[`/${s.home}`], `/${s.id}/`, `${s.home} has no redirect to /${s.id}/`);
  }
});

test('the CLI overview link printed by older installers lands on /cli/', () => {
  assert.equal(homeRedirects()['/cli/get-started/overview'], '/cli/');
});

test('the astro config spreads the home redirects in', () => {
  const cfg = readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8');
  assert.match(cfg, /\.\.\.homeRedirects\(\)/);
});
