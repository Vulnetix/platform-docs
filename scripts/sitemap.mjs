#!/usr/bin/env node
// sitemap.mjs: write dist/sitemap-index.xml and dist/sitemap-0.xml from the
// built HTML. (@astrojs/sitemap is not used: the package firewall does not
// carry the versions it needs.)
//
// <lastmod> is the page's <meta property="article:modified_time"> (front
// matter `updated`, see Doc.astro), else the date of the last commit to the
// page's source file, else left out: a wrong date is worse than none.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = 'https://docs.vulnetix.com';

// The page's own date, else its source file's last commit, else none.
export const lastmodFor = (html, gitDates) => {
  const meta = html.match(/<meta property="article:modified_time" content="(\d{4}-\d{2}-\d{2})"/);
  if (meta) return meta[1];
  // The source file, from the "Edit this page" link; the home page has none.
  const src = html.match(/\/edit\/main\/(src\/content\/docs\/[^"]+\.md)"/)?.[1] ?? (html.includes('<link rel="canonical" href="https://docs.vulnetix.com/">') ? 'src/pages/index.astro' : null);
  return (src && gitDates.get(src)) || null;
};

// Every file's last commit date, from one `git log` pass. Empty when there is
// no history (a shallow clone), so those pages simply get no <lastmod>.
export const gitDates = (cwd = process.cwd()) => {
  const dates = new Map();
  let out = '';
  try {
    if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd, encoding: 'utf8' }).trim() === 'true') return dates;
    out = execFileSync('git', ['log', '--format=@%cs', '--name-only', '--', 'src/content/docs', 'src/pages/index.astro'], { cwd, encoding: 'utf8', maxBuffer: 256 << 20 });
  } catch {
    return dates;
  }
  let date = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('@')) date = line.slice(1);
    else if (line && date && !dates.has(line)) dates.set(line, date); // newest first
  }
  return dates;
};

export const sitemapXml = (entries) => {
  const body = entries.map(({ loc, lastmod }) => `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};

export const indexXml = () => `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemap>\n</sitemapindex>\n`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dist = process.argv[2] ?? 'dist';
  const dates = gitDates();
  const entries = [];
  (function walk(dir, rel) {
    for (const e of readdirSync(dir).sort()) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { if (e !== 'pagefind' && e !== '_astro') walk(p, `${rel}${e}/`); }
      else if (e === 'index.html') {
        const html = readFileSync(p, 'utf8');
        // A moved page is a meta-refresh stub (astro.config.mjs redirects): not a page.
        if (!html.includes('http-equiv="refresh"')) entries.push({ loc: `${SITE}/${rel}`, lastmod: lastmodFor(html, dates) });
      }
    }
  })(dist, '');
  writeFileSync(join(dist, 'sitemap-0.xml'), sitemapXml(entries));
  writeFileSync(join(dist, 'sitemap-index.xml'), indexXml());
  console.log(`sitemap: ${entries.length} urls, ${entries.filter((e) => e.lastmod).length} with lastmod`);
}
