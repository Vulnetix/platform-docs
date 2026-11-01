#!/usr/bin/env node
// sitemap.mjs: write dist/sitemap-index.xml and dist/sitemap-0.xml from the
// built HTML. (@astrojs/sitemap is not used: the package firewall does not
// carry the versions it needs.)
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const site = 'https://docs.vulnetix.com';
const urls = [];
(function walk(dir, rel) {
  for (const e of readdirSync(dir).sort()) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'pagefind' && e !== '_astro') walk(p, `${rel}${e}/`); }
    else if (e === 'index.html') urls.push(`${site}/${rel}`);
  }
})(dist, '');
const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
writeFileSync(join(dist, 'sitemap-0.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
writeFileSync(join(dist, 'sitemap-index.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${site}/sitemap-0.xml</loc></sitemap>\n</sitemapindex>\n`);
console.log(`sitemap: ${urls.length} urls`);
