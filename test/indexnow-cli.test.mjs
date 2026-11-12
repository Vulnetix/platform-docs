import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, KEY, keyFileOk } from '../scripts/indexnow.mjs';
import { runScript } from './cli.mjs';

// main() only runs when the module is the entry point, so the CLI is driven
// in child processes with a stubbed globalThis.fetch, the same way the
// releases CLI is tested.
const modPath = fileURLToPath(new URL('../scripts/indexnow.mjs', import.meta.url));
const runCli = (fetchImpl, argv = []) => runScript(modPath, fetchImpl, argv);

const SITEMAP = '<urlset><url><loc>https://docs.vulnetix.com/</loc></url></urlset>';
// Serves the sitemap from an XML fixture, then answers each endpoint call in
// turn with the given expression.
const endpointRun = (xml, endpoint) => runCli(`(() => {
  let n = 0;
  return async (url) => String(url).includes('sitemap')
    ? { ok: true, text: async () => ${JSON.stringify(xml)} }
    : (${endpoint});
})()`);

test('the key gate passes only for a file holding exactly the key', () => {
  const dir = mkdtempSync(join(tmpdir(), 'indexnow-'));
  try {
    const wrong = join(dir, 'wrong.txt');
    const right = join(dir, 'right.txt');
    writeFileSync(wrong, 'not the key');
    writeFileSync(right, `${KEY}\n`);
    assert.equal(keyFileOk(), true, 'the hosted public/<KEY>.txt must pass');
    assert.equal(keyFileOk(join(dir, 'missing.txt'), KEY), false);
    assert.equal(keyFileOk(wrong, KEY), false);
    assert.equal(keyFileOk(right, KEY), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a non-ok sitemap fetch stops the run with its HTTP status', () => {
  const r = runCli(`async (url) => ({ ok: false, status: 503 })`);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /\[indexnow\] ERROR: https:\/\/docs\.vulnetix\.com\/sitemap-0\.xml: HTTP 503/);
});

test('a sitemap with no pages on this host stops the run', () => {
  const r = runCli(`async (url) => ({ ok: true, text: async () => '<urlset><url><loc>https://www.vulnetix.com/</loc></url></urlset>' })`);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /\[indexnow\] ERROR: the sitemap lists no pages on this host/);
});

test('--dry-run prints the summary and the first ten URLs and posts nothing', () => {
  const urls = Array.from({ length: 12 }, (_, i) => `https://${HOST}/p${i}/`);
  const xml = `<urlset>${urls.map((u) => `<url><loc>${u}</loc></url>`).join('')}</urlset>`;
  const r = runCli(`async (url) => {
    if (!String(url).includes('sitemap')) throw new Error('a POST must not happen in --dry-run');
    return { ok: true, text: async () => ${JSON.stringify(xml)} };
  }`, ['--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\[indexnow\] 12 URLs/);
  assert.match(r.stdout, /"host": "docs\.vulnetix\.com"/);
  assert.match(r.stdout, /"key": "[0-9a-f]{32}"/);
  assert.match(r.stdout, /"keyLocation": "https:\/\/docs\.vulnetix\.com\/[0-9a-f]{32}\.txt"/);
  assert.match(r.stdout, /"urlCount": 12/);
  const printed = r.stdout.match(/^  https:\/\/docs\.vulnetix\.com\/p\d+\/$/gm);
  assert.deepEqual(printed, urls.slice(0, 10).map((u) => `  ${u}`));
});

test('each endpoint is logged OK or WARN and one 200/202 succeeds the run', () => {
  const r = endpointRun(SITEMAP, `{ status: [403, 202, 200][n++] }`);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\[indexnow\] WARN 403 https:\/\/api\.indexnow\.org\/indexnow/);
  assert.match(r.stdout, /\[indexnow\] OK {3}202 https:\/\/www\.bing\.com\/indexnow/);
  assert.match(r.stdout, /\[indexnow\] OK {3}200 https:\/\/yandex\.com\/indexnow/);
  assert.match(r.stdout, /\[indexnow\] submitted 1 URLs/);
});

test('every endpoint refusing the run exits 1', () => {
  const r = endpointRun(SITEMAP, `{ status: [403, 429, 500][n++] }`);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /\[indexnow\] WARN 403 /);
  assert.match(r.stdout, /\[indexnow\] WARN 429 /);
  assert.match(r.stdout, /\[indexnow\] WARN 500 /);
  assert.match(r.stderr, /\[indexnow\] ERROR: every IndexNow endpoint failed/);
});

test('a failing fetch counts as 0 and the run exits 1 when none answered', () => {
  const r = endpointRun(SITEMAP, `(() => { throw new Error('ECONNREFUSED'); })()`);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /\[indexnow\] FAIL https:\/\/api\.indexnow\.org\/indexnow: Error: ECONNREFUSED/);
  assert.match(r.stdout, /\[indexnow\] FAIL https:\/\/www\.bing\.com\/indexnow: Error: ECONNREFUSED/);
  assert.match(r.stdout, /\[indexnow\] FAIL https:\/\/yandex\.com\/indexnow: Error: ECONNREFUSED/);
  assert.match(r.stderr, /\[indexnow\] ERROR: every IndexNow endpoint failed/);
});