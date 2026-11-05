import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HOST, KEY, KEY_FILE, MAX_URLS, accepted, payload, sitemapUrls } from '../scripts/indexnow.mjs';

test('the hosted key file holds exactly the key', () => {
  assert.match(KEY, /^[0-9a-f]{32}$/);
  assert.equal(readFileSync(KEY_FILE, 'utf8').trim(), KEY);
});

test('only this host’s sitemap URLs are submitted', () => {
  const xml = `<urlset>
    <url><loc>https://docs.vulnetix.com/</loc><lastmod>2026-11-05</lastmod></url>
    <url><loc> https://docs.vulnetix.com/cli/ </loc></url>
    <url><loc>https://www.vulnetix.com/pricing/</loc></url>
    <url><loc>not a url</loc></url>
  </urlset>`;
  assert.deepEqual(sitemapUrls(xml), ['https://docs.vulnetix.com/', 'https://docs.vulnetix.com/cli/']);
});

test('the payload names the host, the key and where the key is hosted, capped at the IndexNow limit', () => {
  const body = payload(Array.from({ length: MAX_URLS + 5 }, (_, i) => `https://${HOST}/p${i}/`));
  assert.equal(body.host, 'docs.vulnetix.com');
  assert.equal(body.key, KEY);
  assert.equal(body.keyLocation, `https://docs.vulnetix.com/${KEY}.txt`);
  assert.equal(body.urlList.length, MAX_URLS);
});

test('a run succeeds when any endpoint accepted it, and fails only when all refused', () => {
  assert.equal(accepted([403, 403, 202]), true);
  assert.equal(accepted([200, 0, 500]), true);
  assert.equal(accepted([403, 0, 429]), false);
  assert.equal(accepted([]), false);
});
