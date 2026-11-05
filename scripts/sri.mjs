#!/usr/bin/env node
// sri.mjs: subresource integrity for the built site, run after Pagefind and
// the sitemap (`yarn build`).
//
//   node scripts/sri.mjs dist          write
//   node scripts/sri.mjs --check dist  verify; exits 1 on any gap or mismatch
//
// On every page it
//   - adds integrity="sha384-…" to each same-origin <link rel="stylesheet">,
//     <link rel="preload"> and <script src>, from the built file's bytes;
//   - writes an import map whose `integrity` entry pins /pagefind/pagefind.js,
//     which the search dialog loads with a dynamic import (import maps are the
//     only way to give a dynamic import a digest);
//   - adds the import map's sha256 to the page's Content-Security-Policy
//     script-src (Astro hashed the inline code before the map existed), and
//     moves that <meta> up to follow <meta charset>, so it governs the whole
//     page.
// Not covered: Pagefind's index and fragment files, which it fetches.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PAGEFIND = '/pagefind/pagefind.js';
const ATTR = String.raw`(?:\s+[^\s=>"'/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*`;
// One pass over the markup: scripts and styles with their bodies, then any
// other tag. Quoted attribute values are consumed whole, so a "<script" in an
// attribute (a meta description) is never read as a tag.
const TOKENS = new RegExp(String.raw`<script(${ATTR})\s*>([\s\S]*?)</script>|<style(${ATTR})\s*>([\s\S]*?)</style>|<(link|meta)(${ATTR})\s*/?>`, 'gi');

export const digest = (algo, bytes) => `${algo}-${createHash(algo).update(bytes).digest('base64')}`;
const attr = (attrs, name) => attrs.match(new RegExp(String.raw`\s${name}\s*=\s*"([^"]*)"`, 'i'))?.[1];
const sameOrigin = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');
const CSP = /<meta http-equiv="content-security-policy" content="([^"]*)">/i;

// The tags that need integrity, inline scripts and styles, and the CSP.
export const scan = (html) => {
  const out = { refs: [], scripts: [], styles: [], importMap: null };
  for (const m of html.matchAll(TOKENS)) {
    if (m[0].toLowerCase().startsWith('<script')) {
      const src = attr(m[1], 'src');
      // The opening tag only: the attribute goes there, not after </script>.
      const open = m[0].slice(0, m[0].length - m[2].length - '</script>'.length);
      if (src !== undefined) { if (sameOrigin(src)) out.refs.push({ tag: open, url: src, integrity: attr(m[1], 'integrity') }); }
      else if (attr(m[1], 'type') === 'importmap') out.importMap = { tag: m[0], body: m[2] };
      else out.scripts.push(m[2]);
    } else if (m[0].toLowerCase().startsWith('<style')) out.styles.push(m[4]);
    else if (m[5].toLowerCase() === 'link') {
      const rel = attr(m[6], 'rel');
      const href = attr(m[6], 'href');
      if ((rel === 'stylesheet' || rel === 'preload') && sameOrigin(href)) out.refs.push({ tag: m[0], url: href, integrity: attr(m[6], 'integrity') });
    }
  }
  out.csp = html.match(CSP)?.[1] ?? null;
  return out;
};

// sha384 of a site file, or null when it is not in dist. `hash(url)` is passed
// in so one cache serves every page.
const withIntegrity = (tag, value) => tag.replace(/\s*\/?>$/, (end) => ` integrity="${value}"${end}`);

export const importMapFor = (pagefindIntegrity) => `<script type="importmap">${JSON.stringify({ imports: {}, integrity: { [PAGEFIND]: pagefindIntegrity } })}</script>`;

// A directive's sources, exactly: script-src, not script-src-attr.
const directiveRe = (name) => new RegExp(String.raw`((?:^|;)\s*${name})(?=\s|;|$)([^;]*)`);
export const directive = (csp, name) => csp.match(directiveRe(name))?.[2] ?? '';
export const addSource = (csp, name, source) =>
  directiveRe(name).test(csp) ? csp.replace(directiveRe(name), (all, head, rest) => (rest.split(/\s+/).includes(source) ? all : `${head}${rest} ${source}`)) : csp;

export const processHtml = (html, hash) => {
  const s = scan(html);
  let out = html;
  for (const r of s.refs) {
    const value = hash(r.url);
    if (value && r.integrity !== value) out = out.replace(r.tag, () => withIntegrity(r.tag.replace(/\sintegrity="[^"]*"/i, ''), value));
  }
  // The import map, once per page, only on pages that load the search script.
  const pf = hash(PAGEFIND);
  if (pf && !s.importMap && html.includes(PAGEFIND)) out = out.replace(/<meta charset="utf-8">/i, (c) => c + importMapFor(pf));
  // Hash every inline script and style into the policy. Astro hashes the
  // scripts it bundles, not `is:inline` ones (the theme script) or the map.
  const now = scan(out);
  if (now.csp !== null) {
    let csp = now.csp;
    for (const body of [...now.scripts, ...(now.importMap ? [now.importMap.body] : [])]) csp = addSource(csp, 'script-src', `'${digest('sha256', body)}'`);
    for (const body of now.styles) csp = addSource(csp, 'style-src', `'${digest('sha256', body)}'`);
    out = out.replace(CSP, (m) => m.replace(now.csp, () => csp));
  }
  // The policy first, so it governs every script after it.
  const meta = out.match(CSP)?.[0];
  if (meta) out = out.replace(meta, '').replace(/<meta charset="utf-8">/i, (c) => c + meta);
  return out;
};

// Every gap or mismatch on one page, as text.
export const problems = (html, hash) => {
  const s = scan(html);
  const errs = [];
  for (const r of s.refs) {
    const want = hash(r.url);
    if (!want) errs.push(`${r.url}: not in the build`);
    else if (!r.integrity) errs.push(`${r.url}: no integrity`);
    else if (r.integrity !== want) errs.push(`${r.url}: integrity does not match the file`);
  }
  if (s.importMap) {
    let map = null;
    try { map = JSON.parse(s.importMap.body); } catch { errs.push('import map is not JSON'); }
    for (const [url, value] of Object.entries(map?.integrity ?? {})) if (hash(url) !== value) errs.push(`import map: ${url} does not match the file`);
  } else if (hash(PAGEFIND) && html.includes(PAGEFIND)) errs.push(`no import map pinning ${PAGEFIND}`);
  if (s.csp !== null) {
    const scriptSrc = directive(s.csp, 'script-src');
    const styleSrc = directive(s.csp, 'style-src');
    for (const body of [...s.scripts, ...(s.importMap ? [s.importMap.body] : [])]) if (!scriptSrc.includes(`'${digest('sha256', body)}'`)) errs.push('an inline script is not in the CSP');
    for (const body of s.styles) if (!styleSrc.includes(`'${digest('sha256', body)}'`)) errs.push('an inline style is not in the CSP');
    if (!/^<meta charset="utf-8"><meta http-equiv="content-security-policy"/i.test(html.slice(html.search(/<meta charset/i)))) errs.push('the CSP does not follow <meta charset>');
  }
  return errs;
};

const pages = (dir) => readdirSync(dir).flatMap((e) => {
  const p = join(dir, e);
  return statSync(p).isDirectory() ? pages(p) : e.endsWith('.html') ? [p] : [];
});

export const hasher = (dist) => {
  const cache = new Map();
  return (url) => {
    const clean = decodeURIComponent(url.split(/[?#]/)[0]);
    if (!cache.has(clean)) {
      const p = join(dist, clean);
      cache.set(clean, existsSync(p) && statSync(p).isFile() ? digest('sha384', readFileSync(p)) : null);
    }
    return cache.get(clean);
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  const dist = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'dist';
  const hash = hasher(dist);
  let failures = 0;
  let files = 0;
  for (const file of pages(dist)) {
    const html = readFileSync(file, 'utf8');
    // A meta-refresh stub loads nothing.
    if (html.includes('http-equiv="refresh"')) continue;
    files++;
    if (check) {
      for (const e of problems(html, hash)) { console.error(`${file.slice(dist.length)}: ${e}`); failures++; }
    } else {
      const out = processHtml(html, hash);
      if (out !== html) writeFileSync(file, out);
    }
  }
  if (failures) { console.error(`sri: ${failures} problem(s)`); process.exit(1); }
  console.log(`sri: ${files} pages ${check ? 'verified' : 'written'}`);
}
