// The retired docs hosts' redirect maps (migration/redirects/*.tsv). Every old
// URL must land on a page that exists, and on a heading that exists when the
// target names one; no old path may be listed twice; and every host the Worker
// answers must have a route in redirects/wrangler.toml.
//
// scripts/build-redirects.mjs --check dist checks the same targets against a
// built site. This test checks the sources, so it runs before a build.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, FALLBACK, ALIASES, isAbsolute, readRows, key, canon, segmentHomes, loadRedirects } from '../scripts/lib/redirects.mjs';

const DOCS = join(ROOT, 'src/content/docs');
const homes = segmentHomes();
const segmentOfRoot = new Map([...homes].map(([home, seg]) => [seg, home]));

// The page file a docs path is served from, or null.
function pageFor(path) {
  const id = path.replace(/^\/|\/$/g, '');
  const home = segmentOfRoot.get(id);
  const file = join(DOCS, `${home ?? id}.md`);
  return existsSync(file) ? file : null;
}

// Heading ids as the Markdown pipeline writes them: lower case, punctuation
// dropped, spaces to hyphens.
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');
const headings = (file) => new Set([...readFileSync(file, 'utf8').matchAll(/^#{2,6}\s+(.+?)\s*$/gm)].map((m) => slug(m[1])));

test('every redirect target is a docs page, or an absolute https URL', () => {
  const missing = [];
  for (const r of readRows()) {
    const to = canon(r.to, homes);
    if (isAbsolute(to)) {
      if (!to.startsWith('https://')) missing.push(`${r.file}:${r.line} ${to} is not https`);
      continue;
    }
    const [path, frag] = to.split('#');
    const file = pageFor(path);
    if (!file) missing.push(`${r.file}:${r.line} ${r.from} -> ${to}: no page`);
    else if (frag && !headings(file).has(frag)) missing.push(`${r.file}:${r.line} ${r.from} -> ${to}: no heading #${frag}`);
  }
  assert.deepEqual(missing, []);
});

test('no old path is listed twice for a host', () => {
  const seen = new Map();
  const dups = [];
  for (const r of readRows()) {
    const k = `${r.host}${key(r.from)}`;
    if (seen.has(k)) dups.push(`${k}: ${seen.get(k)} and ${r.file}:${r.line}`);
    else seen.set(k, `${r.file}:${r.line}`);
  }
  assert.deepEqual(dups, []);
});

test('every host has a fallback page and every alias names a mapped host', () => {
  const map = loadRedirects();
  for (const host of Object.keys(map)) assert.ok(FALLBACK[host], `${host} has no fallback`);
  for (const to of Object.values(FALLBACK)) assert.ok(pageFor(to), `fallback ${to} is not a page`);
  for (const [alias, host] of Object.entries(ALIASES)) assert.ok(map[host], `alias ${alias} names ${host}, which has no map`);
});

test('wrangler.toml routes every retired host and alias to the Worker', () => {
  const toml = readFileSync(join(ROOT, 'redirects/wrangler.toml'), 'utf8');
  const routed = new Set([...toml.matchAll(/pattern\s*=\s*"([^"/]+)\/\*"/g)].map((m) => m[1]));
  for (const host of [...Object.keys(FALLBACK), ...Object.keys(ALIASES)]) assert.ok(routed.has(host), `no route for ${host}`);
});

test('the committed Worker answers an alias host from its target host map', async () => {
  const worker = (await import('../redirects/worker.js')).default;
  const go = async (u) => (await worker.fetch(new Request(u))).headers.get('location');
  for (const [alias, host] of Object.entries(ALIASES)) {
    for (const path of ['/', '/docs/skills/fix/', '/terms/', '/no/such/page/']) {
      assert.equal(await go(`https://${alias}${path}`), await go(`https://${host}${path}`), `${alias}${path}`);
    }
  }
  assert.equal(await go('https://ai-docs.vulnetix.com/terms/'), 'https://www.vulnetix.com/terms');
  assert.equal((await worker.fetch(new Request('https://example.com/'))).status, 404);
});
