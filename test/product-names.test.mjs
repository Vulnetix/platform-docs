// The signed-in product at www.vulnetix.com/resolve/ is the Resolve Platform.
// "The console", "the Vulnetix console" and "the Resolve console" are not
// used in prose. Routes and API names keep the word (`/resolve/console`,
// `console-routes`, a `console` field), so code spans, fenced code and link
// targets are not checked.
//
// Skipped: the SAST rule pages (generated from the CLI's rule prose, where
// "the console" is a browser's or a debugger's) and the Platform IaC kind
// pages, whose field descriptions come from the config-schemas release that
// releases.json pins. The kind pages' own prose comes from kind-notes.mjs and
// kind-reference.mjs, which are checked here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DIRS = ['src/content/docs', 'src/segments', 'src/pages', 'src/layouts', 'src/lib'];
const GENERATORS = ['migration/generators/kind-notes.mjs', 'migration/generators/kind-reference.mjs', 'scripts/gen-reference.mjs'];
const SKIP = [/^src\/content\/docs\/sast\/rules\//, /^src\/content\/docs\/platform-iac\/kinds\//];
const BANNED = /\b[Tt]he console\b(?!\.\w|\()|\b(?:Vulnetix|Resolve) [Cc]onsole\b|\bconsole (?:session|pages?|only|edit|tab)\b|\bconsole-only\b/;

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// Prose only: drop fenced code, inline code and link targets.
export const prose = (text) => text
  .replace(/^```[\s\S]*?^```/gm, '')
  .replace(/`[^`\n]*`/g, '')
  .replace(/\]\([^)]*\)/g, ']');

const hitsIn = (rel, text) => prose(text).split('\n').flatMap((line, i) =>
  BANNED.test(line) ? [`${rel}: ${line.trim().slice(0, 120)}`] : []);

test('pages call the signed-in product the Resolve Platform, not the console', () => {
  const hits = [];
  for (const dir of DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const rel = relative(ROOT, file);
      if (!/\.(md|mdx|astro|ts|json)$/.test(rel) || SKIP.some((r) => r.test(rel))) continue;
      hits.push(...hitsIn(rel, readFileSync(file, 'utf8')));
    }
  }
  for (const rel of GENERATORS) hits.push(...hitsIn(rel, readFileSync(join(ROOT, rel), 'utf8')));
  assert.deepEqual(hits, [], `write "the Resolve Platform":\n${hits.join('\n')}`);
});

test('the guard allows routes, code and API names, and catches prose', () => {
  assert.ok(BANNED.test('Open Integrations in the console.'));
  assert.ok(BANNED.test('Pages in the Vulnetix console'));
  assert.ok(BANNED.test('Every route needs a signed-in console session.'));
  assert.ok(BANNED.test('Other console pages link here.'));
  assert.ok(!BANNED.test(prose('See [Console pages](/software-factory/reference/console-routes/).')));
  assert.ok(!BANNED.test(prose('The `console` field and `/resolve/console` route.')));
  assert.ok(!BANNED.test('the console.log call'));
});
