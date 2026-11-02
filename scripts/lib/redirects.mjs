// redirects.mjs: read migration/redirects/*.tsv into the retired docs hosts'
// path maps. Shared by scripts/build-redirects.mjs and the migration tests.
//
// Each TSV is named <old-host>--<segment>.tsv and holds "<old path>\t<new path>"
// lines, one per URL of the old site's sitemap. A new path is a docs.vulnetix.com
// path, or an absolute https:// URL for a page that does not belong on the docs
// site (the old Pix site's terms of service, for example).

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

export const ROOT = new URL('../..', import.meta.url).pathname;
export const MAPS = join(ROOT, 'migration/redirects');
const SEGMENTS = join(ROOT, 'src/segments');

// Where an unmapped path on each retired host goes.
export const FALLBACK = {
  'docs.cli.vulnetix.com': '/cli/',
  'docs.guardrails.vulnetix.com': '/ai-firewall/',
  'docs.mcp.vulnetix.com': '/mcp-server/',
  'ai-docs.vulnetix.com': '/pix/',
  'docs.code.vulnetix.com': '/vscode/',
};

// Hosts that serve another host's map. claude-docs.vdb.vulnetix.com was the
// Pix site's first name; it used to 301 to ai-docs.vulnetix.com, which then
// redirected again. Serving it from the same map makes that one hop.
export const ALIASES = {
  'claude-docs.vdb.vulnetix.com': 'ai-docs.vulnetix.com',
};

export const isAbsolute = (target) => /^https?:\/\//.test(target);

export function segmentHomes() {
  const homes = new Map([['software-factory/get-started/overview', 'software-factory']]);
  for (const f of readdirSync(SEGMENTS).filter((f) => f.endsWith('.json'))) {
    const s = JSON.parse(readFileSync(join(SEGMENTS, f), 'utf8'));
    homes.set(s.home, s.id);
  }
  return homes;
}

// A segment's home page is served at /<segment>/, not at its file path, so a
// target naming the home page by path is rewritten to the segment root.
export function canon(target, homes = segmentHomes()) {
  if (isAbsolute(target)) return target;
  const [path, frag] = target.split('#');
  const id = path.replace(/^\/|\/$/g, '');
  const p = homes.has(id) ? `/${homes.get(id)}/` : `/${id}/`;
  return frag ? `${p}#${frag}` : p;
}

export function key(path) {
  let p = path.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/';
  return p;
}

// Every row of every TSV, in file order: { file, line, host, from, to }.
export function readRows() {
  const rows = [];
  for (const f of readdirSync(MAPS).filter((f) => f.endsWith('.tsv')).sort()) {
    const host = basename(f).split('--')[0];
    for (const [i, line] of readFileSync(join(MAPS, f), 'utf8').split('\n').entries()) {
      if (!line.trim()) continue;
      const [from, to, extra] = line.split('\t');
      if (!from || !to || extra !== undefined) throw new Error(`${f}:${i + 1}: want "<old>\\t<new>"`);
      rows.push({ file: f, line: i + 1, host, from, to });
    }
  }
  return rows;
}

// { host: { oldPath: newPath } }. Throws on a host without a fallback and on an
// old path mapped to two different targets.
export function loadRedirects() {
  const homes = segmentHomes();
  const map = {};
  for (const r of readRows()) {
    if (!FALLBACK[r.host]) throw new Error(`${r.file}: no fallback for host ${r.host}`);
    map[r.host] ??= {};
    const k = key(r.from);
    const v = canon(r.to, homes);
    if (map[r.host][k] && map[r.host][k] !== v) throw new Error(`${r.file}:${r.line}: ${r.host}${k} maps to both ${map[r.host][k]} and ${v}`);
    map[r.host][k] = v;
  }
  for (const [alias, host] of Object.entries(ALIASES)) {
    if (!map[host]) throw new Error(`alias ${alias}: no map for ${host}`);
  }
  return map;
}
