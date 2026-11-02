#!/usr/bin/env node
// inventory-scan.mjs: list every Software Factory feature surface in the code,
// and the CLI's commands, the Platform IaC kinds and config routes, and
// Guardian's console API routes.
//
// Reads sibling checkouts of the source repositories and writes
// inventory/atoms.json: one "atom" per thing a user can touch (an API route, a
// console page, a settings key, an enum value, a CLI flag, a TUI command, a
// voice tool, a handler file...). inventory-check.mjs then proves that every
// atom is mapped to a feature in inventory/features.json and that the feature
// has a page.
//
// The scan is regex-based on purpose: no Go or TS toolchain is needed, and
// every pattern below names the file it reads so a miss is easy to trace.
//
// Usage: node scripts/inventory-scan.mjs [--out inventory/atoms.json]
// Repo paths default to ../<name>; override with SF_SRC_<NAME>=/path.

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, dirname, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { settingSpec, goSubcommands } from './lib/go-source.mjs';
import { cobraTree } from './lib/cobra.mjs';

const root = new URL('..', import.meta.url).pathname;
const repoPath = (name) => process.env[`SF_SRC_${name.toUpperCase().replace(/-/g, '_')}`] ?? join(root, '..', name);
// The first four feed the Software Factory segment; the rest feed the CLI,
// Platform IaC and Guardian (SIEM) coverage checks.
const REPOS = ['vdb-site', 'website', 'belai', 'saas', 'cli', 'config-schemas', 'siem'];

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(root, 'inventory', 'atoms.json');

const atoms = new Map();
function atom(kind, value, repo, file, extra = {}) {
  const id = `${kind}:${value}`;
  if (!atoms.has(id)) { const { detail, ...rest } = extra; atoms.set(id, { id, kind, value, sources: [], ...rest }); }
  const a = atoms.get(id);
  if (extra.detail) a.detail = { ...extra.detail, ...(a.detail ?? {}) };
  const src = `${repo}/${file}`;
  if (!a.sources.includes(src)) a.sources.push(src);
}

const read = (p) => readFileSync(p, 'utf8');
const isTest = (f) => /(_test\.go|\.test\.ts|\.spec\.ts|\.test\.mjs)$/.test(f);
function ls(dir, re) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => re.test(f) && !isTest(f)).sort();
}
function walk(dir, re, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'testdata' || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, re, acc);
    else if (re.test(e) && !isTest(e)) acc.push(p);
  }
  return acc;
}
function headSha(repo) {
  try { return execFileSync('git', ['-C', repoPath(repo), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; }
}

// ---------------------------------------------------------------------------
// vdb-site: chi routes. main.go nests r.Route groups and calls Register*
// functions; handler files declare Register* functions with relative routes.
// Brace depth tracks which group a route sits in.
const SF_HANDLER = /^(Factory|Belai|Pix|InternalPixCommander|Call|Sandbox|IntegrationForge|ForgeWebhook)/;
const SF_PATH = /^\/v1\/(factory|belai|internal\/(factory|pix-commander|decisions)|admin\/pix-sandboxes|signing|pulls|push|notifications|messaging|pix-call|ai-firewall\/(hold|capabilities\/review)|integrations\/forges|webhooks\/\{kind\})(\/|-|$)/;

function scanGoRoutes() {
  const api = join(repoPath('vdb-site'), 'api');
  const files = [join(api, 'main.go'), ...ls(join(api, 'internal', 'handler'), /\.go$/).map((f) => join(api, 'internal', 'handler', f))];
  const funcs = new Map(); // Register fn -> { routes: [{method, path, handler, file}], calls: [{fn, prefix}] }
  const top = { routes: [], calls: [] };
  for (const file of files) {
    const rel = relative(repoPath('vdb-site'), file);
    const lines = read(file).split('\n');
    let depth = 0;
    let ctx = file.endsWith('main.go') ? top : null;
    let ctxDepth = -1;
    const stack = [];
    for (const raw of lines) {
      const line = raw.replace(/"(?:[^"\\]|\\.)*"|`[^`]*`|\/\/.*$/g, (m) => (m.startsWith('/') && m.startsWith('//') ? '' : m.replace(/[{}]/g, '')));
      const fn = raw.match(/^func (?:\([^)]*\) )?(\w+)\(r chi\.Router/);
      if (fn) { ctx = { routes: [], calls: [] }; funcs.set(/^Register/.test(fn[1]) ? fn[1] : `${rel}:${fn[1]}`, ctx); ctxDepth = depth; stack.length = 0; }
      const prefix = stack.map((s) => s.p).join('');
      // A commented-out call is not a route: main.go explains "Flat paths, not
      // r.Route("/config")" in a comment, which would otherwise open a group.
      const code = /^\s*\/\//.test(raw) ? '' : raw;
      const route = code.match(/\br\.Route\("([^"]+)"/);
      const m = code.match(/\br\.(Get|Post|Put|Patch|Delete|Head|Options)\("([^"]+)",\s*(?:handler\.)?(\w+)/);
      const call = code.match(/\b(?:handler\.)?(Register\w+)\(r,/);
      const local = code.match(/\.(\w+)\(r\)\s*$/);
      if (ctx && m) ctx.routes.push({ method: m[1].toUpperCase(), path: prefix + m[2], handler: m[3], file: rel });
      if (ctx && call && !raw.match(/^func /)) ctx.calls.push({ fn: call[1], prefix });
      if (ctx && local && !raw.match(/^func /)) ctx.calls.push({ fn: `${rel}:${local[1]}`, prefix });
      const opens = (line.match(/{/g) || []).length;
      const closes = (line.match(/}/g) || []).length;
      if (route) stack.push({ p: route[1], d: depth + opens - closes });
      depth += opens - closes;
      while (stack.length && depth < stack[stack.length - 1].d) stack.pop();
      if (ctx && ctx !== top && depth <= ctxDepth) { ctx = file.endsWith('main.go') ? top : null; }
    }
  }
  const resolved = [];
  const visit = (node, prefix, seen) => {
    for (const r of node.routes) resolved.push({ ...r, path: prefix + r.path });
    for (const c of node.calls) {
      const f = funcs.get(c.fn);
      if (f && !seen.has(c.fn)) visit(f, prefix + c.prefix, new Set([...seen, c.fn]));
    }
  };
  visit(top, '', new Set());
  for (const r of resolved) {
    if (SF_PATH.test(r.path) || SF_HANDLER.test(r.handler)) atom('route', `${r.method} ${r.path}`, 'vdb-site', r.file, { handler: r.handler });
    // Platform IaC: the config engine's routes (plan, apply, export, objects,
    // management tokens) and the public site config next to them.
    else if (/^\/v1\/config(\/|$)/.test(r.path)) atom('config-route', `${r.method} ${r.path}`, 'vdb-site', r.file, { handler: r.handler });
  }
}

// vdb-site: every SF handler file, so a new file is never silently skipped.
function scanGoFiles() {
  const dir = join(repoPath('vdb-site'), 'api', 'internal', 'handler');
  for (const f of ls(dir, /^(factory|belai|pix|signing|pulls|notify|push|messaging|ai_firewall_hold|forge)[_.].*\.go$|^notify\.go$/)) atom('gofile', f.replace(/\.go$/, ''), 'vdb-site', `api/internal/handler/${f}`);
  for (const pkg of ['systemone', 'facts', 'lifecycle', 'tenantmodel', 'forge', 'forgecap']) {
    const d = join(repoPath('vdb-site'), 'api', 'internal', pkg);
    for (const f of ls(d, /\.go$/)) atom('gofile', `${pkg}/${f.replace(/\.go$/, '')}`, 'vdb-site', `api/internal/${pkg}/${f}`);
  }
}

// vdb-site: settings schema, enum literals, validation codes, templates, defaults.
function scanGoSemantics() {
  const dir = join(repoPath('vdb-site'), 'api', 'internal', 'handler');
  // Settings: the schema is factory_settings_store.go, and some sections are
  // built by helpers in other files (agents, defaults, delivery), so every
  // factory file is read for spec literals.
  for (const sf of ls(dir, /^factory_.*\.go$/)) {
    const src = read(join(dir, sf));
    const file = `api/internal/handler/${sf}`;
    const isStore = sf === 'factory_settings_store.go';
    if (!isStore && !/fcSetSpec|fc(?:Enum|Bool|Dur)Spec\(/.test(src)) continue;
    for (const line of src.split('\n')) {
      let m;
      if ((m = line.match(/fcEnumSpec\("([\w.]+)", "([^"]*)", "(\w+)"((?:, "[^"]*")*)\)/))) {
        atom('setting', m[1], 'vdb-site', file, { detail: { type: 'enum', default: m[2], store: m[3], values: [...m[4].matchAll(/"([^"]*)"/g)].map((x) => x[1]) } });
      } else if ((m = line.match(/fcBoolSpec\("([\w.]+)", (true|false)\)/))) {
        atom('setting', m[1], 'vdb-site', file, { detail: { type: 'bool', default: m[2], store: 'factory' } });
      } else if ((m = line.match(/fcDurSpec\("([\w.]+)", "([^"]*)"\)/))) {
        atom('setting', m[1], 'vdb-site', file, { detail: { type: 'duration', default: m[2], store: 'factory' } });
      } else if ((m = line.match(/\{Key: "([\w.]+)", Kind: fcK(\w+)(.*)\}/))) {
        const d = { type: m[2].toLowerCase(), ...settingSpec(m[3]) };
        atom('setting', m[1], 'vdb-site', file, { detail: d });
      } else if (isStore && /fdSettingSpecs\(\)/.test(line)) {
        // The defaults' switches are built in a loop: defaults.<key>.enabled.
        const dsrc = read(join(dir, 'factory_defaults.go'));
        const keys = dsrc.match(/factoryDefaultKeys = \[\]string\{([^}]*)\}/);
        atom('setting', 'defaults.enabled', 'vdb-site', 'api/internal/handler/factory_defaults.go', { detail: { type: 'bool', default: 'true', store: 'factory' } });
        for (const k of keys ? keys[1].matchAll(/"([a-z-]+)"/g) : []) atom('setting', `defaults.${k[1]}.enabled`, 'vdb-site', 'api/internal/handler/factory_defaults.go', { detail: { type: 'bool', default: 'true', store: 'factory' } });
      } else if (isStore) {
        for (const k of line.matchAll(/(?:\bKey:\s*|\bfc\w*Spec\()"([a-zA-Z][\w]*(?:\.[\w]+)+)"/g)) atom('setting', k[1], 'vdb-site', file);
      }
    }
  }
  for (const f of ls(dir, /^(factory|belai|pix)_.*\.go$/)) {
    const rel = `api/internal/handler/${f}`;
    const src = read(join(dir, f));
    // Validation and API error codes: v.add(path, "code", ...) and Code: "code".
    for (const m of src.matchAll(/\bv\.add\([^,]+,\s*"([a-z][a-z0-9_]+)"(?:,\s*(?:fmt\.Sprintf\()?(?:"((?:[^"\\]|\\.)*)"|`([^`]*)`))?/g)) atom('code', m[1], 'vdb-site', rel, { detail: (m[2] ?? m[3]) ? { message: (m[2] ?? m[3]).replace(/\\"/g, '"') } : undefined });
    for (const m of src.matchAll(/\bCode:\s*"([a-z][a-z0-9_]+)"(?:,\s*Message:\s*"((?:[^"\\]|\\.)*)")?/g)) atom('code', m[1], 'vdb-site', rel, { detail: m[2] ? { message: m[2].replace(/\\"/g, '"') } : undefined });
    // Named string sets: var factoryX = []string{...} / map[string]bool{...}.
    for (const m of src.matchAll(/\b(?:var\s+)?((?:factory|belai|fw|fc|pix)\w*)\s*=\s*(?:\[\]string|map\[string\](?:bool|struct\{\}|string))\{([^}]*)\}/g)) {
      const values = [...m[2].matchAll(/"([a-z][a-z0-9_:.\-]*)"\s*(?::|,|$)/g)].map((x) => x[1]);
      if (values.length < 2) continue;
      for (const v of values) atom('enum', `${m[1]}=${v}`, 'vdb-site', rel, { set: m[1] });
    }
  }
  // Delivery settings built in loops over the role, decision-kind and source
  // tables of factory_delivery_settings.go.
  const ds = join(dir, 'factory_delivery_settings.go');
  if (existsSync(ds)) {
    const src = read(ds);
    const file = 'api/internal/handler/factory_delivery_settings.go';
    const table = (name) => { const i = src.indexOf(`var ${name} = `); return i < 0 ? '' : src.slice(i, src.indexOf('\n}', i)); };
    for (const m of table('fdRoleDefaults').matchAll(/\{"([a-z]+)", ([\d.]+), ([\d.]+)\}/g)) {
      atom('setting', `delivery.roles.${m[1]}.enabled`, 'vdb-site', file, { detail: { type: 'bool', default: 'true', store: 'factory' } });
      atom('setting', `delivery.roles.${m[1]}.rate`, 'vdb-site', file, { detail: { type: 'num', min: '0', max: '10000', default: m[2], store: 'factory' } });
      atom('setting', `delivery.roles.${m[1]}.mult`, 'vdb-site', file, { detail: { type: 'num', min: '0.5', max: '10', default: m[3], store: 'factory' } });
    }
    for (const m of table('fdKindDefaults').matchAll(/\{"([a-z]+)", (true|false), ([\d.]+)\}/g)) {
      atom('setting', `delivery.kinds.${m[1]}.enabled`, 'vdb-site', file, { detail: { type: 'bool', default: m[2], store: 'factory' } });
      atom('setting', `delivery.kinds.${m[1]}.minutes`, 'vdb-site', file, { detail: { type: 'num', min: '0', max: '480', default: m[3], store: 'factory' } });
    }
    const so = src.match(/var fdSourceOrder = \[\]string\{([^}]*)\}/);
    for (const m of so ? so[1].matchAll(/"([a-z]+)"/g) : []) atom('setting', `delivery.sources.${m[1]}`, 'vdb-site', file, { detail: { type: 'bool', default: 'true', store: 'factory' } });
  }
  // Webhook trigger events and their actions: factoryWebhookActions.
  const trig = join(dir, 'factory_trigger_conditions.go');
  if (existsSync(trig)) {
    const src = read(trig);
    const start = src.indexOf('factoryWebhookActions = map[string][]string{');
    const body = start >= 0 ? src.slice(start, src.indexOf('\n\t}', start)) : '';
    for (const m of body.matchAll(/^\s+"([a-z_]+)":\s+\{([^}]*)\},/gm)) {
      atom('webhook-event', m[1], 'vdb-site', 'api/internal/handler/factory_trigger_conditions.go');
      for (const a of m[2].matchAll(/"([a-z_]+)"/g)) atom('webhook-event', `${m[1]}.${a[1]}`, 'vdb-site', 'api/internal/handler/factory_trigger_conditions.go');
    }
  }
  // sf: labels shipped to repositories: {label, subject, description, agent, ...}.
  const labels = join(dir, 'factory_labels.go');
  if (existsSync(labels)) for (const m of read(labels).matchAll(/\{"(sf:[a-z0-9-]+)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"/g)) atom('sf-label', m[1], 'vdb-site', 'api/internal/handler/factory_labels.go', { detail: { on: m[2], description: m[3], agent: m[4] } });
  // Templates: every factory_templates*.go. A template literal names its
  // Category right after its ID, which keeps node IDs inside graphs out.
  for (const tf of ls(dir, /^factory_templates.*\.go$/)) for (const m of read(join(dir, tf)).matchAll(/\bID:\s*"([a-z0-9-]+)",\s*Category:\s*"([^"]*)"(?:,\s*Name:\s*"([^"]*)")?/g)) atom('template', m[1], 'vdb-site', `api/internal/handler/${tf}`, { detail: { category: m[2], name: m[3] } });
  for (const f of ls(dir, /^factory_defaults.*\.go$/)) {
    for (const m of read(join(dir, f)).matchAll(/\b(?:Slug|ID|Key):\s*"([a-z0-9-]+)"(?:,\s*Name:\s*"([^"]*)")?(?:,\s*Rev:\s*\d+)?(?:,\s*MinAutonomy:\s*"([^"]*)")?/g)) atom('default', m[1], 'vdb-site', `api/internal/handler/${f}`, { detail: { name: m[2], minAutonomy: m[3] } });
  }
}

// vdb-site docs: the contract's settings table (2.15) as a cross-check of the
// Go schema, and every factory/belai doc so a new doc is a new todo.
function scanContract() {
  const docs = join(repoPath('vdb-site'), 'docs');
  const md = join(docs, 'factory.md');
  if (existsSync(md)) {
    const src = read(md);
    const s = src.indexOf('### 2.15');
    const e = src.indexOf('### 2.16');
    if (s > 0 && e > s) for (const m of src.slice(s, e).matchAll(/^\| `([a-zA-Z][\w]*(?:\.[\w-]+)+)` \| (.*?) \| (.*?) \| (\w+) \|$/gm)) atom('setting', m[1], 'vdb-site', 'docs/factory.md', { detail: { doc: m[2], docDefault: m[3], store: m[4] } });
  }
  for (const f of ls(docs, /^(factory|belai|pix|signing|forge).*\.md$/)) atom('doc', `vdb-site/${f}`, 'vdb-site', `docs/${f}`);
}

// website: console routes, call worker voice tools, contract notes.
function scanWebsite() {
  const w = repoPath('website');
  for (const f of ls(join(w, 'src', 'pages', 'resolve'), /^(factory|belai)-.*\.vue$/)) atom('console', `/resolve/${f.replace(/\.vue$/, '')}`, 'website', `src/pages/resolve/${f}`);
  if (existsSync(join(w, 'src', 'pages', 'call.vue'))) atom('console', '/call', 'website', 'src/pages/call.vue');
  const tools = join(w, 'src', 'worker', 'call', 'tools.ts');
  if (existsSync(tools)) for (const m of read(tools).matchAll(/spec:\s*fn\(`([a-z_]+)`(?:,\s*`([^`]*)`)?/g)) atom('voice-tool', m[1], 'website', 'src/worker/call/tools.ts', { detail: m[2] ? { description: m[2] } : undefined });
  for (const f of ls(join(w, '.repo'), /^(software-factory|factory|pix|a2a|conflict|commit-signing|session-trigger|tenant-model|belai|forge).*\.md$/)) atom('doc', `website/${f}`, 'website', `.repo/${f}`);
  for (const f of ls(join(w, 'sandbox-worker', 'docs'), /\.md$/)) atom('doc', `website/sandbox-worker/${f}`, 'website', `sandbox-worker/docs/${f}`);
  for (const f of ls(join(w, 'src', 'worker', 'call'), /\.ts$/)) atom('tsfile', `call/${f.replace(/\.ts$/, '')}`, 'website', `src/worker/call/${f}`);
  for (const f of ls(join(w, 'sandbox-worker', 'src'), /\.ts$/)) atom('tsfile', `sandbox/${f.replace(/\.ts$/, '')}`, 'website', `sandbox-worker/src/${f}`);
}

// saas: Prisma models behind the factory.
function scanSaas() {
  const dir = join(repoPath('saas'), 'prisma', 'models');
  for (const f of ls(dir, /^factory.*\.prisma$/)) {
    for (const m of read(join(dir, f)).matchAll(/^model (\w+) \{/gm)) atom('model', m[1], 'saas', `prisma/models/${f}`);
  }
}

// belai: CLI commands and flags, TUI slash commands and keys, packages, docs.
function scanBelai() {
  const b = repoPath('belai');
  const cmd = join(b, 'cmd', 'belai');
  const help = join(cmd, 'help.go');
  if (existsSync(help)) {
    for (const m of read(help).matchAll(/^\s*\{"([a-z][a-z0-9-]*)", "[^"]*"\},/gm)) atom('cli-cmd', m[1], 'belai', 'cmd/belai/help.go');
  }
  for (const f of ls(cmd, /\.go$/)) {
    const src = read(join(cmd, f));
    // Subcommands are switch cases on the first argument: case "add":.
    for (const sub of goSubcommands(f, src)) atom('cli-sub', sub, 'belai', `cmd/belai/${f}`);
    let set = 'belai';
    for (const line of src.split('\n')) {
      const fs = line.match(/flag\.NewFlagSet\("([^"]+)"/);
      if (fs) set = fs[1];
      if (/^func main\(\)/.test(line)) set = 'belai';
      for (const m of line.matchAll(/\b\w+\.(?:String|Bool|Int|Int64|Uint|Float64|Duration|StringVar|BoolVar|IntVar|Int64Var|DurationVar|Float64Var|Var|Func|BoolFunc|TextVar)\((?:&?[\w.]+,\s*)?"([a-z][a-z0-9-]*)",\s*(?:("(?:[^"\\]|\\.)*"|[^,]+),\s*)?"((?:[^"\\]|\\.)*)"/g)) {
        atom('cli-flag', `${set} -${m[1]}`, 'belai', `cmd/belai/${f}`, { detail: { default: m[2]?.replace(/^"|"$/g, ''), usage: m[3]?.replace(/\\"/g, '"') } });
      }
      for (const m of line.matchAll(/\b\w+\.(?:String|Bool|Int|Int64|Uint|Float64|Duration|StringVar|BoolVar|IntVar|Int64Var|DurationVar|Float64Var|Var|Func|BoolFunc|TextVar)\((?:&?[\w.]+,\s*)?"([a-z][a-z0-9-]*)"/g)) {
        atom('cli-flag', `${set} -${m[1]}`, 'belai', `cmd/belai/${f}`);
      }
    }
  }
  const tui = join(b, 'internal', 'tui');
  for (const f of ls(tui, /\.go$/)) {
    const src = read(join(tui, f));
    for (const m of src.matchAll(/\br\.(?:Register|Alias|RegisterHidden)\("([a-z][a-z0-9-]*)"(?:,\s*"((?:[^"\\]|\\.)*)")?/g)) atom('tui-cmd', `/${m[1]}`, 'belai', `internal/tui/${f}`, { detail: m[2] ? { description: m[2] } : undefined });
    for (const m of src.matchAll(/"((?:ctrl|alt|shift)\+[a-z0-9]+|f\d{1,2})"/g)) atom('tui-key', m[1], 'belai', `internal/tui/${f}`);
  }
  // Settings file keys: JSON tags on the config package's structs.
  const conf = join(b, 'internal', 'config');
  for (const f of ls(conf, /\.go$/)) {
    for (const m of read(join(conf, f)).matchAll(/json:"([a-zA-Z_][\w]*)(?:,[a-z]+)*"/g)) atom('belai-config', `${f.replace(/\.go$/, '')}.${m[1]}`, 'belai', `internal/config/${f}`);
  }
  for (const d of readdirSync(join(b, 'internal')).sort()) {
    if (statSync(join(b, 'internal', d)).isDirectory()) atom('belai-pkg', d, 'belai', `internal/${d}`);
  }
  for (const f of ls(join(b, 'docs'), /\.md$/)) atom('doc', `belai/${f}`, 'belai', `docs/${f}`);
}

// cli: every command path of the Cobra tree (`auth login`), read from the Use:
// strings and AddCommand edges in cmd/*.go (scripts/lib/cobra.mjs), plus the
// paths in docs/command-manifest.json, which the CLI writes from the live tree
// and which covers the commands cmd/ builds from tables (package-firewall
// ecosystems, the vdb defence lanes). Hidden commands are left out.
function scanCli() {
  const c = repoPath('cli');
  const files = ls(join(c, 'cmd'), /\.go$/).map((f) => ({ file: `cmd/${f}`, src: read(join(c, 'cmd', f)) }));
  for (const [path, n] of cobraTree(files)) atom('cli-command', path, 'cli', n.file);
  const man = join(c, 'docs', 'command-manifest.json');
  if (existsSync(man)) {
    for (const path of Object.keys(JSON.parse(read(man)).commands ?? {})) {
      if (path !== 'vulnetix' && !path.startsWith('__')) atom('cli-command', path, 'cli', 'docs/command-manifest.json');
    }
  }
}

// config-schemas: every Platform IaC kind with a schema.
function scanConfigSchemas() {
  const dir = join(repoPath('config-schemas'), 'schemas');
  for (const f of ls(dir, /^[A-Z]\w+\.schema\.json$/)) atom('iac-kind', f.replace(/\.schema\.json$/, ''), 'config-schemas', `schemas/${f}`);
}

// siem: Guardian's console API, the ROUTES table of worker/src/api/routes.ts.
// A route is a method and a regex; the id group becomes {id}.
function scanGuardian() {
  const file = join(repoPath('siem'), 'worker', 'src', 'api', 'routes.ts');
  if (!existsSync(file)) return;
  for (const m of read(file).matchAll(/^\s*\['(GET|POST|PUT|PATCH|DELETE)',\s*(?:\/\^(.+?)\$\/|new RegExp\(`\^(.+?)\$`\))\s*,/gm)) {
    const path = (m[2] ?? m[3]).replace(/\\\//g, '/').replace(/\$\{ID\}/g, '{id}').replace(/\(\\\\d\{1,2\}\)/g, '{n}').replace(/\\\\/g, '');
    atom('guardian-route', `${m[1]} ${path}`, 'siem', 'worker/src/api/routes.ts');
  }
}

scanGoRoutes();
scanGoFiles();
scanGoSemantics();
scanContract();
scanWebsite();
scanSaas();
scanBelai();
scanCli();
scanConfigSchemas();
scanGuardian();

const result = {
  generatedAt: new Date().toISOString(),
  repos: Object.fromEntries(REPOS.map((r) => [r, headSha(r)])),
  counts: {},
  atoms: [...atoms.values()].sort((a, b) => a.id.localeCompare(b.id)),
};
for (const a of result.atoms) result.counts[a.kind] = (result.counts[a.kind] ?? 0) + 1;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(`${result.atoms.length} atoms -> ${relative(process.cwd(), out)}`);
for (const [k, n] of Object.entries(result.counts)) console.log(`  ${k.padEnd(11)} ${n}`);
