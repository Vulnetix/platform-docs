#!/usr/bin/env node
// kind-reference.mjs: write the Platform IaC reference pages from a release of
// Vulnetix/config-schemas:
//
//   kinds/<kebab-kind>.md   one page per kind: the fields, the schema's rules,
//                           Minimal and Advanced samples in YAML, HCL and CLI,
//                           CEL variables, how apply treats it, and status
//   kinds/catalogue.md      every kind by group, with its status
//   reference/cel.md        the CEL environments, functions and limits, and
//                           where each kind's expression is evaluated
//
// The schemas are the source of truth, so a page cannot drift from what the
// schema accepts. Everything else a page says comes from one of:
//
//   x-vulnetix            in each schema: validateOnly, singleton, dependsOn,
//                         secrets and celFields
//   examples/<Kind>/*     in config-schemas: the YAML samples
//   the provider          examples/resources/vulnetix_<kind>/ in
//                         Vulnetix/terraform-provider-resolve at its main: the
//                         HCL samples and the import command
//   the CLI               the release pinned in releases.json, and the
//                         config-schemas release its go.mod pinned at each tag
//   kind-notes.mjs        what the schemas cannot carry (groups, apply
//                         behaviour), each fact checked against vdb-site,
//                         vdb-api, package-firewall and ai-firewall
//
// Usage:
//   node migration/generators/kind-reference.mjs [--schemas DIR] [--provider DIR]
//        [--cli DIR] [--vdb-site DIR] [--vdb-api DIR]
//
// --schemas must be a checkout of a release tag of config-schemas (a worktree
// of the latest release works): the stale tip of main is not a release, and the
// pages quote the release. Defaults are the sibling checkouts, or
// $CONFIG_SCHEMAS_DIR, $TF_PROVIDER_DIR (and $TF_PROVIDER_REF, default main),
// $CLI_DIR, $VDB_SITE_DIR. The CLI and config-schemas releases are pinned in
// releases.json (see releases.mjs), so a new release of either changes nothing
// until the pin is bumped; $VULNETIX_CLI_VERSION overrides the CLI pin. With --vdb-site, a kind the engine has no adapter for is
// shown as schema only; without it, every kind that is not validate only is
// shown as served. With --vdb-api, the variables a jail rule may use are checked
// against jail_when.go. A page whose front matter lacks `generated: true` is
// hand-written and is never overwritten.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';

// Generated text comes partly from other repositories, written for their
// developers. Readers of these pages are customers, who know the platform as
// the Vulnetix API, not by the name of the repository behind it. Applied to
// page bodies only: sources: in the frontmatter keeps the real paths.
const customerWording = (text) => text
  .replace(/ \(vdb-site\)/g, ' (Vulnetix API)')
  .replace(/\bvdb-site\b/g, 'the Vulnetix API');
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readPins } from './releases.mjs';
import { GROUPS, PLANNED, OWNER_ONLY_KINDS, GUARDIAN_KINDS, EXTERNAL_KINDS, STATUS, CEL_WHERE, JAIL_VARS, jailTable, kindNotes } from './kind-notes.mjs';

const root = new URL('../..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (name, env) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : env ? process.env[env] : undefined;
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'))[0];
const sibling = (n) => join(root, '..', n);
const schemasRepo = flag('schemas', 'CONFIG_SCHEMAS_DIR') ?? positional ?? sibling('config-schemas');
const providerRepo = flag('provider', 'TF_PROVIDER_DIR') ?? sibling('terraform-provider-resolve');
const cliRepo = flag('cli', 'CLI_DIR') ?? sibling('cli');
const vdbSite = flag('vdb-site', 'VDB_SITE_DIR');
const vdbApi = flag('vdb-api', 'VDB_API_DIR');
const providerRefName = process.env.TF_PROVIDER_REF ?? 'main';

const schemaDir = join(schemasRepo, 'schemas');
const docsRoot = join(root, 'src', 'content', 'docs', 'platform-iac');
const outDir = join(docsRoot, 'kinds');
const celOut = join(docsRoot, 'reference', 'cel.md');
const RELEASES = 'https://github.com/Vulnetix/config-schemas/releases';
const DEV = `${RELEASES}/download/v0.0.0-dev/`;
const CEL_PAGE = '/platform-iac/reference/cel/';
const ENGINE_PAGE = '/platform-iac/reference/engine/';
const TF_PAGE = '/platform-iac/terraform/';

if (!existsSync(schemaDir)) {
  console.error(`kind-reference: no schemas/ in ${schemasRepo}; pass a config-schemas release checkout with --schemas`);
  process.exit(2);
}

function gitIn(repo, ...args) {
  try {
    return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).trim();
  } catch {
    return '';
  }
}
const SEMVER = /^v\d+\.\d+\.\d+$/;
const verCmp = (a, b) => {
  const pa = a.slice(1).split('.').map(Number), pb = b.slice(1).split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
};
const sortedTags = (repo) => gitIn(repo, 'tag', '--list', 'v*.*.*').split('\n').filter((t) => SEMVER.test(t)).sort(verCmp);

// ── The release the pages are generated from ────────────────────────────────
const schemasTag = gitIn(schemasRepo, 'describe', '--tags', '--exact-match', '--match', 'v*.*.*', 'HEAD');
const schemasSha = gitIn(schemasRepo, 'rev-parse', '--short=7', 'HEAD');
const schemasVersion = SEMVER.test(schemasTag) ? schemasTag : schemasSha;
if (!SEMVER.test(schemasTag)) console.warn(`kind-reference: ${schemasRepo} is not at a release tag (${schemasSha}); the pages will quote a commit, not a release`);
const pins = readPins();
if (schemasTag !== pins.configSchemas) console.warn(`kind-reference: ${schemasRepo} is at ${schemasVersion} but releases.json pins config-schemas ${pins.configSchemas}`);
const schemaTags = sortedTags(schemasRepo);
const filesAt = Object.fromEntries(schemaTags.map((t) => [t, new Set(gitIn(schemasRepo, 'ls-tree', '--name-only', t, 'schemas/').split('\n').map((f) => basename(f)))]));
const hasAt = (tag, kind) => filesAt[tag]?.has(`${kind}.schema.json`) ?? false;

// ── The CLI ─────────────────────────────────────────────────────────────────
// The pinned release (releases.json, not whatever is newest today, so a CLI
// release does not change the pages until the pin is bumped), and which
// config-schemas release each CLI tag embedded (its go.mod). A CLI that does not
// embed a kind refuses it before sending it.
const cliTags = existsSync(cliRepo) ? sortedTags(cliRepo) : [];
function latestCliRelease() {
  const v = process.env.VULNETIX_CLI_VERSION || pins.cli;
  if (!SEMVER.test(v)) throw new Error(`kind-reference: CLI release ${v} is not a vX.Y.Z tag`);
  if (!cliTags.includes(v)) console.warn(`kind-reference: ${cliRepo} has no tag ${v}; fetch its tags`);
  return v;
}
const cliLatest = latestCliRelease();
const cliCandidates = cliTags.filter((t) => cliLatest && verCmp(t, cliLatest) <= 0);
const schemasInCli = new Map();
function schemasAtCli(tag) {
  if (!schemasInCli.has(tag)) schemasInCli.set(tag, gitIn(cliRepo, 'show', `${tag}:go.mod`).match(/vulnetix\/config-schemas (v\d+\.\d+\.\d+)/)?.[1] ?? 'v0.0.0');
  return schemasInCli.get(tag);
}
const cliSchemas = cliLatest ? schemasAtCli(cliLatest) : undefined;
const firstCliFor = new Map();
// The first CLI release whose go.mod pins config-schemas at or after `schemaTag`.
function cliEmbedding(schemaTag) {
  if (!cliLatest || !schemaTag) return null;
  if (firstCliFor.has(schemaTag)) return firstCliFor.get(schemaTag);
  let lo = 0, hi = cliCandidates.length - 1, found = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (verCmp(schemasAtCli(cliCandidates[mid]), schemaTag) >= 0) { found = cliCandidates[mid]; hi = mid - 1; } else lo = mid + 1;
  }
  firstCliFor.set(schemaTag, found);
  return found;
}
const cliKnows = (kind) => !!cliSchemas && hasAt(cliSchemas, kind);

// ── The Terraform provider ──────────────────────────────────────────────────
// Read from its main branch (not the working tree, which another change may be
// editing): git when the checkout has history, files otherwise.
const providerGit = existsSync(join(providerRepo, '.git'));
const providerRef = providerGit ? [`origin/${providerRefName}`, providerRefName, 'HEAD'].find((r) => gitIn(providerRepo, 'rev-parse', '--verify', '--quiet', r)) : null;
const providerSha = providerRef ? gitIn(providerRepo, 'rev-parse', '--short=7', providerRef) : '';
const providerFile = (path) => {
  if (providerRef) return gitIn(providerRepo, 'show', `${providerRef}:${path}`) || null;
  const p = join(providerRepo, path);
  return existsSync(p) ? readFileSync(p, 'utf8').trim() : null;
};
const providerDirs = new Set(
  providerRef
    ? gitIn(providerRepo, 'ls-tree', '--name-only', providerRef, 'examples/resources/').split('\n').map((f) => basename(f))
    : existsSync(join(providerRepo, 'examples', 'resources')) ? readdirSync(join(providerRepo, 'examples', 'resources')) : [],
);
if (!providerDirs.size) console.warn(`kind-reference: no Terraform resources found in ${providerRepo}; every page will say there is none`);

// The provider's own naming (cmd/genresources snake): QualityGate is
// quality_gate, GitHubInstallation is git_hub_installation.
function snake(s) {
  const rs = [...s];
  let out = '';
  rs.forEach((r, i) => {
    if ('-. '.includes(r)) { out += '_'; return; }
    if (i > 0) {
      const prev = rs[i - 1], next = rs[i + 1] ?? '';
      const up = (c) => /[A-Z]/.test(c), low = (c) => /[a-z]/.test(c), dig = (c) => /[0-9]/.test(c);
      if ((up(r) && (low(prev) || dig(prev))) || (up(r) && up(prev) && low(next)) || (dig(r) && /[A-Za-z]/.test(prev)) || (low(r) && dig(prev))) out += '_';
    }
    out += r.toLowerCase();
  });
  return out;
}
const tfResource = (kind) => `vulnetix_${snake(kind)}`;

// ── Schema loading and $ref resolution ──────────────────────────────────────
const files = readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json')).sort();
const docs = Object.fromEntries(files.map((f) => [f, JSON.parse(readFileSync(join(schemaDir, f), 'utf8'))]));
const kinds = files.filter((f) => f !== 'common.schema.json').map((f) => basename(f, '.schema.json'));

// Every $ref becomes `<file>#<pointer>`. A local ref (`#/$defs/name`) means the
// file it was written in, and flattening merges properties from several files
// (a kind's metadata is its own override over common.schema.json's), so a bare
// local ref would otherwise be looked up in the wrong file.
function qualify(node, file) {
  if (Array.isArray(node)) return node.forEach((n) => qualify(n, file));
  if (!node || typeof node !== 'object') return;
  if (typeof node.$ref === 'string') {
    const [filePart, pointer = ''] = node.$ref.split('#');
    node.$ref = `${filePart ? basename(filePart.replace(DEV, '')) : file}#${pointer}`;
  }
  for (const v of Object.values(node)) qualify(v, file);
}
for (const [f, d] of Object.entries(docs)) qualify(d, f);

// Resolve a $ref relative to the file it appears in. Returns [schema, file, name]
// where name is the $defs key, used to label shared types.
function resolve(ref, inFile) {
  const [filePart, pointer = ''] = ref.split('#');
  const file = filePart ? basename(filePart.replace(DEV, '')) : inFile;
  let node = docs[file];
  if (!node) throw new Error(`unresolved $ref ${ref} in ${inFile || '(no file)'}`);
  const parts = pointer.split('/').filter(Boolean);
  for (const p of parts) node = node?.[p];
  if (node === undefined) throw new Error(`unresolved $ref ${ref} in ${inFile}`);
  const name = parts.at(-2) === '$defs' ? parts.at(-1) : undefined;
  return [node, file, name];
}

// Keys that describe a conditional, not the node itself.
const CONDITIONAL = new Set(['if', 'then', 'else']);

// Flatten a schema node: follow $ref and merge allOf, keeping the outer
// description. Conditionals (if/then/else, directly or in allOf parts) are
// collected in `conds`. Returns { schema, file, defName }.
function flatten(s, file) {
  if (s === true || s === false) return { schema: { __bool: s }, file };
  let out = { ...s };
  let defName;
  let atFile = file;
  const conds = [];
  if (out.$ref) {
    const [target, tFile, name] = resolve(out.$ref, file);
    const inner = flatten(target, tFile);
    const { $ref, ...rest } = out;
    conds.push(...(inner.schema.conds ?? []));
    out = { ...inner.schema, ...rest };
    // Own conditionals are about this node; the target's travel with it.
    atFile = rest.allOf || rest.properties ? file : inner.file;
    defName = inner.defName ?? name;
  }
  if (out.if) conds.push({ if: out.if, then: out.then, else: out.else, file: atFile });
  if (out.allOf) {
    const merged = { ...out };
    delete merged.allOf;
    for (const part of out.allOf) {
      const fp = flatten(part, atFile);
      const f = fp.schema;
      if (fp.defName && !defName) defName = fp.defName;
      conds.push(...(f.conds ?? []));
      merged.properties = mergeProps(merged.properties, f.properties);
      for (const [k, v] of Object.entries(f)) {
        if (k === 'properties' || k === 'conds' || CONDITIONAL.has(k)) continue;
        if (k === 'required') merged.required = [...new Set([...(merged.required ?? []), ...v])];
        else if (merged[k] === undefined) merged[k] = v;
      }
    }
    out = merged;
  }
  for (const k of CONDITIONAL) delete out[k];
  out.conds = conds;
  return { schema: out, file: atFile, defName };
}

function mergeProps(base, add) {
  if (!base && !add) return undefined;
  const out = { ...(base ?? {}) };
  for (const [k, v] of Object.entries(add ?? {})) out[k] = out[k] ? { allOf: [out[k], v] } : v;
  return out;
}

// ── Field rows ──────────────────────────────────────────────────────────────
// Control characters in a pattern (the schemas exclude U+0000 to U+001F and U+007F) are written as escapes.
const esc = (s) => s.replace(/[\u0000-\u001f\u007f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const code = (s) => '`' + esc(typeof s === 'string' ? s : JSON.stringify(s)).replace(/`/g, '') + '`';
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
const list = (xs, last = 'or') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${last} ${xs.at(-1)}`);

// The branches of an anyOf or oneOf, flattened.
const branches = (s, file) => (s.anyOf ?? s.oneOf ?? []).map((b) => flatten(b, file));

// The enum a node allows, following anyOf/oneOf branches that are all enums.
function enumOf(s, file) {
  if (s.enum) return s.enum;
  if (s.const !== undefined) return [s.const];
  const bs = branches(s, file);
  if (bs.length && bs.every((b) => enumOf(b.schema, b.file))) return [...new Set(bs.flatMap((b) => enumOf(b.schema, b.file)))];
  return null;
}

function typeOf(s, file) {
  if (s.const !== undefined) return typeof s.const === 'string' ? 'string' : typeof s.const;
  if (Array.isArray(s.type)) return s.type.join(' or ');
  if (s.type === 'array') {
    if (!s.items) return 'array';
    const it = flatten(s.items, file);
    return `array of ${typeOf(it.schema, it.file)}`;
  }
  if (s.type) return s.type;
  const bs = branches(s, file);
  if (bs.length) return [...new Set(bs.map((b) => typeOf(b.schema, b.file)))].filter((t) => t !== 'any').join(' or ') || 'any';
  if (s.enum) return 'string';
  return 'any';
}

// The constraints of a node, as text. `top` is false inside an anyOf branch.
function allowed(s, file, top = true) {
  const out = [];
  if (s.const !== undefined) out.push(`exactly ${code(s.const)}`);
  const en = enumOf(s, file);
  if (s.const === undefined && en) out.push(en.map(code).join(', '));
  if (s.not?.enum) out.push(`not ${s.not.enum.map(code).join(', ')}`);
  if (s.not?.const !== undefined) out.push(`not ${code(s.not.const)}`);
  if (s.pattern) out.push(`pattern ${code(s.pattern)}`);
  if (s.format) out.push(`format ${code(s.format)}`);
  if (s.minimum !== undefined && s.maximum !== undefined) out.push(`${s.minimum} to ${s.maximum}`);
  else if (s.minimum !== undefined) out.push(`>= ${s.minimum}`);
  else if (s.maximum !== undefined) out.push(`<= ${s.maximum}`);
  if (s.minLength !== undefined || s.maxLength !== undefined) out.push(`length ${s.minLength ?? 0} to ${s.maxLength ?? 'any'}`);
  if (s.minItems !== undefined || s.maxItems !== undefined) out.push(`${s.minItems ?? 0} to ${s.maxItems ?? 'any'} items`);
  if (s.uniqueItems) out.push('items unique');
  if (s.minProperties !== undefined || s.maxProperties !== undefined) out.push(`${s.minProperties ?? 0} to ${s.maxProperties ?? 'any'} keys`);
  if (s.type === 'array' && s.items) {
    const it = flatten(s.items, file);
    if (!it.schema.properties) {
      const a = allowed(it.schema, it.file, false);
      if (a) out.push(`each item: ${a}`);
    }
  }
  if (s.type === 'object' && s.additionalProperties && typeof s.additionalProperties === 'object') {
    const v = flatten(s.additionalProperties, file);
    const a = allowed(v.schema, v.file, false);
    out.push(`map of string to ${typeOf(v.schema, v.file)}${a ? ` (${a})` : ''}`);
    if (s.propertyNames?.pattern) out.push(`keys match ${code(s.propertyNames.pattern)}`);
  }
  if (top && s.type === 'object' && s.additionalProperties === false && s.properties) out.push('no other keys');
  // anyOf/oneOf over values (not over object shapes, which are rules).
  const bs = branches(s, file);
  if (bs.length && !en && !isShapeChoice(s, file)) {
    const parts = bs.map((b) => allowed(b.schema, b.file, false) || typeOf(b.schema, b.file)).filter(Boolean);
    if (parts.length) out.push(parts.join(', or '));
  }
  return out.join('; ');
}

// An anyOf/oneOf whose branches constrain an object's keys (required,
// properties) rather than a value. Those are listed under Rules.
function isShapeChoice(s, file) {
  const bs = branches(s, file);
  return bs.length > 0 && bs.some((b) => b.schema.required || b.schema.properties || b.schema.anyOf || b.schema.oneOf) && (s.type === 'object' || s.properties || bs.some((b) => b.schema.properties || b.schema.required));
}

// ── Rules: conditionals and shape choices, in words ─────────────────────────
function condText(ifs, file) {
  const f = flatten(ifs, file);
  const parts = [];
  for (const [k, v] of Object.entries(f.schema.properties ?? {})) {
    const p = flatten(v, f.file).schema;
    const en = enumOf(p, f.file);
    if (p.const !== undefined) parts.push(`\`${k}\` is ${code(p.const)}`);
    else if (en) parts.push(`\`${k}\` is ${en.length === 1 ? code(en[0]) : `one of ${en.map(code).join(', ')}`}`);
    else if (p.pattern) parts.push(`\`${k}\` matches ${code(p.pattern)}`);
    else parts.push(`\`${k}\` is ${allowed(p, f.file, false)}`);
  }
  const named = new Set(Object.keys(f.schema.properties ?? {}));
  for (const r of f.schema.required ?? []) if (!named.has(r)) parts.push(`\`${r}\` is set`);
  return list(parts, 'and');
}

function effects(s, file, prefix = '') {
  const f = flatten(s, file);
  const n = f.schema;
  const out = [];
  for (const r of n.required ?? []) out.push(`\`${prefix}${r}\` is required`);
  for (const [k, v] of Object.entries(n.properties ?? {})) {
    if (v === false) {
      out.push(`\`${prefix}${k}\` is not allowed`);
      continue;
    }
    const p = flatten(v, f.file);
    const ps = p.schema;
    if (ps.type === 'array' && ps.items) {
      const it = flatten(ps.items, p.file);
      out.push(...effects(it.schema, it.file, `${prefix}${k}[].`));
      continue;
    }
    if (ps.properties && !ps.type) {
      out.push(...effects(ps, p.file, `${prefix}${k}.`));
      continue;
    }
    if (ps.not?.const !== undefined) out.push(`\`${prefix}${k}\` must not be ${code(ps.not.const)}`);
    else if (ps.const !== undefined) out.push(`\`${prefix}${k}\` must be ${code(ps.const)}`);
    else {
      const a = allowed(ps, p.file, false);
      if (a) out.push(`\`${prefix}${k}\` must be ${a}`);
    }
  }
  for (const c of n.conds ?? []) out.push(...ruleOfCond(c, prefix));
  const bs = branches(n, f.file);
  if (bs.length) out.push(choiceText(n, f.file, prefix));
  return out;
}

function ruleOfCond(c, prefix) {
  const when = condText(c.if, c.file);
  const out = [];
  const t = c.then ? effects(c.then, c.file, prefix) : [];
  const e = c.else ? effects(c.else, c.file, prefix) : [];
  if (t.length) out.push(`When ${when}: ${list(t, 'and')}.`);
  if (e.length) out.push(`Otherwise: ${list(e, 'and')}.`);
  return out.length === 2 ? [out.join(' ')] : out;
}

function choiceText(n, file, prefix) {
  const one = !!n.oneOf;
  const bs = branches(n, file);
  // Every branch only requires one key: a plain choice of keys.
  if (bs.every((b) => b.schema.required?.length === 1 && !b.schema.properties && !b.schema.anyOf && !b.schema.oneOf)) {
    const keys = bs.map((b) => `\`${prefix}${b.schema.required[0]}\``);
    return one ? `Exactly one of ${list(keys)} is set.` : `At least one of ${list(keys)} is set.`;
  }
  const own = new Set(Object.keys(n.properties ?? {}));
  const desc = bs.map((b) => {
    const bProps = Object.keys(b.schema.properties ?? {}).filter((k) => !own.has(k) && b.schema.properties[k] !== false);
    if (b.defName && bProps.length && b.schema.type === 'object') return `the \`${b.defName}\` form (${bProps.map((k) => `\`${prefix}${k}\``).join(', ')})`;
    const e = effects(b.schema, b.file, prefix);
    const label = b.schema.description ? `${b.schema.description.replace(/\.$/, '')}: ` : '';
    return `${label}${list(e, 'and')}`;
  });
  return `${one ? 'Exactly one of these holds' : 'At least one of these holds'}: ${desc.map((d, i) => `(${i + 1}) ${d}`).join('; ')}.`;
}

function rows(s, file, path, required, acc) {
  const f = flatten(s, file);
  const node = f.schema;
  if (node.__bool === false) return acc;
  if (path) {
    let desc = node.description ?? '';
    if (node.examples) desc += `${desc ? ' ' : ''}Examples: ${node.examples.map(code).join(', ')}.`;
    acc.fields.push({
      path,
      type: typeOf(node, f.file),
      required,
      def: node.default,
      allowed: allowed(node, f.file),
      desc,
      cel: f.defName === 'celExpression',
    });
  }
  const label = path || 'the document';
  for (const c of node.conds) for (const r of ruleOfCond(c, '')) acc.rules.push({ at: label, text: r });
  if (isShapeChoice(node, f.file)) acc.rules.push({ at: label, text: choiceText(node, f.file, '') });
  const descend = (props, req, from, note) => {
    for (const [k, v] of Object.entries(props ?? {})) {
      if (k === '$schema' || v === false) continue;
      const p = path ? `${path}.${k}` : k;
      if (acc.fields.some((r) => r.path === p)) continue;
      rows(v, from, p, req.has(k) ? note ?? true : false, acc);
    }
  };
  descend(node.properties, new Set(node.required ?? []), f.file);
  // Fields that only exist in one branch of a oneOf/anyOf (RemediationPolicy spec).
  for (const b of branches(node, f.file)) {
    if (!b.schema.properties) continue;
    descend(b.schema.properties, new Set(b.schema.required ?? []), b.file, b.defName ? `in the \`${b.defName}\` form` : true);
  }
  if (node.type === 'array' && node.items) {
    const it = flatten(node.items, f.file);
    const objs = it.schema.properties ? [it] : branches(it.schema, it.file).filter((b) => b.schema.properties);
    for (const o of objs) {
      for (const c of o.schema.conds) for (const r of ruleOfCond(c, '')) acc.rules.push({ at: `${path}[]`, text: r });
      if (isShapeChoice(o.schema, o.file)) acc.rules.push({ at: `${path}[]`, text: choiceText(o.schema, o.file, '') });
      const req = new Set(o.schema.required ?? []);
      for (const [k, v] of Object.entries(o.schema.properties)) {
        if (v === false) continue;
        const p = `${path}[].${k}`;
        if (acc.fields.some((r) => r.path === p)) continue;
        rows(v, o.file, p, req.has(k), acc);
      }
    }
  }
  if (node.type === 'object' && node.additionalProperties && typeof node.additionalProperties === 'object') {
    const v = flatten(node.additionalProperties, f.file);
    if (v.schema.properties) rows(node.additionalProperties, f.file, `${path}.<key>`, false, acc);
  }
  return acc;
}

// ── CEL tables ──────────────────────────────────────────────────────────────
function celdoc(context) {
  const args = ['run', './cmd/celdoc', ...(context ? ['--context', context] : [])];
  try {
    return execFileSync('go', args, { cwd: schemasRepo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    // No Go: the README carries the same generated block (a test keeps it fresh).
    const readme = readFileSync(join(schemasRepo, 'cel', 'README.md'), 'utf8');
    const all = readme.split('<!-- celdoc:begin -->')[1].split('<!-- celdoc:end -->')[0].trim() + '\n';
    if (!context) return all;
    const m = all.match(new RegExp('### `' + context + '`\\n[\\s\\S]*?(?=\\n### |$)'));
    return m[0] + '\n';
  }
}
const celdocCache = {};
const celTable = (ctx) => (celdocCache[ctx] ??= celdoc(ctx).replace(/^### .*\n+/, '').trim());

// ── The kinds ───────────────────────────────────────────────────────────────
// The jail variable table in kind-notes.mjs must be what the evaluator accepts.
if (vdbApi) {
  const src = readFileSync(join(vdbApi, 'internal', 'handler', 'jail_when.go'), 'utf8');
  for (const m of src.matchAll(/JailKind(\w+):\s*jailVarSet\(([^)]*)\)/g)) {
    const have = [...m[2].matchAll(/"(\w+)"/g)].map((x) => x[1]).join(',');
    const want = (JAIL_VARS[m[1].toUpperCase()] ?? []).join(',');
    if (have !== want) throw new Error(`JAIL_VARS.${m[1].toUpperCase()} in kind-notes.mjs is ${want}, but vdb-api jail_when.go accepts ${have}`);
  }
}
const kebab = (k) => k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
const isGenerated = (p) => !existsSync(p) || /^generated: true$/m.test(readFileSync(p, 'utf8').split('\n---')[0]);
const kindMeta = (kind) => {
  const m = docs[`${kind}.schema.json`]['x-vulnetix'];
  if (!m) throw new Error(`${kind}: the schema has no x-vulnetix annotation; generate from a release that has them (config-schemas v1.6.0 or later)`);
  return m;
};
const kindPath = (k) => `/platform-iac/kinds/${kebab(k)}/`;
const kindLink = (k) => (kinds.includes(k) ? `[\`${k}\`](${kindPath(k)})` : `\`${k}\``);

const groupOf = {}, orderOf = {};
let nOrder = 10;
for (const [g, , ks] of GROUPS) for (const k of ks) { groupOf[k] = g; orderOf[k] = nOrder++; }
for (const k of kinds) if (!groupOf[k]) throw new Error(`${k} has a schema but is in no group: add it to GROUPS in kind-notes.mjs`);
for (const k of Object.keys(groupOf)) if (!kinds.includes(k)) throw new Error(`GROUPS names ${k}, which has no schema in ${schemasVersion}`);

// The kinds the engine has an adapter for. Without --vdb-site, every kind that
// is not validate only is taken as served.
const adapterKinds = vdbSite
  ? new Set(
      readdirSync(join(vdbSite, 'api', 'internal', 'config'))
        .filter((f) => f.endsWith('.go') && !f.endsWith('_test.go'))
        .flatMap((f) => [...readFileSync(join(vdbSite, 'api', 'internal', 'config', f), 'utf8').matchAll(/"([A-Z][A-Za-z]+)"/g)].map((m) => m[1])),
    )
  : null;
function statusOf(kind) {
  if (kindMeta(kind).validateOnly) return 'validate';
  if (adapterKinds && !adapterKinds.has(kind)) return 'schema';
  return 'served';
}
const STATUS_TEXT = { served: 'Served', validate: 'Validate only', schema: 'Schema only' };

// The CLI line of a kind: from which CLI release `vulnetix config` knows it.
function cliFirst(kind) {
  const first = schemaTags.find((t) => hasAt(t, kind));
  return cliEmbedding(first);
}
const CLI = { version: cliLatest, schemas: cliSchemas, firstFor: (k) => cliFirst(k) ?? cliLatest };
const NOTES = kindNotes({ ENGINE_PAGE, CLI });

function tokenText(kind) {
  if (statusOf(kind) === 'validate') return 'None. The server stores nothing for this kind; validating needs no credential.';
  const creds = '[Credentials for automation](/platform-iac/reference/config-api/#credentials-for-automation)';
  if (GUARDIAN_KINDS.has(kind)) return `An owner, or a service account with the developer role, or an Authentik access token for either. The kind is written in Guardian, which the Vulnetix API vouches to for the caller; a member can read it but not change it. See ${creds}.`;
  if (OWNER_ONLY_KINDS.has(kind)) return `An owner: a person signed in as owner, or an owner service account. A service account with the developer role cannot apply this kind. See ${creds}.`;
  return `An owner, or a service account with the developer role (its ApiKey), or an Authentik access token for either. A member is refused with HTTP 403. See ${creds}.`;
}

// ── Samples ─────────────────────────────────────────────────────────────────
const exampleDir = (kind) => join(schemasRepo, 'examples', kind);
const readExample = (kind, name) => {
  const p = join(exampleDir(kind), name);
  return existsSync(p) ? readFileSync(p, 'utf8').trim() : null;
};
const fence = (lang, text) => '```' + lang + '\n' + text.trim() + '\n```';

function cliBlock(kind, yaml) {
  const lines = [];
  if (statusOf(kind) === 'validate') {
    lines.push(`vulnetix config validate -f - <<'EOF'`, yaml, 'EOF');
    return lines.join('\n');
  }
  lines.push(
    'export VULNETIX_ORG_ID=...    # the organization UUID',
    'export VULNETIX_API_KEY=...   # the ApiKey of a developer or owner service account',
  );
  for (const env of [...new Set([...yaml.matchAll(/\benv:\s*([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]))]) {
    lines.push(`export ${env}=...   # read on this machine by valueFrom, never written to the document`);
  }
  lines.push(`vulnetix config apply -f - --manager gitops:acme/platform --auto-approve <<'EOF'`, yaml, 'EOF');
  return lines.join('\n');
}

function sampleSection(kind, which, tfPresent) {
  const yaml = readExample(kind, `${which}.yaml`);
  if (!yaml) throw new Error(`${kind}: examples/${kind}/${which}.yaml is missing in config-schemas ${schemasVersion}`);
  const title = which === 'minimal' ? 'Minimal' : 'Advanced';
  const res = tfResource(kind);
  let out = `## ${title}\n\n`;
  out += which === 'minimal'
    ? `Only the fields the kind requires. From \`examples/${kind}/minimal.yaml\`.\n\n`
    : `Every field the kind supports, with a \`when\` expression where it takes one. From \`examples/${kind}/advanced.yaml\`.\n\n`;
  out += `**YAML**\n\n${fence('yaml', yaml)}\n\n`;
  const hcl = tfPresent ? providerFile(`examples/resources/${res}/${which}.tf`) : null;
  if (hcl) out += `**HCL** (resource \`${res}\`)\n\n${fence('hcl', hcl)}\n\n`;
  else out += `**HCL**\n\n${tfAbsence(kind)}\n\n`;
  const cliNote = statusOf(kind) === 'validate' ? 'validates it' : cliKnows(kind) ? 'applies it' : 'needs a CLI that embeds this kind; see [Applying this kind](#applying-this-kind)';
  out += `**CLI** (${cliNote})\n\n${fence('bash', cliBlock(kind, yaml))}\n\n`;
  return out;
}

function tfAbsence(kind) {
  if (statusOf(kind) === 'validate') return `There is no Terraform resource. The server stores nothing for this kind, so there is nothing for Terraform to manage. The file stays in the repository; see [Which files are Platform IaC documents](/platform-iac/cli/validate/#which-files-are-platform-iac-documents).`;
  return `There is no Terraform resource for this kind yet: the provider's \`${providerRefName}\` branch has no \`${tfResource(kind)}\`. See [Terraform and OpenTofu](${TF_PAGE}).`;
}

// ── One page per kind ───────────────────────────────────────────────────────
const firstSentence = (s) => {
  const t = s.replace(/\s+/g, ' ').trim();
  const m = t.match(/^.+?[.!?](?=\s|$)/);
  return m ? m[0] : t;
};
// A sentence cut short at the last clause break before n characters, ended with a full stop.
const clip = (s, n) => {
  if (s.length <= n) return s;
  const head = s.slice(0, n);
  const cut = Math.max(head.lastIndexOf(','), head.lastIndexOf(';'), head.lastIndexOf(':'), head.lastIndexOf(' ('));
  return (cut > n * 0.4 ? head.slice(0, cut) : head.slice(0, head.lastIndexOf(' '))).replace(/[\s,;:.]+$/, '') + '.';
};

mkdirSync(outDir, { recursive: true });
const celUses = [];
const catalogue = [];
const written = [];
for (const kind of kinds) {
  const file = `${kind}.schema.json`;
  const schema = docs[file];
  const meta = kindMeta(kind);
  const notes = NOTES[kind] ?? {};
  const out = join(outDir, `${kebab(kind)}.md`);
  if (!isGenerated(out)) {
    console.warn(`kind-reference: ${out} is hand-written; not overwritten`);
    continue;
  }
  const status = statusOf(kind);
  const res = tfResource(kind);
  const tfPresent = status !== 'validate' && providerDirs.has(res);
  const first = schemaTags.find((t) => hasAt(t, kind));
  const pinned = schemasTag && hasAt(schemasTag, kind) ? schemasTag : schemaTags.filter((t) => hasAt(t, kind)).at(-1);
  const { fields, rules } = rows(schema, file, '', false, { fields: [], rules: [] });
  for (const r of fields) {
    if (r.path === 'kind' && !r.desc) r.desc = `Always ${kind}.`;
    if (notes.desc?.[r.path]) r.desc = r.desc ? `${r.desc} ${notes.desc[r.path]}` : notes.desc[r.path];
  }
  for (const p of Object.keys(notes.desc ?? {})) if (!fields.some((r) => r.path === p)) throw new Error(`NOTES.${kind}.desc: no field ${p}`);

  // The annotations must agree with the fields: a CEL field and a secret are
  // named by path, and the path has to exist.
  const celFields = meta.celFields.map((c) => {
    const f = fields.find((r) => r.path === c.path);
    if (!f) throw new Error(`${kind}: x-vulnetix.celFields names ${c.path}, which is not a field`);
    return { ...f, env: c.env };
  });
  for (const r of fields) if (r.cel && !meta.celFields.some((c) => c.path === r.path)) console.warn(`kind-reference: ${kind}.${r.path} is a celExpression that x-vulnetix.celFields does not list`);
  for (const p of meta.secrets) if (!fields.some((r) => r.path === p)) throw new Error(`${kind}: x-vulnetix.secrets names ${p}, which is not a field`);
  const secret = new Set(meta.secrets);
  const depends = status === 'validate' ? [] : meta.dependsOn.filter((k) => kinds.includes(k));

  const cliFirstRel = cliFirst(kind);
  const cliCell = status === 'validate'
    ? `[\`vulnetix config validate\`](/platform-iac/cli/validate/) reads it${cliFirstRel ? ` (CLI ${cliFirstRel} and later)` : ''}; \`plan\` and \`apply\` note it and send nothing.`
    : cliKnows(kind)
      ? `[\`vulnetix config apply\`](/platform-iac/cli/apply/), CLI ${cliFirstRel} and later.`
      : `Not yet. The latest CLI, ${cliLatest}, embeds \`config-schemas\` ${cliSchemas}, which has no \`${kind}\`, so \`vulnetix config\` refuses the document as an unknown kind before sending it. Use the config API, or Terraform where the kind has a resource, until a CLI release embeds it.`;

  let body = '';
  body += `${schema.description}\n\n`;
  if (notes.intro) body += `${notes.intro}\n\n`;
  body += '| | |\n|---|---|\n';
  body += `| \`apiVersion\` | \`vulnetix.com/v1\` |\n| \`kind\` | \`${kind}\` |\n`;
  body += `| Group | [${groupOf[kind]}](/platform-iac/kinds/catalogue/#${groupOf[kind].toLowerCase().replace(/[^a-z0-9]+/g, '-')}) |\n`;
  body += `| Status | ${statusCell(kind, status)} |\n`;
  body += `| Objects per tenant | ${meta.singleton ? 'one (`metadata.name: default`)' : 'many, keyed by `metadata.name`'} |\n`;
  body += `| Token and role | ${tokenText(kind)} |\n`;
  if (depends.length) body += `| Applied after | ${depends.map(kindLink).join(', ')} (deleted before them) |\n`;
  if (meta.secrets.length) body += `| Secret fields | ${meta.secrets.map((p) => `\`${p}\``).join(', ')}: read on the client from \`valueFrom\`, sent once, never exported or shown in a plan |\n`;
  if (celFields.length) body += `| CEL fields | ${celFields.map((c) => `\`${c.path}\` (\`${c.env}\`)`).join(', ')}: see [CEL rule expressions](${CEL_PAGE}) |\n`;
  body += `| Terraform resource | ${tfPresent ? `[\`${res}\`](${TF_PAGE}resources/#${res}), imported by name (see [Terraform and OpenTofu](#terraform-and-opentofu))` : status === 'validate' ? 'None: the server stores nothing for this kind' : 'None yet'} |\n`;
  body += `| CLI | ${cliCell} |\n`;
  if (pinned) body += `| Pinned schema | [\`${pinned}/${file}\`](${RELEASES}/download/${pinned}/${file}) |\n`;
  body += `| Newest schema | [\`latest/${file}\`](${RELEASES}/latest/download/${file}) |\n`;
  if (first) body += `| First released in | [\`${first}\`](${RELEASES}/tag/${first}) |\n`;
  if (cliKnows(kind)) body += `| Print the built-in copy | \`vulnetix config schema ${kind}\` |\n`;
  body += '\n';
  if (status === 'schema') body += `> [!CAREFUL] Schema only\n> The schema is released, so documents validate in an editor or with any JSON Schema 2020-12 validator, but the config engine does not serve \`${kind}\` yet: plan and apply refuse it as an unknown kind.\n\n`;

  body += sampleSection(kind, 'minimal', tfPresent);
  body += sampleSection(kind, 'advanced', tfPresent);

  body += '## Fields\n\n';
  body += 'Paths use dots for nesting and `[]` for the items of a list. **Required** means required whenever the parent object is present. A default is what the server uses when the field is left out.\n\n';
  const secretCol = meta.secrets.length > 0;
  body += `| Field | Type | Required | Default | Allowed values | ${secretCol ? 'Secret | ' : ''}Description |\n|---|---|---|---|---|${secretCol ? '---|' : ''}---|\n`;
  for (const r of fields) {
    const req = r.required === true ? 'yes' : r.required ? `yes, ${r.required}` : 'no';
    body += `| <span id="${r.path.replace(/[.[\]<>]+/g, '-').replace(/-+$/, '')}"></span>${code(r.path)} | ${cell(r.type)} | ${req} | ${r.def === undefined ? '' : code(r.def)} | ${cell(r.allowed)} | ${secretCol ? `${secret.has(r.path) ? 'yes' : ''} | ` : ''}${cell(r.desc)} |\n`;
  }
  body += '\n';
  for (const [path, note] of Object.entries(notes.fields ?? {})) {
    if (!fields.some((r) => r.path === path)) throw new Error(`NOTES.${kind}.fields: no field ${path}`);
    body += `> [!CAREFUL] \`${path}\`\n> ${note}\n\n`;
  }

  if (rules.length) {
    body += '## Rules\n\n';
    body += 'Conditions the schema enforces beyond each field\'s own type. `vulnetix config validate` and the engine\'s plan report a document that breaks one.\n\n';
    body += '| On | Rule |\n|---|---|\n';
    for (const r of rules) body += `| ${code(r.at)} | ${cell(r.text)} |\n`;
    body += '\n';
  }

  if (celFields.length) {
    body += '## CEL variables\n\n';
    const byCtx = {};
    for (const c of celFields) {
      (byCtx[c.env] ??= []).push(c.path);
      celUses.push({ kind, path: c.path, ctx: c.env, status });
    }
    for (const [ctx, paths] of Object.entries(byCtx)) {
      body += `${list(paths.map(code), 'and')} ${paths.length > 1 ? 'are CEL expressions' : 'is a CEL expression'} in the \`${ctx}\` context, returning \`bool\`. `;
      const w = CEL_WHERE[kind];
      if (w) body += `It is evaluated ${w.where}. ${w.fail} See [where each expression is evaluated](${CEL_PAGE}#where-each-expression-is-evaluated). `;
      body += `The functions, limits and error codes are on [CEL rule expressions](${CEL_PAGE}).\n\n`;
      body += celTable(ctx) + '\n\n';
    }
    if (notes.cel) body += notes.cel.trim() + '\n\n';
  }

  // ── Applying ──
  body += '## Applying this kind\n\n';
  const apply = [];
  if (status === 'validate') apply.push('**Not stored.** The engine registers the kind so that validate and plan check a document. A plan that includes one shows the warning `not_stored`, and apply sends nothing for it.');
  else {
    apply.push(`**Command.** ${cliKnows(kind) ? `\`vulnetix config apply -f <file>\`; the CLI line above says from which release.` : `${cliCell}`} Plan first with [\`vulnetix config plan\`](/platform-iac/cli/plan/): it shows each object as create, update, delete or no change, with a \`planHash\` that apply then holds to. Apply writes in one transaction${EXTERNAL_KINDS.has(kind) ? ', except for the second phase below' : ''}.`);
    apply.push(`**Manager.** Each object records the manager that applied it (\`terraform\`, \`console\` or \`gitops:<repo>\`). \`--prune\` deletes only objects its own manager owns. See [The manager](/platform-iac/cli/plan/#the-manager) and the [config engine](${ENGINE_PAGE}).`);
    if (depends.length) apply.push(`**Order.** Applied after ${list(depends.map(kindLink), 'and')}, so a document that refers to one by \`metadata.name\` can be in the same apply. Deleted before them.`);
    if (EXTERNAL_KINDS.has(kind)) apply.push(`**Second phase.** This kind is not written inside the apply transaction. The other kinds apply and commit first, then each ${kind} is written on its own${GUARDIAN_KINDS.has(kind) ? ', in Guardian' : ', in the tenant vault'}. One that fails reports \`status.phase: Failed\` and a \`message\`, and nothing is recorded for it. The others stay applied and the apply answers 207. Plan again to see what is left. A single \`PUT\` from the Terraform provider answers 502 \`external_failed\` instead.`);
    apply.push(`**Status.** ${STATUS[kind] ?? 'Applied, Unchanged or Deleted, with no other status fields.'} The phases the engine reports are explained under [status phases](${ENGINE_PAGE}#status-phases).`);
    if (meta.singleton) apply.push('**Singleton.** There is one per tenant, and its name is always `default`.');
  }
  body += apply.map((a) => `- ${a}`).join('\n') + '\n\n';
  if (notes.after) body += notes.after.trim() + '\n\n';

  // ── Terraform ──
  body += '## Terraform and OpenTofu\n\n';
  if (tfPresent) {
    const imp = providerFile(`examples/resources/${res}/import.sh`);
    body += `The resource is \`${res}\` in the \`vulnetix/resolve\` provider. Its arguments are the \`spec\` in snake case, beside \`name\`, \`labels\` and \`annotations\` from \`metadata\`. The Minimal and Advanced HCL are above. The provider's own reference is [${res}](https://registry.terraform.io/providers/vulnetix/resolve/latest/docs/resources/${snake(kind)}).\n\n`;
    body += `Import an object that already exists by its name${meta.singleton ? ' (`default`)' : ''}:\n\n${fence('shell', imp ?? `terraform import ${res}.example <name>`)}\n\n`;
    if (meta.secrets.length) body += `A secret is two arguments, never stored in the plan or the state: ${meta.secrets.map((p) => { const n = snake(p.split('.').at(-1)); return `\`${n}_wo\` (write-only) and \`${n}_wo_version\``; }).join(', ')}. Change the version number to send a new value. See [Secrets](${TF_PAGE}#secrets).\n\n`;
    body += `Install, authentication and how state is read: [Terraform and OpenTofu](${TF_PAGE}).\n\n`;
  } else {
    body += `${tfAbsence(kind)}\n\n`;
  }

  // ── Other examples ──
  const others = existsSync(exampleDir(kind)) ? readdirSync(exampleDir(kind)).filter((f) => /\.ya?ml$/.test(f) && !/^(minimal|advanced)\.ya?ml$/.test(f)).sort() : [];
  if (others.length) {
    body += '## More examples\n\n';
    for (const ex of others) body += `\`examples/${kind}/${ex}\` from \`Vulnetix/config-schemas\`:\n\n${fence('yaml', readExample(kind, ex))}\n\n`;
  }
  body += cliKnows(kind) || status === 'validate'
    ? 'Check a file with `vulnetix config validate -f <file>`. See [Validate documents](/platform-iac/cli/validate/). In an editor, start the file with the [schema comment](/platform-iac/schemas/editors/).\n'
    : `Check a file in an editor with the [schema comment](/platform-iac/schemas/editors/) on its first line, or with the engine's \`POST /config/validate\`. The latest CLI does not know this kind offline.\n`;

  const sources = [
    `config-schemas/schemas/${file}`, 'config-schemas/schemas/common.schema.json',
    ...['minimal', 'advanced', ...others.map((o) => o.replace(/\.ya?ml$/, ''))].map((e) => `config-schemas/examples/${kind}/${e}.yaml`),
    ...(celFields.length ? ['config-schemas/cel/variables.go'] : []),
    ...(tfPresent ? [`terraform-provider-resolve/examples/resources/${res}/minimal.tf`, `terraform-provider-resolve/examples/resources/${res}/advanced.tf`] : []),
    'vdb-site/docs/platform-iac-engine.md', 'vdb-site/api/internal/handler/config_engine_kinds.go',
    ...(notes.sources ?? []),
  ];
  const checked = [`config-schemas@${schemasVersion}`, ...(providerSha ? [`terraform-provider-resolve@${providerSha}`] : []), ...(cliLatest ? [`cli@${cliLatest}`] : [])];
  const desc = `${clip(firstSentence(schema.description), 160)} Fields, YAML, HCL and CLI samples, and how apply treats it.`;
  const front = [
    '---',
    `title: ${JSON.stringify(kind)}`,
    `description: ${JSON.stringify(desc)}`,
    `order: ${orderOf[kind]}`,
    `group: ${JSON.stringify(groupOf[kind])}`,
    'generated: true',
    `sources: [${[...new Set(sources)].map((s) => JSON.stringify(s)).join(', ')}]`,
    `checked: [${checked.map((c) => JSON.stringify(c)).join(', ')}]`,
    '---',
    '',
    '<!-- Generated by migration/generators/kind-reference.mjs from Vulnetix/config-schemas. Edit the schema or the generator, not this page. -->',
    '',
  ].join('\n');
  writeFileSync(out, front + customerWording(body.trim()) + '\n');
  written.push(kind);
  catalogue.push({ kind, group: groupOf[kind], status, singleton: meta.singleton, tf: tfPresent ? res : null, what: clip(firstSentence(schema.description), 170), first });
  console.log(`kind-reference: wrote kinds/${kebab(kind)}.md (${fields.length} fields, ${rules.length} rules)`);
}

function statusCell(kind, status) {
  if (status === 'served') return `**Served.** The [config engine](${ENGINE_PAGE}) plans and applies it.`;
  if (status === 'validate') return `**Validate only.** The server stores nothing for it: validate and plan check a document, and apply sends nothing.`;
  return '**Schema only.** Released, but the config engine does not serve it yet.';
}

// ── The catalogue ───────────────────────────────────────────────────────────
const catOut = join(outDir, 'catalogue.md');
if (isGenerated(catOut)) {
  const counts = { served: 0, validate: 0, schema: 0 };
  for (const c of catalogue) counts[c.status]++;
  let body = `Every config kind with a released schema, grouped by the part of Vulnetix it configures. All of them use \`apiVersion: vulnetix.com/v1\`. This page lists the ${catalogue.length} kinds in \`config-schemas\` ${schemasVersion}.\n\n`;
  body += `| Status | Meaning | Kinds |\n|---|---|---|\n`;
  body += `| Served | The config engine plans, applies and exports it. | ${counts.served} |\n`;
  body += `| Validate only | The server stores nothing for it. Validating and planning check a document; apply sends nothing. | ${counts.validate} |\n`;
  body += `| Schema only | The schema is released and the engine does not serve it yet. | ${counts.schema} |\n`;
  body += `| Planned | No schema yet. | ${PLANNED.length} |\n\n`;
  body += `Each kind's page has its fields, a Minimal and an Advanced sample in YAML, HCL and CLI, its rules, how apply treats it, and its Terraform resource. To apply any of them, see [Apply](/platform-iac/cli/apply/); to manage them with Terraform or OpenTofu, see [Terraform and OpenTofu](${TF_PAGE}). Release history: [Schema releases](/platform-iac/schemas/releases/).\n\n`;
  for (const [group, blurb, ks] of GROUPS) {
    const rowsIn = ks.map((k) => catalogue.find((c) => c.kind === k)).filter(Boolean);
    const planned = PLANNED.filter((p) => p.group === group);
    if (!rowsIn.length && !planned.length) continue;
    body += `## ${group}\n\n${blurb}\n\n| Kind | Objects | Status | Terraform | What it declares |\n|---|---|---|---|---|\n`;
    for (const c of rowsIn) body += `| ${kindLink(c.kind)} | ${c.singleton ? 'one' : 'many'} | ${STATUS_TEXT[c.status]} | ${c.tf ? `\`${c.tf}\`` : 'none'} | ${cell(c.what)} |\n`;
    for (const p of planned) body += `| \`${p.kind}\` | | Planned | none | ${cell(p.note)} |\n`;
    body += '\n';
  }
  const front = [
    '---',
    'title: Kind catalogue',
    'nav: Catalogue',
    `description: ${JSON.stringify('Every Platform IaC config kind, grouped by product, with its status, whether it has a Terraform resource, and a link to its page.')}`,
    'order: 1',
    'generated: true',
    `sources: ["config-schemas/README.md", "config-schemas/schemas/", "terraform-provider-resolve/examples/resources/", "vdb-site/docs/platform-iac-engine.md"]`,
    `checked: [${[`config-schemas@${schemasVersion}`, ...(providerSha ? [`terraform-provider-resolve@${providerSha}`] : [])].map((c) => JSON.stringify(c)).join(', ')}]`,
    '---',
    '',
    '<!-- Generated by migration/generators/kind-reference.mjs from Vulnetix/config-schemas. Edit the schema, kind-notes.mjs or the generator, not this page. -->',
    '',
  ].join('\n');
  writeFileSync(catOut, front + customerWording(body.trim()) + '\n');
  console.log(`kind-reference: wrote kinds/catalogue.md (${catalogue.length} kinds)`);
}

// ── The Terraform resources page ────────────────────────────────────────────
const tfOut = join(docsRoot, 'terraform', 'resources.md');
if (isGenerated(tfOut)) {
  mkdirSync(join(tfOut, '..'), { recursive: true });
  const withTf = catalogue.filter((c) => c.tf);
  let body = `The \`vulnetix/resolve\` provider has ${withTf.length} resources, one for each kind the engine stores that the provider's \`${providerRefName}\` branch has generated. Each is one \`vulnetix.com/v1\` document of its kind; its arguments are the kind's \`spec\` in snake case, beside \`name\`, \`labels\` and \`annotations\` from \`metadata\`. A kind's page has the resource's **Minimal** and **Advanced** HCL beside the YAML and CLI forms, the fields, and how apply treats it. For install, authentication, state and secrets, see [Terraform and OpenTofu](${TF_PAGE}).\n\n`;
  body += 'Import takes the object\'s name (`metadata.name`); a kind with one object per tenant is named `default`. A secret is a write-only `<name>_wo` argument with a `<name>_wo_version` number.\n\n';
  for (const [group, blurb, ks] of GROUPS) {
    const rowsIn = ks.map((k) => catalogue.find((c) => c.kind === k)).filter(Boolean);
    if (!rowsIn.length) continue;
    body += `## ${group}\n\n| Resource | Kind | Objects | Import | Samples |\n|---|---|---|---|---|\n`;
    for (const c of rowsIn) {
      const slug = kebab(c.kind);
      if (c.tf) {
        const imp = (providerFile(`examples/resources/${c.tf}/import.sh`) ?? '').split('\n').find((l) => l.trim() && !l.startsWith('#')) ?? '';
        body += `| <span id="${c.tf}"></span>\`${c.tf}\` | ${kindLink(c.kind)} | ${c.singleton ? 'one' : 'many'} | ${imp ? '`' + imp.trim() + '`' : ''} | [Minimal](${kindPath(c.kind)}#minimal), [Advanced](${kindPath(c.kind)}#advanced) |\n`;
      } else {
        body += `| none | ${kindLink(c.kind)} | ${c.singleton ? 'one' : 'many'} | | ${c.status === 'validate' ? 'Validate only: the server stores nothing for it, so there is no resource' : 'The provider has no resource for it yet'} |\n`;
      }
    }
    body += '\n';
  }
  const front = [
    '---',
    'title: Terraform resources',
    'nav: Resources',
    `description: ${JSON.stringify('Every resource of the vulnetix/resolve provider with its kind, how many objects a tenant has, its import command, and links to its Minimal and Advanced HCL.')}`,
    'order: 2',
    'generated: true',
    `sources: ["terraform-provider-resolve/examples/resources/", "terraform-provider-resolve/cmd/genresources/served.go", "config-schemas/schemas/"]`,
    `checked: [${[`config-schemas@${schemasVersion}`, ...(providerSha ? [`terraform-provider-resolve@${providerSha}`] : [])].map((c) => JSON.stringify(c)).join(', ')}]`,
    '---',
    '',
    '<!-- Generated by migration/generators/kind-reference.mjs from the provider\'s examples and Vulnetix/config-schemas. Edit the generator, not this page. -->',
    '',
  ].join('\n');
  writeFileSync(tfOut, front + customerWording(body.trim()) + '\n');
  console.log(`kind-reference: wrote terraform/resources.md (${withTf.length} resources)`);
}

// ── The CEL reference page ──────────────────────────────────────────────────
function celExamples() {
  const out = [];
  for (const kind of kinds) {
    for (const c of kindMeta(kind).celFields) {
      const key = c.path.split('.').at(-1);
      const seen = new Set();
      const dir = exampleDir(kind);
      for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => /\.ya?ml$/.test(x)).sort() : []) {
        for (const m of readFileSync(join(dir, f), 'utf8').matchAll(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'gm'))) {
          let v = m[1].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            const q = v[0];
            v = v.slice(1, -1);
            if (q === '"') v = v.replace(/\\"/g, '"'); else v = v.replace(/''/g, "'");
          }
          if (!seen.has(v)) { seen.add(v); out.push({ kind, path: c.path, env: c.env, expr: v, file: `${kind}/${f}` }); }
        }
      }
    }
  }
  return out;
}

if (isGenerated(celOut)) {
  mkdirSync(join(celOut, '..'), { recursive: true });
  const usesTable = celUses
    .map((u) => `| ${kindLink(u.kind)} | \`${u.path}\` | \`${u.ctx}\` | ${u.status === 'served' ? 'Applied by the engine' : u.status === 'validate' ? 'Validate only' : 'Schema only'} |`)
    .join('\n');
  const whereRows = [...new Set(celUses.map((u) => u.kind))]
    .map((k) => {
      const w = CEL_WHERE[k];
      if (!w) throw new Error(`CEL_WHERE has no entry for ${k}, which has a CEL field`);
      const paths = celUses.filter((u) => u.kind === k).map((u) => `\`${u.path}\``);
      return `| ${kindLink(k)} ${paths.join(', ')} | ${w.where} | ${w.fail} |`;
    })
    .join('\n');
  const exRows = celExamples();
  const exampleTable = exRows.map((e) => `| ${kindLink(e.kind)} | \`${e.env}\` | \`${e.expr.replace(/\|/g, '\\|')}\` |`).join('\n');
  const noCel = kinds.filter((k) => !kindMeta(k).celFields.length).length;
  const body = `[CEL](https://cel.dev), the Common Expression Language, is how a config document writes a condition the typed fields cannot. A \`when\` field holds one expression that must return \`bool\`. One Go package, \`github.com/vulnetix/config-schemas/cel\`, compiles and evaluates every expression, in the config engine and in each service that runs the rules, and all of them run the same golden test vectors, so a rule gives the same answer wherever it runs.

\`\`\`yaml
when: severity == 'critical' && (kev || reachable)
\`\`\`

## Which kinds take CEL

${celUses.length} fields in ${new Set(celUses.map((u) => u.kind)).size} of the ${kinds.length} kinds take an expression. They are listed in each schema's \`x-vulnetix.celFields\`, with the context the expression is compiled in. The other ${noCel} kinds have none.

| Kind | Field | Context | Status |
|---|---|---|---|
${usesTable}

Each context has its own variables, listed below. A variable from another context is a type error. The \`event\` context is defined in the package, for Software Factory trigger conditions, but no released kind has a field in it: [\`FactoryTrigger\`](/platform-iac/kinds/factory-trigger/) conditions are typed fields.

## Where each expression is evaluated

The engine type-checks every expression when it plans a document, with the same package that evaluates it, so a stored expression normally compiles at run time too. Where it is then evaluated, and what happens when it cannot be, differs by kind:

| Kind and field | Evaluated | When the expression cannot be evaluated |
|---|---|---|
${whereRows}

> [!CAREFUL] The CLI evaluates no expression
> \`vulnetix config validate\` checks a \`when\` against the schema only (a string of 1 to 4096 characters). Compiling and type-checking happen in \`plan\` on the engine. \`vulnetix jail\` and \`vulnetix scan --jail\` send their facts to the jail evaluator in the VDB API and print its verdict. A suppression's \`when\` is evaluated by the server, not in \`vulnetix scan\`.

### JailPolicy

Jail evaluates \`when\` over the facts it already holds, and those do not carry every \`finding\` variable. A rule is **skipped with a warning** when its \`when\` does not compile, or names a variable the facts of its rule kind lack. Skipping reports a rule that is not running, rather than counting against a zero value and showing a green gate on missing evidence.

${jailTable()}

\`labels\`, \`owner\` and \`criticality\` come from the asset record of the repository being assessed ([\`RepositorySettings\`](/platform-iac/kinds/repository-settings/#asset-labels-owner-and-criticality)), and are empty for a repository with no record. \`epss\`, \`exploitMaturity\`, \`cwe\` and \`internetExposed\` are not available to jail rules. An expression over one of them type-checks, so plan accepts it, and the rule is then skipped with a warning when the gate runs. A fact the expression errors on is not counted, and the rule then reports \`indeterminate\`: \`vulnetix jail\` exits 3, which is neither a pass nor a breach.

### The factory gate

A Software Factory gate node applies a [\`JailPolicy\`](/platform-iac/kinds/jail-policy/) to a scan's findings. A \`COUNT\` rule with \`when\` counts only the scan's finding items (at most 200, from \`scan/findings.json\`) at or above its severity floor for which the condition holds. Items carry id, severity, kind, KEV and package, and \`repo\`, \`labels\`, \`owner\` and \`criticality\` come from the run's repository, so other \`finding\` variables read as zero values. The gate **fails closed**: when the condition cannot be evaluated, or when the scan kept fewer items than it found and the partial count does not already breach a \`GT\` or \`GTE\` threshold, the rule breaches and its label says why. A rule with \`onBreach: warn\` never breaches.

### RiskStrategy

The ranking ladder is a SQL \`CASE\` and cannot run CEL, so each CEL rule is evaluated in Go over the tenant's open findings, most severe first, at most 5000, and the result is cached for 60 seconds. A finding past the cap matches no CEL rule and falls to the rules after it, which is logged. A rule that does not compile matches nothing and is logged. A finding the expression errors on does not match: the rule **fails open**. \`labels\`, \`owner\` and \`criticality\` are filled from each finding's repository asset record; when the records cannot be read, a rule over them matches nothing and the failure is logged.

### Suppression

The suppression engine matches a rule's anchors first, then asks which of the matched findings the \`when\` holds for, over the same facts the ranking ladder reads. An expression that errors on a finding does not select it, so the finding is not suppressed: the rule **fails open**, because an unevaluable condition never suppresses anything. The asset variables (\`labels\`, \`owner\`, \`criticality\`) are filled the same way as for the ranking ladder.

### PackageList

The package firewall evaluates an entry's \`when\` in \`evaluate()\` for the requested version. An entry with no \`when\` always applies. A conditional entry applies when its expression holds. An expression that fails to evaluate is **logged and the entry skipped**, so a broken condition neither blocks nor waives more than was declared.

The proxy has the version's advisory signals (malware, CVSS, EPSS, CESS, KEV, EOL, exploit maturity, bad actor) but not its publish time or version lag, so \`ageDays\` reads \`-1\` and \`versionLag\` reads \`0\`. A conditional entry is judged only where the proxy has the version's signals. The whole-package gates, the cooldown and version-lag waivers, the bad-actor waiver and deny injection for versions with no signal row skip it. A conditional allow entry still lets an \`allowlist_only\` package through to per-version filtering. Entries are stored in \`PackageFirewallListEntry.expr\`, which needs saas migration \`20261225000000_firewall_rule_expr\`: until it runs, an apply that sets a \`when\` is refused with the migration's name.

### AiFirewallPolicy

The AI firewall gateway evaluates a guardrail's \`when\` over the request: its provider, model and client, and the tools, MCP servers and skills it declares. A tool shown being invoked in replayed history is not on offer, so it does not count. A guardrail with no \`when\` always applies. A rule whose \`when\` fails to evaluate is **skipped, named in the decision's skipped list, and logged**: the gateway does not block or flag on a condition it could not judge. Each list is bounded at 256 entries, and a larger request is judged on the first 256.

A guardrail of rule type \`expression\` takes no pattern: its \`when\` is its whole match, it blocks or flags, and it is judged on the capability plane with the tool, MCP server, skill and client lists before content is scanned. Guardrails are stored in \`AiFirewallGuardrail.expr\`, from the same migration as package list entries.

### SsvcPolicy

The SSVC decision evaluates the policy's expressions over the finding, with the repository's asset record, whenever a decision or the summary is read, and the VDB API does the same for each vulnerability of a CLI scan and for the remediation plan when the tenant has stored a policy. An expression that fails to evaluate holds for nothing: the decision point takes its lower value (not exploited, not automatable, partial impact) and the decision is still made. An override whose \`when\` fails does not hold, so the table's outcome stands. The summary decides at most 5000 open findings, most severe first, and is cached for 60 seconds per policy.

### DetectionRuleFeed

The selector is evaluated at every publish, from the console or the engine. The candidates are the newest 5000 generated rules of the feed's format: virtual patches for a block-lane format, countermeasures for a detect-lane one. Each rule is evaluated once per CVE it was written for, and selected when the condition holds for any of them. A rule with no CVE is evaluated once with an empty id and zero scores. A pair the expression errors on does not match; when every pair fails, the publish is refused. The published file holds the explicit entries first, then each selected rule not already among them, up to 500. Selected rules are never written as entries, so the next publish picks up new rules and new KEV listings without an edit to the feed.

## How an expression is checked

| When | What happens |
|---|---|
| \`POST /config/validate\` | The schema checks that the field is a string of 1 to 4096 characters. |
| Plan | The expression is compiled and type-checked in its context. A failure is a blocking condition, \`invalid_cel\`, that names the rule and the position, and blocks the plan. The worst-case cost is estimated with every string and list at its bound, and an expression over the limit is refused. |
| Evaluation | An input past a variable's bound is refused, and evaluation that goes past the cost limit stops. |

Comparisons between \`int\` and \`double\` are allowed, so \`cvss >= 7\` type-checks. Equality between them is not: write \`cvss == 7.0\`. The cel-go extension libraries (strings, math, lists) are not loaded.

### Error codes

| Code | When |
|---|---|
| \`length\` | The expression is longer than the limit. |
| \`syntax\` | It does not parse. |
| \`type\` | It does not type-check: an unknown variable, a variable from another context, or a comparison between the wrong types. |
| \`result_type\` | It type-checks to something other than \`bool\`. |
| \`cost\` | Its estimated cost at compile time, or its actual cost at evaluation, exceeds the limit. |
| \`context\` | An unknown context, or an input of the wrong context. |
| \`input\` | The input exceeds a variable's bound. |
| \`eval\` | Evaluation failed, for example an invalid purl passed to \`matchesPurl\`. |

The codes are stable; the messages are not. Line and column are counted from 1.

## Variables, functions and limits

The tables below are generated from the CEL environments themselves (\`go run ./cmd/celdoc\` in \`config-schemas\`). The top-level names are the variables: write \`severity\`, not \`finding.severity\`. Variables marked Derived are computed from the others. \`now\` is the time of evaluation unless the caller fixes it.

${celdoc('').trim().replace(/^### (`\w+`)$/gm, '### Context $1').replace(/^### Functions$/m, '### Functions').replace(/^### Limits$/m, '### Cost and length limits')}

## Examples

Every expression below is in a released example, and a test in \`config-schemas\` compiles each one in its context.

| Kind | Context | Expression |
|---|---|---|
${exampleTable}

A few more. Each compiles in the context named.

\`\`\`yaml
# finding: glob matches the whole string; * stops at /, ** does not
when: path.glob('services/**/package.json')

# finding: matchesPurl takes a purl pattern; a name ending /* covers a namespace
when: purl.matchesPurl('pkg:npm/@acme/*')

# finding: the repository's asset record (RepositorySettings labels, owner, criticality)
when: criticality in ['high', 'critical'] && labels['tier'] == 'prod'

# package: guard with isSemver before comparing
when: isSemver(version) && semverCompare(version, '2.0.0') < 0

# request: lists take exists, all and in
when: "'filesystem' in mcpServers && tools.exists(t, t.startsWith('mcp__filesystem__write'))"
\`\`\`
`;
  const front = [
    '---',
    'title: CEL rule expressions',
    'nav: CEL',
    `description: ${JSON.stringify('The CEL when and selector expressions in config documents: which kinds take them, where each is evaluated, what happens when one cannot be, every variable per context, the functions, the limits and examples.')}`,
    'order: 3',
    'generated: true',
    `sources: ["config-schemas/cel/README.md", "config-schemas/cel/variables.go", "config-schemas/cel/functions.go", "config-schemas/cel/cost.go", "config-schemas/cmd/celdoc/main.go", "vdb-site/api/internal/handler/risk_cel.go", "vdb-site/api/internal/handler/factory_engine_node_gate.go", "vdb-site/api/internal/handler/detection_rule_feeds_selector.go", "vdb-api/internal/handler/jail_when.go", "vdb-api/internal/handler/jail_eval.go", "package-firewall/internal/policy/condition.go", "ai-firewall/internal/policy/expr.go"]`,
    `checked: [${JSON.stringify(`config-schemas@${schemasVersion}`)}]`,
    '---',
    '',
    '<!-- Generated by migration/generators/kind-reference.mjs from Vulnetix/config-schemas (the x-vulnetix annotations, cel/README.md and cmd/celdoc). Edit the generator, kind-notes.mjs or the cel package, not this page. -->',
    '',
  ].join('\n');
  writeFileSync(celOut, front + customerWording(body.trim()) + '\n');
  console.log(`kind-reference: wrote reference/cel.md`);
}
