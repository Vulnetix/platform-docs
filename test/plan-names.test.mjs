// The plan between Pro and Enterprise is called Business. Its key and the
// X-VDB-Plan value stay `teams`, so the lowercase code form is allowed; the
// word "Teams" in a plan sense is not. Microsoft Teams as a messaging
// provider is allowed on lines that name it as one, and the SAST rule pages
// are generated from rule prose about people ("teams discover this").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DIRS = ['src/content/docs', 'src/segments', 'src/pages', 'src/layouts', 'src/lib'];
const SKIP = [/^src\/content\/docs\/sast\/rules\//];
const MESSAGING = /Slack|Discord|Google Chat|Microsoft|webhook|logic\.azure|office\.com|UPN|\(Teams\)/i;

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

test('no page calls the Business plan Teams', () => {
  const hits = [];
  for (const dir of DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const rel = relative(ROOT, file);
      if (!/\.(md|mdx|astro|ts|json)$/.test(rel) || SKIP.some((r) => r.test(rel))) continue;
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (/\bTeams\b/.test(line) && !MESSAGING.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
    }
  }
  assert.deepEqual(hits, [], `"Teams" as a plan name; write Business (the key stays \`teams\`):\n${hits.join('\n')}`);
});

test('the guard catches a plan-sense Teams and spares the messaging provider', () => {
  assert.ok(/\bTeams\b/.test('Guardrails need the Teams plan.') && !MESSAGING.test('Guardrails need the Teams plan.'));
  assert.ok(MESSAGING.test('Chat and issue delivery (Slack, Teams, Discord)'));
});
