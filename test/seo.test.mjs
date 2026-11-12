import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoDate } from '../src/lib/dates.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gitDates, indexXml, lastmodFor, sitemapXml } from '../scripts/sitemap.mjs';
import { homeMarkdown, llmsTxt } from '../src/lib/site-index.mjs';
import { hidingGitEnv } from './env.mjs';

test('isoDate reads front matter dates and refuses anything else', () => {
  assert.equal(isoDate('05 Nov 2026'), '2026-11-05');
  assert.equal(isoDate('5 Nov 2026'), '2026-11-05');
  assert.equal(isoDate('28 October 2026'), '2026-10-28');
  for (const bad of [undefined, '', '2026-11-05', '31 Feb 2026', '05 Foo 2026', 'yesterday']) assert.equal(isoDate(bad), null, String(bad));
});

const page = (extra) => `<html><head><meta charset="utf-8">${extra}</head><body><a href="https://github.com/Vulnetix/platform-docs/edit/main/src/content/docs/cli/x.md">Edit this page</a></body></html>`;

test('lastmod is the page date, else the source file’s last commit, else none', () => {
  const git = new Map([['src/content/docs/cli/x.md', '2026-10-01'], ['src/pages/index.astro', '2026-09-09']]);
  assert.equal(lastmodFor(page('<meta property="article:modified_time" content="2026-11-05">'), git), '2026-11-05');
  assert.equal(lastmodFor(page(''), git), '2026-10-01');
  assert.equal(lastmodFor(page(''), new Map()), null);
  assert.equal(lastmodFor('<link rel="canonical" href="https://docs.vulnetix.com/">', git), '2026-09-09');
});

test('a sitemap entry carries <lastmod> only when there is a date', () => {
  const xml = sitemapXml([{ loc: 'https://docs.vulnetix.com/a/', lastmod: '2026-11-05' }, { loc: 'https://docs.vulnetix.com/b/', lastmod: null }]);
  assert.match(xml, /<url><loc>https:\/\/docs\.vulnetix\.com\/a\/<\/loc><lastmod>2026-11-05<\/lastmod><\/url>/);
  assert.match(xml, /<url><loc>https:\/\/docs\.vulnetix\.com\/b\/<\/loc><\/url>/);
});

// Characterisation test: the current sitemapXml() output is the oracle.
test('sitemap XML document envelope: prolog, urlset xmlns, entry order, trailing newline', () => {
  assert.equal(
    sitemapXml([{ loc: 'https://docs.vulnetix.com/a/', lastmod: '2026-11-05' }, { loc: 'https://docs.vulnetix.com/b/', lastmod: null }]),
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + '  <url><loc>https://docs.vulnetix.com/a/</loc><lastmod>2026-11-05</lastmod></url>\n'
    + '  <url><loc>https://docs.vulnetix.com/b/</loc></url>\n'
    + '</urlset>\n',
  );
});

// Characterisation test: the current indexXml() output is the oracle. The CLI
// block in scripts/sitemap.mjs writes it to dist/sitemap-index.xml.
test('sitemap index wrapper: prolog, sitemapindex xmlns, one sitemap entry, trailing newline', () => {
  assert.equal(
    indexXml(),
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + '  <sitemap><loc>https://docs.vulnetix.com/sitemap-0.xml</loc></sitemap>\n'
    + '</sitemapindex>\n',
  );
});

const groups = [{
  title: 'Scanners',
  segments: [{ title: 'SCA', summary: 'Dependencies.', href: '/sca/', sections: [{ title: 'Get started', href: '/sca/' }, { title: 'Reference', href: '/sca/reference/flags/' }] }],
}];

test('llms.txt is the llmstxt.org shape, every link absolute and to a Markdown twin', () => {
  const txt = llmsTxt(groups);
  assert.match(txt, /^# Vulnetix documentation\n\n> /);
  assert.match(txt, /\n## Scanners\n\n- \[SCA\]\(https:\/\/docs\.vulnetix\.com\/sca\.md\): Dependencies\.\n {2}- \[Get started\]/);
  const links = [...txt.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  assert.equal(links.length, 3);
  for (const l of links) assert.match(l, /^https:\/\/docs\.vulnetix\.com\/.+\.md$/);
});

test('index.md lists the same products with root-relative twin links', () => {
  const md = homeMarkdown(groups);
  assert.match(md, /- \[SCA\]\(\/sca\.md\): Dependencies\./);
  assert.ok(!md.includes('https://docs.vulnetix.com'));
});

test('with no git history the fallback dates are empty, so those pages get no <lastmod>', () => {
  const dir = mkdtempSync(join(tmpdir(), 'no-git-'));
  try {
    // Hide every GIT_* var so the bare tmpdir stays bare.
    const dates = hidingGitEnv(() => gitDates(dir));
    assert.equal(dates.size, 0);
    assert.equal(lastmodFor(page(''), dates), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the git fallback reads each docs file’s newest commit date', () => {
  const dates = gitDates();
  if (!dates.size) return; // a shallow clone: covered by the test above
  assert.match(dates.get('src/content/docs/cli/get-started/install.md') ?? '', /^\d{4}-\d{2}-\d{2}$/);
});
