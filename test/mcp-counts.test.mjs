// The MCP server's tool and prompt counts are quoted in prose on several
// mcp-server pages ("31 tools and 18 prompts"). Those numbers drift when the
// server gains a tool or the prompt corpus is regenerated, so this test counts
// the registrations in a sibling checkout of Vulnetix/mcp-server and compares.
//
// The checkout is found at ../mcp-server, or at $SF_SRC_MCP_SERVER. Without it
// the source-backed tests skip; the pages are still checked to agree with each
// other.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = process.env.SF_SRC_MCP_SERVER ?? join(ROOT, '../mcp-server');
const DOCS = join(ROOT, 'src/content/docs/mcp-server');
const MUST_QUOTE = ['get-started/quickstart.md', 'get-started/plans-and-limits.md', 'clients/overview.md'];

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// Tool names: the first argument of each server.registerTool(...) call that is
// a string literal, plus the `name:` of each spec in a table registered in a
// loop (src/tools/threat.ts registers `spec.name`).
function countTools(src) {
  const names = new Set();
  for (const f of walk(join(src, 'src/tools')).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/registerTool\(\s*"([a-z_]+)"/g)) names.add(m[1]);
    if (/registerTool\(\s*spec\.name/.test(t)) for (const m of t.matchAll(/^\s*name:\s*"([a-z_]+)"/gm)) names.add(m[1]);
  }
  return names;
}

// Prompt names: src/prompts/register.ts registers every entry of the generated
// corpus.
function countPrompts(src) {
  const t = readFileSync(join(src, 'src/prompts/generated.ts'), 'utf8');
  return new Set([...t.matchAll(/"name":\s*"(vulnetix_[a-z_]+)"/g)].map((m) => m[1]));
}

// Every "<n> tools" and "<n> prompts" quoted on the mcp-server pages.
function quoted() {
  const out = [];
  for (const f of walk(DOCS).filter((f) => f.endsWith('.md'))) {
    const t = readFileSync(f, 'utf8').replace(/\n/g, ' ');
    for (const m of t.matchAll(/\b(\d+) (tools|prompts)\b/g)) out.push({ page: f.slice(DOCS.length + 1), kind: m[2], n: Number(m[1]) });
  }
  return out;
}

test('the named mcp-server pages quote a tool count and a prompt count', () => {
  const q = quoted();
  for (const page of MUST_QUOTE) {
    assert.ok(q.some((x) => x.page === page && x.kind === 'tools'), `${page} quotes no tool count`);
    assert.ok(q.some((x) => x.page === page && x.kind === 'prompts'), `${page} quotes no prompt count`);
  }
});

test('every mcp-server page quotes the same counts', () => {
  const q = quoted();
  for (const kind of ['tools', 'prompts']) {
    const seen = new Set(q.filter((x) => x.kind === kind).map((x) => x.n));
    assert.equal(seen.size, 1, `pages disagree on the number of ${kind}: ${q.filter((x) => x.kind === kind).map((x) => `${x.page}=${x.n}`).join(', ')}`);
  }
});

test('the quoted counts match the mcp-server source', (t) => {
  if (!existsSync(join(SRC, 'src/tools'))) {
    t.skip(`no mcp-server checkout at ${SRC}; set SF_SRC_MCP_SERVER to check the counts`);
    return;
  }
  const tools = countTools(SRC).size;
  const prompts = countPrompts(SRC).size;
  assert.ok(tools > 0 && prompts > 0, 'found no tools or prompts in the source');
  for (const x of quoted()) {
    assert.equal(x.n, x.kind === 'tools' ? tools : prompts, `${x.page} says ${x.n} ${x.kind}; ${SRC} registers ${x.kind === 'tools' ? tools : prompts}`);
  }
});
