import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// The generated Platform IaC kind pages (migration/generators/kind-reference.mjs)
// share one shape. These checks do not need the source repositories: they read
// the committed pages.
const dir = new URL('../src/content/docs/platform-iac/kinds/', import.meta.url).pathname;
const pages = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'catalogue.md');
const read = (f) => readFileSync(join(dir, f), 'utf8');

test('there is a page for every kind in the catalogue, and the catalogue links each', () => {
  const catalogue = read('catalogue.md');
  const linked = [...catalogue.matchAll(/\]\(\/platform-iac\/kinds\/([a-z0-9-]+)\/\)/g)].map((m) => m[1]);
  assert.ok(linked.length >= 56, `the catalogue links ${linked.length} kinds`);
  for (const slug of new Set(linked)) assert.ok(existsSync(join(dir, `${slug}.md`)), `${slug} is linked but has no page`);
  for (const f of pages) assert.ok(linked.includes(f.replace(/\.md$/, '')), `${f} is not in the catalogue`);
});

test('every kind page has Minimal and Advanced samples in YAML, HCL and CLI, a group and a status', () => {
  for (const f of pages) {
    const s = read(f);
    assert.match(s, /^group: "/m, `${f}: no group`);
    assert.match(s, /^\| Status \| \*\*(Served|Validate only|Schema only)\./m, `${f}: no status`);
    for (const which of ['Minimal', 'Advanced']) {
      const part = s.split(`\n## ${which}\n`)[1]?.split('\n## ')[0];
      assert.ok(part, `${f}: no ${which} section`);
      assert.match(part, /\*\*YAML\*\*\n\n```yaml\n/, `${f}: ${which} has no YAML`);
      assert.match(part, /\*\*HCL\*\*/, `${f}: ${which} has no HCL block or note`);
      assert.match(part, /\*\*CLI\*\*[^\n]*\n\n```bash\n/, `${f}: ${which} has no CLI`);
      assert.match(part, /vulnetix config (apply|validate) -f -/, `${f}: ${which} CLI is not a heredoc into config`);
    }
  }
});

test('a kind with a CEL field links the CEL reference, and no page carries a control character', () => {
  for (const f of pages) {
    const s = read(f);
    if (/^\| CEL fields \|/m.test(s)) assert.match(s, /\/platform-iac\/reference\/cel\//, `${f}: no CEL link`);
    assert.doesNotMatch(s, /[\u0000-\u0008\u000b-\u001f\u007f]/, `${f}: control character`);
  }
});

test('a page that claims a Terraform resource shows its Minimal HCL', () => {
  for (const f of pages) {
    const s = read(f);
    const m = s.match(/^\| Terraform resource \| \[`(vulnetix_\w+)`\]/m);
    if (m) assert.match(s, new RegExp(`resource "${m[1]}" "`), `${f}: ${m[1]} is claimed but no HCL resource block is shown`);
  }
});
