import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { needle, checkCoverage, STATUSES } from '../scripts/lib/coverage.mjs';
import features from '../inventory/features.mjs';

const atom = (kind, value) => ({ id: `${kind}:${value}`, kind, value, sources: [] });
const feature = (id, page, match, extra = {}) => ({ id, page, match, status: 'drafted', area: 'x', title: id, ...extra });
const pages = (map) => (p) => map[p] ?? null;

test('needle is the text a page must contain for each atom kind', () => {
  assert.equal(needle(atom('enum', 'fcNeedKinds=firewall_review')), 'firewall_review');
  assert.equal(needle(atom('route', 'GET /v1/factory/runs')), '/factory/runs');
  assert.equal(needle(atom('cli-flag', 'rc -max')), '-max');
  assert.equal(needle(atom('cli-sub', 'agent crew import')), 'import');
  assert.equal(needle(atom('belai-config', 'lsp.languages')), 'languages');
  assert.equal(needle(atom('setting', 'autonomy.max')), 'autonomy.max');
});

test('an atom no feature matches is reported as unmatched', () => {
  const r = checkCoverage([atom('setting', 'a.b'), atom('setting', 'z.z')], [feature('f', 'x/f', ['^setting:a\\.'])], pages({ 'x/f': 'a.b' }));
  assert.deepEqual(r.unmatched.map((a) => a.id), ['setting:z.z']);
  assert.equal(r.ok, false);
});

test('a drafted or verified feature must have its page', () => {
  const r = checkCoverage([], [feature('f', 'x/missing', []), feature('v', 'x/gone', [], { status: 'verified' })], pages({}));
  assert.equal(r.problems.length, 2);
});

test('a todo or n/a feature needs no page and no mentions', () => {
  const r = checkCoverage([atom('setting', 'a.b')], [feature('f', 'x/missing', ['^setting:'], { status: 'todo' })], pages({}));
  assert.equal(r.ok, true);
});

test('a user-facing atom must be named on its own page', () => {
  const fts = [feature('f', 'x/f', ['^setting:'])];
  assert.equal(checkCoverage([atom('setting', 'a.b')], fts, pages({ 'x/f': 'nothing here' })).missing.length, 1);
  assert.equal(checkCoverage([atom('setting', 'a.b')], fts, pages({ 'x/f': 'set `a.b` to 3' })).ok, true);
});

test('a setting named only on the reference page does not count', () => {
  const r = checkCoverage([atom('setting', 'a.b')], [feature('f', 'x/f', ['^setting:'])], pages({ 'x/f': '', 'reference/settings': 'a.b' }));
  assert.equal(r.missing.length, 1);
});

test('routes, flags, Belai config and templates may be named only on a reference page', () => {
  const r = checkCoverage([atom('route', 'GET /v1/factory/runs'), atom('cli-flag', 'rc -max')], [feature('f', 'x/f', ['^(route|cli-flag):'])], pages({ 'x/f': '', 'reference/http-api': '/factory/runs', 'belai/cli-reference': '-max' }));
  assert.equal(r.ok, true);
});

test('refOnly lets a feature leave chosen atoms to the reference pages', () => {
  const fts = [feature('f', 'x/f', ['^setting:'], { refOnly: ['^setting:a\\.'] })];
  assert.equal(checkCoverage([atom('setting', 'a.b')], fts, pages({ 'x/f': '', 'reference/settings': 'a.b' })).ok, true);
});

test('internal atoms (handler files, docs) need no mention', () => {
  const r = checkCoverage([atom('gofile', 'factory_cron_stagger')], [feature('f', 'x/f', ['^gofile:'])], pages({ 'x/f': '' }));
  assert.equal(r.ok, true);
});

test('feature ids must be unique', () => {
  const r = checkCoverage([], [feature('f', 'x/f', []), feature('f', 'x/f', [])], pages({ 'x/f': '' }));
  assert.match(r.problems[0], /duplicate feature id f/);
});

// A feature page is relative to the Software Factory segment, or to the docs
// root when it starts with "/" (the CLI, Platform IaC and Guardian features).
const pageUrl = (p) => new URL(p.startsWith('/') ? `../src/content/docs${p}.md` : `../src/content/docs/software-factory/${p}.md`, import.meta.url);

test('the real feature list: valid statuses, a page for every written feature, every factory feature verified', () => {
  for (const ft of features) {
    assert.ok(STATUSES.includes(ft.status), `${ft.id} has status ${ft.status}`);
    if (ft.status === 'drafted' || ft.status === 'verified') for (const p of [ft.page, ...(ft.pages ?? [])]) assert.ok(existsSync(pageUrl(p)), `${p}.md`);
  }
  assert.deepEqual(features.filter((ft) => !ft.page.startsWith('/') && ft.status !== 'verified').map((ft) => ft.id), []);
});

test('the real inventory passes every rule', () => {
  const { atoms } = JSON.parse(readFileSync(new URL('../inventory/atoms.json', import.meta.url), 'utf8'));
  const textOf = (p) => { const u = pageUrl(p); return existsSync(u) ? readFileSync(u, 'utf8') : null; };
  const r = checkCoverage(atoms, features, textOf);
  assert.deepEqual({ unmatched: r.unmatched.map((a) => a.id), missing: r.missing, problems: r.problems }, { unmatched: [], missing: [], problems: [] });
});
