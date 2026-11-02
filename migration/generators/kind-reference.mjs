#!/usr/bin/env node
// kind-reference.mjs: write one Platform IaC reference page per config kind.
//
// Reads every <Kind>.schema.json in a checkout of Vulnetix/config-schemas and
// writes src/content/docs/platform-iac/kinds/<kebab-kind>.md: a table of every
// field (path, type, required, default, allowed values, description) and the
// examples from examples/<Kind>/*.yaml. The schemas are the source of truth, so
// the page cannot drift from what `vulnetix config validate` accepts.
//
// Usage:
//   node migration/generators/kind-reference.mjs [path/to/config-schemas]
//
// The default checkout is ../config-schemas next to this repository, or
// $CONFIG_SCHEMAS_DIR. A page whose front matter lacks `generated: true` is a
// hand-written page and is never overwritten.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../..', import.meta.url).pathname;
const schemasRepo = process.argv[2] ?? process.env.CONFIG_SCHEMAS_DIR ?? join(root, '..', 'config-schemas');
const schemaDir = join(schemasRepo, 'schemas');
const outDir = join(root, 'src', 'content', 'docs', 'platform-iac', 'kinds');
const RELEASES = 'https://github.com/Vulnetix/config-schemas/releases';
const DEV = `${RELEASES}/download/v0.0.0-dev/`;

if (!existsSync(schemaDir)) {
  console.error(`kind-reference: no schemas/ in ${schemasRepo}; pass the config-schemas checkout as the first argument`);
  process.exit(2);
}

// ── Per-kind notes the schema cannot carry ──────────────────────────────────
// Facts checked against other repositories (where a field is enforced, how to
// set it today). Keyed by kind; `fields` adds a CAREFUL note under a field row
// table, `after` is Markdown placed after the field reference.
const NOTES = {
  QualityGate: {
    sources: ['cli/cmd/config.go', 'cli/cmd/scan.go', 'cli/cmd/quality_gate_enforce.go', 'cli/internal/scan/eol_severity.go', 'vdb-api/internal/handler/v2_cli_quality_gate.go', 'vdb-api/internal/handler/cli_persist_eol.go', 'saas/prisma/models/quality-gate.prisma'],
    desc: {
      spec: 'The gate settings. Every field is optional.',
      'spec.eol.severities.nextQuarter': 'Severity for a dependency whose end of life falls in the next calendar quarter.',
      'spec.eol.severities.thisQuarter': 'Severity for a dependency whose end of life falls in the current calendar quarter.',
      'spec.eol.severities.within30Days': 'Severity for a dependency whose end of life is within the next 30 days.',
      'spec.eol.severities.retired': 'Severity for a dependency already past its end of life.',
    },
    intro:
      'One per tenant, so `metadata.name` is always `default`. Each `spec` field is optional: a field you leave out leaves the matching `vulnetix scan` flag in charge. A field you set overrides that flag for every authenticated scan in the organization.',
    fields: {
      'spec.versionLag':
        'The schema description says "more than this many releases behind the newest". The CLI gate does the opposite: `vulnetix scan --version-lag N` fails a dependency whose installed version is one of the N most recently published versions (`cli/cmd/scan.go`). The CLI behaviour is what runs. A schema fix is pending in `Vulnetix/config-schemas`.',
      'spec.eol.block':
        'The description is true of the CLI gate only: `vulnetix scan` reads the horizon severities only when the EOL gate is on. On the platform, once the organization has a quality gate record, uploaded scans get a synthetic `VULNETIX-EOL` finding at the horizon severity whatever `block` says (`vdb-api/internal/handler/cli_persist_eol.go`).',
      'spec.scaAutofix.maxMajorBump':
        'The `--sca-autofix-max-major-bump` scan flag also accepts a negative number, meaning no limit. The schema has `minimum: 0`, so a document cannot express "no limit"; leave the field out to keep the flag in charge.',
    },
    after: `## Set these values today

There is no \`vulnetix config apply\` yet (see [Planned](/platform-iac/planned/roadmap/)). The same values are stored by the imperative commands. Each field maps to one flag:

| Field | Command and flag | Scan flag it overrides |
|---|---|---|
| \`spec.severity\` | \`vulnetix config set quality-gate --severity\` | \`--severity\` |
| \`spec.exploits\` | \`vulnetix config set quality-gate --exploits\` | \`--exploits\` |
| \`spec.blockMalware\` | \`vulnetix config set quality-gate --block-malware\` | \`--block-malware\` |
| \`spec.blockUnpinned\` | \`vulnetix config set quality-gate --block-unpinned\` | \`--block-unpinned\` |
| \`spec.cooldownDays\` | \`vulnetix config set quality-gate --cooldown\` | \`--cooldown\` |
| \`spec.versionLag\` | \`vulnetix config set quality-gate --version-lag\` | \`--version-lag\` |
| \`spec.eol.block\` | \`vulnetix config set quality-gate --block-eol\` | \`--block-eol\` |
| \`spec.eol.severities.nextQuarter\` | \`vulnetix config set eol-policy --next-quarter-severity\` | none |
| \`spec.eol.severities.thisQuarter\` | \`vulnetix config set eol-policy --this-quarter-severity\` | none |
| \`spec.eol.severities.within30Days\` | \`vulnetix config set eol-policy --within-30-days-severity\` | none |
| \`spec.eol.severities.retired\` | \`vulnetix config set eol-policy --retired-severity\` | none |
| \`spec.scaAutofix.strategy\` | \`vulnetix config set quality-gate --sca-autofix-strategy\` | \`--sca-autofix-strategy\` |
| \`spec.scaAutofix.maxMajorBump\` | \`vulnetix config set quality-gate --sca-autofix-max-major-bump\` | \`--sca-autofix-max-major-bump\` |

The \`strict.yaml\` example above, written with the imperative commands:

\`\`\`sh
vulnetix config set quality-gate --severity high --exploits active \\
  --block-malware true --block-unpinned true --cooldown 7 --block-eol true \\
  --sca-autofix-strategy safest --sca-autofix-max-major-bump 0
vulnetix config set eol-policy --next-quarter-severity skip --this-quarter-severity low \\
  --within-30-days-severity high --retired-severity critical
\`\`\`

\`vulnetix config get quality-gate\` shows what is stored. See [Imperative commands](/platform-iac/cli/imperative-commands/) for every flag and the \`null\` value that unsets a field.`,
  },
};

// ── Schema loading and $ref resolution ──────────────────────────────────────
const files = readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json')).sort();
const docs = Object.fromEntries(files.map((f) => [f, JSON.parse(readFileSync(join(schemaDir, f), 'utf8'))]));
const kinds = files.filter((f) => f !== 'common.schema.json').map((f) => basename(f, '.schema.json'));

// Resolve a $ref relative to the file it appears in. Returns [schema, file, name]
// where name is the $defs key, used to label shared types.
function resolve(ref, inFile) {
  const [filePart, pointer = ''] = ref.split('#');
  const file = filePart ? basename(filePart.replace(DEV, '')) : inFile;
  let node = docs[file];
  if (!node) throw new Error(`unresolved $ref ${ref} in ${inFile}`);
  const parts = pointer.split('/').filter(Boolean);
  for (const p of parts) node = node[p];
  if (!node) throw new Error(`unresolved $ref ${ref} in ${inFile}`);
  return [node, file, parts.at(-1)];
}

// Flatten a schema node: follow $ref and merge allOf, keeping the outer
// description. Returns { schema, file, defName }.
function flatten(s, file) {
  let out = { ...s };
  let defName;
  let atFile = file;
  if (out.$ref) {
    const [target, tFile, name] = resolve(out.$ref, file);
    defName = name;
    const inner = flatten(target, tFile);
    const { $ref, ...rest } = out;
    out = { ...inner.schema, ...rest };
    atFile = inner.file;
    defName = inner.defName ?? defName;
  }
  if (out.allOf) {
    const merged = { ...out };
    delete merged.allOf;
    for (const part of out.allOf) {
      const f = flatten(part, atFile).schema;
      merged.properties = { ...(merged.properties ?? {}), ...mergeProps(merged.properties, f.properties, atFile) };
      for (const [k, v] of Object.entries(f)) {
        if (k === 'properties') continue;
        if (k === 'required') merged.required = [...new Set([...(merged.required ?? []), ...v])];
        else if (merged[k] === undefined) merged[k] = v;
      }
    }
    out = merged;
  }
  return { schema: out, file: atFile, defName };
}

function mergeProps(base = {}, add = {}, file) {
  const out = { ...base };
  for (const [k, v] of Object.entries(add ?? {})) out[k] = out[k] ? { allOf: [out[k], v] } : v;
  return out;
}

// ── Field rows ──────────────────────────────────────────────────────────────
const code = (s) => '`' + String(s).replace(/`/g, '') + '`';
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();

function typeOf(s) {
  if (s.const !== undefined) return typeof s.const === 'string' ? 'string' : typeof s.const;
  if (Array.isArray(s.type)) return s.type.join(' or ');
  if (s.type === 'array') return `array of ${s.items ? typeOf(flatten(s.items, '').schema) : 'any'}`;
  if (s.type) return s.type;
  if (s.enum) return 'string';
  return 'any';
}

function allowed(s) {
  const out = [];
  if (s.const !== undefined) out.push(`exactly ${code(s.const)}`);
  if (s.enum) out.push(s.enum.map(code).join(', '));
  if (s.pattern) out.push(`pattern ${code(s.pattern)}`);
  if (s.format) out.push(`format ${code(s.format)}`);
  if (s.minimum !== undefined && s.maximum !== undefined) out.push(`${s.minimum} to ${s.maximum}`);
  else if (s.minimum !== undefined) out.push(`>= ${s.minimum}`);
  else if (s.maximum !== undefined) out.push(`<= ${s.maximum}`);
  if (s.minLength !== undefined || s.maxLength !== undefined) out.push(`length ${s.minLength ?? 0} to ${s.maxLength ?? 'any'}`);
  if (s.minProperties !== undefined || s.maxProperties !== undefined) out.push(`${s.minProperties ?? 0} to ${s.maxProperties ?? 'any'} keys`);
  if (s.type === 'object' && s.additionalProperties && typeof s.additionalProperties === 'object') {
    const v = flatten(s.additionalProperties, '').schema;
    out.push(`map of string to ${typeOf(v)}${v.maxLength ? ` (max ${v.maxLength} chars)` : ''}`);
    if (s.propertyNames?.pattern) out.push(`keys match ${code(s.propertyNames.pattern)}`);
  }
  if (s.type === 'object' && s.additionalProperties === false && s.properties) out.push('no other keys');
  return out.join('; ');
}

function rows(s, file, path, required, acc) {
  const f = flatten(s, file);
  const node = f.schema;
  if (path) {
    acc.push({
      path,
      type: typeOf(node),
      required,
      def: node.default,
      allowed: allowed(node),
      desc: node.description ?? '',
    });
  }
  if (node.properties) {
    const req = new Set(node.required ?? []);
    for (const [k, v] of Object.entries(node.properties)) {
      if (k === '$schema') continue;
      rows(v, f.file, path ? `${path}.${k}` : k, req.has(k), acc);
    }
  }
  return acc;
}

// ── Release lookup ──────────────────────────────────────────────────────────
function git(...args) {
  try {
    return execFileSync('git', ['-C', schemasRepo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}
const tags = git('tag', '--list', 'v*.*.*').split('\n').filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
tags.sort((a, b) => {
  const pa = a.slice(1).split('.').map(Number), pb = b.slice(1).split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
});
const head = git('rev-parse', '--short=7', 'HEAD');

function releasesOf(kind) {
  const f = `schemas/${kind}.schema.json`;
  const have = tags.filter((t) => git('ls-tree', '--name-only', t, f) === f);
  const newest = have.at(-1);
  const same = newest ? git('show', `${newest}:${f}`) === readFileSync(join(schemasRepo, f), 'utf8').trim() : false;
  return { first: have[0], newest, same };
}

// ── Pages ───────────────────────────────────────────────────────────────────
const kebab = (k) => k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

mkdirSync(outDir, { recursive: true });
let order = 10;
for (const kind of kinds) {
  const file = `${kind}.schema.json`;
  const schema = docs[file];
  const notes = NOTES[kind] ?? {};
  const out = join(outDir, `${kebab(kind)}.md`);
  if (existsSync(out) && !/^generated: true$/m.test(readFileSync(out, 'utf8').split('\n---')[0])) {
    console.warn(`kind-reference: ${out} is hand-written; not overwritten`);
    continue;
  }
  const rel = releasesOf(kind);
  const pinned = rel.newest ? `${RELEASES}/download/${rel.newest}/${file}` : null;
  const singleton = JSON.stringify(schema.properties?.metadata ?? {}).includes('singletonMetadata');
  const fields = rows(schema, file, '', false, []);
  for (const r of fields) {
    if (r.path === 'kind' && !r.desc) r.desc = `Always ${kind}.`;
    if (notes.desc?.[r.path]) r.desc = r.desc ? `${r.desc} ${notes.desc[r.path]}` : notes.desc[r.path];
  }
  for (const p of Object.keys(notes.desc ?? {})) if (!fields.some((r) => r.path === p)) throw new Error(`NOTES.${kind}.desc: no field ${p}`);

  let body = '';
  body += `${schema.description}\n\n`;
  if (notes.intro) body += `${notes.intro}\n\n`;
  body += '| | |\n|---|---|\n';
  body += `| \`apiVersion\` | \`vulnetix.com/v1\` |\n| \`kind\` | \`${kind}\` |\n`;
  body += `| Objects per tenant | ${singleton ? 'one (`metadata.name: default`)' : 'many, keyed by `metadata.name`'} |\n`;
  if (pinned) body += `| Pinned schema | [\`${rel.newest}/${file}\`](${pinned}) |\n`;
  body += `| Newest schema | [\`latest/${file}\`](${RELEASES}/latest/download/${file}) |\n`;
  if (rel.first) body += `| First released in | [\`${rel.first}\`](${RELEASES}/tag/${rel.first}) |\n`;
  body += `| Print the built-in copy | \`vulnetix config schema ${kind}\` |\n`;
  body += `| Apply to a tenant | Planned. See [Planned](/platform-iac/planned/roadmap/). |\n\n`;
  if (!rel.newest) body += `> [!CAREFUL] Not released yet\n> \`${kind}\` is in the \`config-schemas\` source tree but in no release, so no released CLI accepts it.\n\n`;
  else if (!rel.same) body += `> [!CAREFUL] Unreleased changes\n> This page is generated from \`config-schemas@${head}\`, which differs from the \`${rel.newest}\` release. The CLI accepts the release.\n\n`;

  body += '## Fields\n\n';
  body += 'Paths use dots for nesting. **Required** means required whenever the parent object is present. A default is what the server uses when the field is left out.\n\n';
  body += '| Field | Type | Required | Default | Allowed values | Description |\n|---|---|---|---|---|---|\n';
  for (const r of fields) {
    body += `| <span id="${r.path.replace(/\./g, '-')}"></span>${code(r.path)} | ${cell(r.type)} | ${r.required ? 'yes' : 'no'} | ${r.def === undefined ? '' : code(r.def)} | ${cell(r.allowed)} | ${cell(r.desc)} |\n`;
  }
  body += '\n';
  for (const [path, note] of Object.entries(notes.fields ?? {})) {
    if (!fields.some((r) => r.path === path)) throw new Error(`NOTES.${kind}.fields: no field ${path}`);
    body += `> [!CAREFUL] \`${path}\`\n> ${note}\n\n`;
  }

  const exDir = join(schemasRepo, 'examples', kind);
  const examples = existsSync(exDir) ? readdirSync(exDir).filter((f) => /\.ya?ml$/.test(f)).sort() : [];
  if (examples.length) {
    body += '## Examples\n\n';
    for (const ex of examples) {
      body += `\`examples/${kind}/${ex}\` from \`Vulnetix/config-schemas\`:\n\n`;
      body += '```yaml\n' + readFileSync(join(exDir, ex), 'utf8').trim() + '\n```\n\n';
    }
    body += `Check a file like this one with \`vulnetix config validate -f <file>\`. See [Validate documents](/platform-iac/cli/validate/).\n\n`;
  }
  if (notes.after) body += notes.after.trim() + '\n';

  const sources = [`config-schemas/schemas/${file}`, 'config-schemas/schemas/common.schema.json', ...examples.map((e) => `config-schemas/examples/${kind}/${e}`), ...(notes.sources ?? [])];
  const front = [
    '---',
    `title: ${JSON.stringify(kind)}`,
    `description: ${JSON.stringify(`Every field of the ${kind} config kind, with types, defaults and allowed values, generated from its JSON Schema.`)}`,
    `order: ${order++}`,
    'generated: true',
    `sources: [${sources.map((s) => JSON.stringify(s)).join(', ')}]`,
    `checked: [${JSON.stringify(`config-schemas@${head}`)}]`,
    '---',
    '',
    '<!-- Generated by migration/generators/kind-reference.mjs from Vulnetix/config-schemas. Edit the schema or the generator, not this page. -->',
    '',
  ].join('\n');
  writeFileSync(out, front + body.trim() + '\n');
  console.log(`kind-reference: wrote ${out.replace(root, '')} (${fields.length} fields)`);
}
