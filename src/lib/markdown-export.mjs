// The Markdown twin of each docs page, served at the page's path with ".md" in
// place of the trailing slash (src/pages/[...slug].md.ts). It is for agents and
// LLM tools, so it carries the page and nothing else: no front matter, no
// comments, no footer. Links to other pages point at their Markdown twins.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Next to this file when run from source (tests, the Markdown plugin); from the
// repo root when Vite has bundled it into the build's chunks.
const HERE = fileURLToPath(new URL('../content/docs/', import.meta.url));
const DOCS = existsSync(HERE) ? HERE : join(process.cwd(), 'src/content/docs/');

// True when a site path is a docs page, or is not a docs-page-shaped path at
// all (a segment root, an asset): only a page-shaped path with no page behind
// it is false. The pendingLinks plugin renders such a link as plain text.
export const exists = (path) => {
  const p = path.replace(/^\/|\/$/g, '');
  if (p === '') return true;
  // A section's own page is <section>/index.md (platform-iac/terraform).
  return existsSync(`${DOCS}${p}.md`) || existsSync(`${DOCS}${p}/index.md`) || !/^[a-z-]+(\/[a-z0-9-]+)+$/.test(p);
};

// Is this path a page with a Markdown twin? A segment root counts; the
// segment home's own path (<segment>/get-started/overview) is a redirect stub.
const isPage = (p) => p === '' || existsSync(`${DOCS}${p}.md`) || existsSync(`${DOCS}${p}/index.md`) || (!p.includes('/') && existsSync(`${DOCS}${p}`));

// "/" → "/index.md", "/a/b/" → "/a/b.md".
export const mdHref = (href) => (href === '/' ? '/index.md' : `${href.replace(/\/$/, '')}.md`);

const HOME = /^([a-z-]+)\/get-started\/overview$/;

// A root-relative page link's Markdown twin, or null to leave the link alone.
const twin = (href) => {
  const m = href.match(/^\/([a-z0-9/-]*?)\/?(#[^\s]*)?$/);
  if (!m) return null;
  const p = m[1];
  const hash = m[2] ?? '';
  const home = p.match(HOME);
  if (home && existsSync(`${DOCS}${p}.md`)) return `/${home[1]}.md${hash}`;
  return isPage(p) ? `${mdHref(`/${p}/`.replace(/^\/\/$/, '/'))}${hash}` : null;
};

const STATUS = {
  'in-development': 'Status: in development. Parts of this page are not in a published release yet.',
  planned: 'Status: planned. Nothing on this page works in a published release.',
};

// Rewrite one line of prose (not code). Inline code spans are set aside first,
// so a link inside one is left alone and link text may contain one.
const prose = (line) => {
  const spans = [];
  // Escape NULs before setting spans aside: the span marker is \0<index>\0,
  // so an input line that already contains that byte sequence would decode
  // as a missing span reference (spans[n] is undefined) or swallow a real
  // span. \x01 doubles and NUL becomes \x01\x02, prefix-free codes, so the
  // round trip is exact for any input.
  const esc = (s) => s.replace(/\x01|\0/g, (c) => (c === '\x01' ? '\x01\x01' : '\x01\x02'));
  const unesc = (s) => s.replace(/\x01(\x01|\x02)/g, (_, c) => (c === '\x01' ? '\x01' : '\0'));
  return unesc(
    esc(line)
      .replace(/`+[^`]*`+/g, (s) => `\0${spans.push(s) - 1}\0`)
      .replace(/(!?)\[([^\]]*)\]\((\/[^)\s]*)\)/g, (all, bang, text, href) => {
        if (bang) return all;
        if (!exists(href.split('#')[0])) return text;
        const t = twin(href);
        return t ? `[${text}](${t})` : all;
      })
      .replace(/^(\s*\[[^\]]+\]:\s*)(\/\S+)/, (all, lead, href) => {
        const t = exists(href.split('#')[0]) && twin(href);
        return t ? lead + t : all;
      })
      .replace(/\0(\d+)\0/g, (_, n) => spans[n]),
  );
};

// Split into prose and fenced code; only prose is rewritten.
export const transformBody = (body) => {
  const chunks = [];
  let fence = null;
  let cur = [];
  const flush = (code) => { if (cur.length) chunks.push({ code, text: cur.join('\n') }); cur = []; };
  for (const line of body.split('\n')) {
    const f = line.match(/^\s*(`{3,}|~{3,})/);
    if (!fence && f) { flush(false); fence = f[1]; cur.push(line); continue; }
    cur.push(line);
    if (fence && f && f[1][0] === fence[0] && f[1].length >= fence.length && !line.trim().slice(f[1].length).trim()) { flush(true); fence = null; }
  }
  flush(Boolean(fence));
  return chunks
    .map(({ code, text }) => (code ? text : text.replace(/<!--[\s\S]*?-->/g, '').split('\n').map((l) => prose(l).trimEnd()).join('\n')))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const toMarkdown = ({ title, description, status, body = '' }) =>
  [`# ${title}`, description, STATUS[status], transformBody(body)].filter(Boolean).join('\n\n') + '\n';
