#!/usr/bin/env node
// check-links.mjs: verify internal links in the built site.
//
// Walks the Astro dist/ output and checks every same-origin link:
//   - href="#anchor" must resolve to an id in the target page
//   - href="/path" or "/path/" must resolve to a file in dist
// External links are not fetched (the site is static and links out to GitHub).
// Usage: node scripts/check-links.mjs dist

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = process.argv[2] ?? 'dist';
if (!existsSync(dist)) {
  console.error(`dist directory not found: ${dist}`);
  process.exit(1);
}

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...htmlFiles(p));
    else if (entry.endsWith('.html')) out.push(p);
  }
  return out;
}

function anchorsOf(html) {
  const ids = new Set();
  const re = /\sid="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);
  return ids;
}

// Every page's ids, so a link to another page's heading can be checked too.
const idsByPage = new Map();
const pageOf = (file) => file.slice(dist.length).replace(/index\.html$/, '');

let failures = 0;
const crossPage = [];

for (const file of htmlFiles(dist)) {
  let html = readFileSync(file, 'utf8');
  // Strip script/style bodies: their JS/CSS strings are not links.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>');
  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
  // Code samples are text: an href="..." inside a highlighted <pre> is not a link.
  html = html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, '<pre></pre>');
  html = html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, '<code></code>');
  const ids = anchorsOf(html);
  const rel = file.slice(dist.length);

  // href / src links that stay within the site.
  const linkRe = /(?:href|src)="([^"#][^"]*)"/g;
  let m;
  while ((m = linkRe.exec(html))) {
    const target = m[1];
    if (/^(https?:|mailto:|data:|javascript:)/.test(target)) continue;
    const clean = target.split('?')[0].split('#')[0];
    if (clean === '') continue; // same-page, already checked by anchor pass
    const abs = resolve(join(dist, decodeURIComponent(clean)));
    if (!existsSync(abs)) {
      console.error(`${rel}: broken link ${target}`);
      failures++;
    }
  }

  const anchorRe = /href="#([^"]+)"/g;
  while ((m = anchorRe.exec(html))) {
    if (!ids.has(m[1])) {
      console.error(`${rel}: broken anchor #${m[1]}`);
      failures++;
    }
  }

  // A link to another page's heading is checked once every page's ids are known.
  idsByPage.set(pageOf(file), ids);
  const crossRe = /href="(\/[^"#]*)#([^"]+)"/g;
  while ((m = crossRe.exec(html))) crossPage.push({ rel, href: m[1] + '#' + m[2], page: m[1].split('?')[0], id: m[2] });
}

for (const { rel, href, page, id } of crossPage) {
  const key = decodeURIComponent(page).replace(/\/?$/, '/');
  const ids = idsByPage.get(key) ?? idsByPage.get(key.replace(/\/$/, ''));
  if (!ids) continue; // the missing page was already reported
  if (!ids.has(id)) {
    console.error(`${rel}: broken anchor ${href}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`${failures} broken link(s)`);
  process.exit(1);
}
console.log('all internal links resolve');