#!/usr/bin/env node
// indexnow.mjs: tell the IndexNow search engines (Bing, Yandex, Seznam, Naver,
// Mojeek, and DuckDuckGo through Bing) about every page in the live sitemap.
// Google does not read IndexNow; it finds the sitemap through robots.txt.
//
//   node scripts/indexnow.mjs [--dry-run]
//
// Runs after each deploy (pages.yml) and daily (seo.yml). The key is public by
// design: public/<KEY>.txt is the proof that this host owns it. The Markdown
// twins are not submitted; the sitemap lists the HTML pages only.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const HOST = 'docs.vulnetix.com';
export const KEY = '53f8b42dfe8ecaf54afee3866f5fc6cd';
export const KEY_FILE = fileURLToPath(new URL(`../public/${KEY}.txt`, import.meta.url));
const SITEMAP = `https://${HOST}/sitemap-0.xml`;
// One engine shares a submission with the rest; three for redundancy.
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow', 'https://yandex.com/indexnow'];
export const MAX_URLS = 10000; // IndexNow's limit per request

// The sitemap's <loc> URLs on this host: IndexNow refuses other hosts.
export const sitemapUrls = (xml, host = HOST) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter((u) => {
    try { return new URL(u).host === host; } catch { return false; }
  });

export const payload = (urlList) => ({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urlList.slice(0, MAX_URLS) });

const fail = (msg) => { console.error(`[indexnow] ERROR: ${msg}`); process.exit(1); };

async function main() {
  if (!existsSync(KEY_FILE) || readFileSync(KEY_FILE, 'utf8').trim() !== KEY) fail(`public/${KEY}.txt must exist and contain the key`);
  const res = await fetch(SITEMAP, { headers: { 'User-Agent': 'vulnetix-docs-indexnow/1.0' } });
  if (!res.ok) fail(`${SITEMAP}: HTTP ${res.status}`);
  const urls = sitemapUrls(await res.text());
  if (!urls.length) fail('the sitemap lists no pages on this host');
  const body = payload(urls);
  console.log(`[indexnow] ${urls.length} URLs${urls.length > MAX_URLS ? `, capped at ${MAX_URLS}` : ''}`);
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({ ...body, urlList: undefined, urlCount: body.urlList.length }, null, 2));
    body.urlList.slice(0, 10).forEach((u) => console.log(`  ${u}`));
    return;
  }
  let ok = 0;
  for (const endpoint of ENDPOINTS) {
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
      // 200 OK and 202 Accepted both mean received.
      const good = r.status === 200 || r.status === 202;
      ok += good;
      console.log(`[indexnow] ${good ? 'OK  ' : 'WARN'} ${r.status} ${endpoint}`);
    } catch (e) {
      console.log(`[indexnow] FAIL ${endpoint}: ${e}`);
    }
  }
  // They share submissions: fail only when every endpoint refused.
  if (!ok) fail('every IndexNow endpoint failed');
  console.log(`[indexnow] submitted ${body.urlList.length} URLs`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => fail(e?.stack ?? String(e)));
