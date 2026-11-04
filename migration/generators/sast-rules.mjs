#!/usr/bin/env node
// sast-rules.mjs: write the SAST rule pages from the Vulnetix CLI repository.
//
// Inputs, all in the cli repository:
//   internal/sast/rules/*.rego             each rule's `metadata := {...}` block
//   internal/sast/secretsgen/catalog.json  the catalog-generated secret rules
//                                          (VNX-SEC-081 and up) and their category
//   internal/sast/secretsgen/main.go       category titles and summaries
//   internal/sast/docs/*.md                hand-written prose for each rule
//                                          (optional; --prose to move it)
//
// Outputs, in this repository:
//   src/content/docs/sast/rules.md                    index with a filterable table
//   src/content/docs/sast/rules/<rule-id>.md          one page per rule
//   src/content/docs/sast/rules/secrets.md            secret catalog overview
//   src/content/docs/sast/rules/secrets/<category>.md one table per catalog category
//
// Every page it writes has `generated: true`. Before writing, it deletes the
// pages under sast/rules/ that carry that flag, so a rule removed from the CLI
// loses its page. Hand-written pages without the flag are left alone.
//
// Usage:
//   node migration/generators/sast-rules.mjs [--cli <path>] [--prose <dir>] [--out <dir>]
//
//   --cli    cli repository checkout (default: $VULNETIX_CLI_REPO, else ../cli
//            next to this repository)
//   --prose  directory of hand-written rule pages (default:
//            <cli>/internal/sast/docs). A rule without a prose
//            page gets a page built from its metadata alone.
//   --out    docs root (default: src/content/docs of this repository)
//
// No dependencies beyond Node 20.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { metaDescription } from './description.mjs';
import { join, resolve, dirname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

// GitHub push protection rejects a complete Slack webhook URL even when it is
// the documented placeholder. The rule prose quotes one as a not-flagged
// example, so split it into a concatenation that reads the same.
const pushSafe = (page) => page.replace(
  /"https:\/\/hooks\.slack\.com\/services\/T0{8}\/B0{8}\/X{24}"/g,
  '"https://hooks.slack.com/services/" + "T00000000/B00000000/" + "X" * 24  # the documented placeholder',
);

const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '..', '..');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? resolve(args[i + 1]) : fallback;
};
const cli = opt('cli', process.env.VULNETIX_CLI_REPO ? resolve(process.env.VULNETIX_CLI_REPO) : resolve(root, '..', 'cli'));
const proseDir = opt('prose', join(cli, 'internal', 'sast', 'docs'));
const outRoot = opt('out', join(root, 'src', 'content', 'docs'));
const rulesDir = join(cli, 'internal', 'sast', 'rules');
const catalogPath = join(cli, 'internal', 'sast', 'secretsgen', 'catalog.json');
const secretsgenPath = join(cli, 'internal', 'sast', 'secretsgen', 'main.go');

if (!existsSync(rulesDir)) {
  console.error(`sast-rules: no rules at ${rulesDir}; pass --cli <path to the cli repository>`);
  process.exit(2);
}

// ---------------------------------------------------------------- provenance

const git = (...a) => {
  try { return execFileSync('git', ['-C', cli, ...a], { encoding: 'utf8' }).trim(); } catch { return ''; }
};
const sha = git('rev-parse', '--short=7', 'HEAD') || 'unknown';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The commit date, not today's, so re-running on the same commit changes nothing.
const updated = (() => {
  const iso = git('log', '-1', '--format=%cs', 'HEAD');
  const d = iso ? new Date(`${iso}T00:00:00Z`) : new Date();
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
})();
const checked = [`cli@${sha}`];

// ---------------------------------------------------------------- rule metadata

// The metadata block is a Rego object literal: JSON with trailing commas, and
// occasionally a `# comment` line. Rego strings use JSON escapes.
function parseMetadata(src, file) {
  const start = src.search(/^metadata\s*:=\s*\{/m);
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  let depth = 0, inStr = false, raw = false, end = -1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (raw) { if (c === '`') inStr = false; continue; }
      if (c === '\\') { i++; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; raw = false; continue; }
    if (c === '`') { inStr = true; raw = true; continue; }
    if (c === '#') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
    if (c === '{' || c === '[') depth++;
    if (c === '}' || c === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error(`${file}: unterminated metadata block`);
  let body = src.slice(open, end + 1);
  // Strip comments outside strings, turn raw strings into JSON strings, drop trailing commas.
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"') {
      let j = i + 1;
      while (j < body.length && body[j] !== '"') j += body[j] === '\\' ? 2 : 1;
      out += body.slice(i, j + 1); i = j; continue;
    }
    if (c === '`') {
      const j = body.indexOf('`', i + 1);
      out += JSON.stringify(body.slice(i + 1, j)); i = j; continue;
    }
    if (c === '#') { const nl = body.indexOf('\n', i); i = nl < 0 ? body.length : nl - 1; continue; }
    out += c;
  }
  out = out.replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(out); } catch (e) { throw new Error(`${file}: metadata is not JSON-shaped: ${e.message}`); }
}

const regoFiles = readdirSync(rulesDir).filter((f) => f.endsWith('.rego')).sort();
const rules = [];
for (const f of regoFiles) {
  const src = readFileSync(join(rulesDir, f), 'utf8');
  const m = parseMetadata(src, f);
  if (!m || !m.id) continue; // shared libraries (helpers.rego, lib_secrets.rego) have no id
  rules.push({ ...m, slug: m.id.toLowerCase(), file: f, kind: m.kind || 'sast' });
}

// ---------------------------------------------------------------- secret catalog

const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf8')) : [];
const catalogById = new Map(catalog.filter((e) => !e.deprecated).map((e) => [`vnx-sec-${String(e.id).padStart(3, '0')}`, e]));
// Category titles and summaries, read from the generator that owns them.
const categories = {};
if (existsSync(secretsgenPath)) {
  const go = readFileSync(secretsgenPath, 'utf8');
  for (const m of go.matchAll(/^\s*"([a-z-]+)":\s*\{"([^"]+)",\s*"([^"]+)",\s*(\d+)\}/gm)) {
    categories[m[1]] = { title: m[2].replace(/^Secrets\s*[—-]\s*/, ''), summary: m[3], weight: Number(m[4]) };
  }
}
const strategyLabel = { fixed_prefix: 'keyword + regex', keyword_entropy: 'keyword + regex + entropy', regex_only: 'regex' };

for (const r of rules) {
  const e = catalogById.get(r.slug);
  if (e) { r.category = e.category; r.strategy = e.strategy; r.keywords = e.keywords ?? []; r.entropyMin = e.entropy_min; }
}
const catalogRules = rules.filter((r) => r.category);
const pageRules = rules.filter((r) => !r.category);

// ---------------------------------------------------------------- helpers

const yaml = (s) => JSON.stringify(String(s));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cell = (s) => esc(s).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
const noDash = (s) => String(s ?? '').replace(/\s*—\s*/g, ', ');
const SEV = ['critical', 'high', 'medium', 'low', 'info'];
const sevLabel = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const natural = (a, b) => a.localeCompare(b, 'en', { numeric: true });

// Canonical language keys, as internal/sast/language_filter.go folds them.
const LANG_ALIAS = { node: 'javascript', typescript: 'javascript', js: 'javascript', ts: 'javascript', shell: 'bash', sh: 'bash', golang: 'go', 'c++': 'cpp', 'c#': 'csharp', dotnet: 'csharp', 'objective-c': 'cpp' };
const LANG_NAME = { javascript: 'JavaScript / TypeScript', python: 'Python', java: 'Java', go: 'Go', c: 'C', cpp: 'C++', php: 'PHP', ruby: 'Ruby', kotlin: 'Kotlin', csharp: 'C#', rust: 'Rust', bash: 'Shell', html: 'HTML', terraform: 'Terraform', swift: 'Swift', android: 'Android', docker: 'Dockerfile', xml: 'XML', yaml: 'YAML', config: 'Config files', powershell: 'PowerShell', perl: 'Perl', sql: 'SQL', scala: 'Scala', properties: 'Properties', kubernetes: 'Kubernetes', graphql: 'GraphQL', generic: 'Any file', any: 'Any file' };
const canonLangs = (r) => {
  const ls = (r.languages ?? []).map((l) => LANG_ALIAS[l.toLowerCase()] ?? l.toLowerCase());
  const out = [...new Set(ls.map((l) => (l === 'generic' || l === 'all' ? 'any' : l)))];
  return out.length ? out : ['any'];
};
const langNames = (r) => canonLangs(r).map((l) => LANG_NAME[l] ?? l).join(', ');

// A rule is linked by its id, or by its file stem when the prose predates a
// renumbering (VNX-CWE1025-AUTO is the file of VNX-1025).
const ruleBySlug = (slug) => rules.find((x) => x.slug === slug || basename(x.file, '.rego') === slug);
const ruleHref = (slug) => {
  const r = ruleBySlug(slug);
  if (r) slug = r.slug;
  if (r?.category) return `/sast/rules/secrets/${r.category}/#${slug}`;
  return `/sast/rules/${slug}/`;
};
const cweLinks = (r) => (r.cwe ?? []).map((n) => `[CWE-${n}](https://cwe.mitre.org/data/definitions/${n}.html)`).join(', ');

// ---------------------------------------------------------------- prose

// Links on the old Hugo site that leave the rule pages.
const OLD_LINKS = {
  'cli-reference/sast': '/sast/reference/flags/',
  'cli-reference/scan': '/cli/reference/scan/',
  'cli-reference/secrets': '/secrets/reference/flags/',
  'cli-reference/iac': '/iac-scanning/reference/flags/',
  'cli-reference/containers': '/sca/reference/containers/',
  'cli-reference/ignore': '/sast/guides/suppressing-findings/',
  'enterprise/corporate-proxy': '/cli/get-started/corporate-proxy/',
  'sast-rules/custom-rules': '/sast/guides/custom-rules/',
  'custom-rules': '/sast/guides/custom-rules/',
};
const ACTIVE_TAG = /<(script|style|iframe|object|embed)\b/gi;

function convertProse(md) {
  // Front matter.
  let text = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  const fm = (md.match(/^---\n([\s\S]*?)\n---\n/) ?? [])[1] ?? '';
  const desc = (fm.match(/^description:\s*"((?:[^"\\]|\\.)*)"/m) ?? [])[1];
  const lines = text.split('\n');
  const out = [];
  let fence = null;
  for (const line of lines) {
    const t = line.trim();
    const fm2 = t.match(/^(```+|~~~+)/);
    if (fm2) {
      if (!fence) fence = fm2[1][0];
      else if (t.startsWith(fence)) fence = null;
      out.push(line);
      continue;
    }
    // Code keeps its text, except an em dash in a comment, which reads the same as a comma.
    if (fence || line.startsWith("    ") || line.startsWith("\t")) { out.push(line.replace(/ +— +/g, ", ")); continue; }
    // The metadata table at the top of the generated page replaces this line.
    if (/^\*\*Severity:\*\*/.test(t)) continue;
    let l = line
      .replace(/^(#{1,6} .*?)\s*\{#[^}]+\}\s*$/, '$1')
      // The rule prose uses title case for its stock headings; the docs use sentence case.
      .replace(/^(#{2,3} )(What Gets Flagged|Why This Matters|What Is Not Flagged|What Does Not Get Flagged)\s*$/, (_, h, t) => h + t[0] + t.slice(1).toLowerCase())
      .replace(/\]\((?:\.\.\/)?(vnx-[a-z0-9-]+)\/?(#[^)]*)?\)/gi, (_, s, h) => `](${h && !ruleBySlug(s.toLowerCase())?.category ? `/sast/rules/${ruleBySlug(s.toLowerCase())?.slug ?? s.toLowerCase()}/${h}` : ruleHref(s.toLowerCase())})`)
      .replace(/\]\((?:\.\.\/)+([a-z-]+(?:\/[a-z0-9-]+)*)\/?(#[^)]*)?\)/g, (m, p, h) => (OLD_LINKS[p] ? `](${OLD_LINKS[p]}${h ?? ''})` : m))
      .replace(/\]\((custom-rules)\/?\)/g, '](/sast/guides/custom-rules/)')
      .replace(/\]\(\.\.\/\)/g, '](/sast/rules/)');
    // Keep prose free of em dashes, and of tags the page would execute.
    l = l.split(/(`+[^`]*`+)/).map((part, i) => (i % 2 ? part : noDash(part).replace(ACTIVE_TAG, '&lt;$1'))).join('');
    out.push(l);
  }
  return { body: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(), description: desc && JSON.parse(`"${desc}"`) };
}

function firstSentence(s) {
  const m = String(s).match(/^(.{40,}?[.!?])(\s|$)/);
  const one = (m ? m[1] : String(s)).trim();
  return one.length > 300 ? `${one.slice(0, 297).replace(/\s+\S*$/, '')}...` : one;
}

function metaTable(r) {
  const rows = [
    ['Rule ID', `\`${r.id}\``],
    ['Severity', sevLabel(r.severity)],
    ['SARIF level', r.level ? `\`${r.level}\`` : `derived from severity`],
    ['Kind', `\`${r.kind}\``],
    ['Languages', langNames(r)],
    ['CWE', cweLinks(r) || 'none'],
  ];
  if (r.capec?.length) rows.push(['CAPEC', r.capec.map((c) => `[${c}](https://capec.mitre.org/data/definitions/${c.replace(/^CAPEC-/, '')}.html)`).join(', ')]);
  if (r.attack_technique?.length) rows.push(['ATT&CK', r.attack_technique.map((t) => `[${t}](https://attack.mitre.org/techniques/${t.replace('.', '/')}/)`).join(', ')]);
  if (r.cwss) rows.push(['CWSS vector', `\`${r.cwss}\``]);
  if (r.cvssv4) rows.push(['CVSS v4', `\`${r.cvssv4}\``]);
  if (r.tags?.length) rows.push(['Tags', r.tags.map((t) => `\`${t}\``).join(' ')]);
  rows.push(['Source', `[\`internal/sast/rules/${r.file}\`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/${r.file})`]);
  return ['| Field | Value |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join('\n');
}

function frontmatter({ title, description, order, nav, sources }) {
  return [
    '---',
    `title: ${yaml(title)}`,
    nav ? `nav: ${yaml(nav)}` : null,
    `description: ${yaml(description)}`,
    `order: ${order}`,
    `sources: [${sources.map(yaml).join(', ')}]`,
    `checked: [${checked.map(yaml).join(', ')}]`,
    `updated: ${yaml(updated)}`,
    'generated: true',
    '---',
    '',
  ].filter((l) => l !== null).join('\n');
}

// ---------------------------------------------------------------- clean

const outRules = join(outRoot, 'sast', 'rules');
const isGenerated = (p) => /^generated:\s*true\s*$/m.test((readFileSync(p, 'utf8').match(/^---\n([\s\S]*?)\n---/) ?? [])[1] ?? '');
function clean(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) clean(p);
    else if (name.endsWith('.md') && isGenerated(p)) rmSync(p);
  }
}
clean(outRules);
mkdirSync(join(outRules, 'secrets'), { recursive: true });

// ---------------------------------------------------------------- rule pages

pageRules.sort((a, b) => natural(a.slug, b.slug));
let withProse = 0;
pageRules.forEach((r, i) => {
  // Old pages are named by rule id, except a few named by file (vnx-cwe1021-auto.md for VNX-1021).
  const prosePath = [r.slug, basename(r.file, '.rego')].map((n) => join(proseDir, `${n}.md`)).find((p) => existsSync(p));
  const prose = prosePath ? convertProse(readFileSync(prosePath, 'utf8')) : null;
  if (prose) withProse++;
  const description = metaDescription(noDash(prose?.description || firstSentence(r.description || r.name)));
  const sources = [`cli/internal/sast/rules/${r.file}`];
  if (prose) sources.push(`cli/internal/sast/docs/${basename(prosePath)}`);
  const body = prose?.body || ['## Overview', '', esc(noDash(r.description || r.name))].join('\n');
  const page = [
    frontmatter({ title: `${r.id}: ${noDash(r.name)}`, nav: r.id, description, order: 100 + i, sources }),
    metaTable(r),
    '',
    body,
    '',
    '## Suppressing this rule',
    '',
    'Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file\'s language (`#`, `//`, `--` or `;`):',
    '',
    '```text',
    `# nosec ${r.slug}`,
    `// nosec ${r.slug}`,
    '```',
    '',
    `Or record an ignore rule: \`vulnetix ignore add --rule ${r.slug} --reason "..."\`. See [Suppressing findings](/sast/guides/suppressing-findings/).`,
    '',
  ].join('\n');
  writeFileSync(join(outRules, `${r.slug}.md`), pushSafe(page));
});

// ---------------------------------------------------------------- secret category pages

const cats = Object.entries(categories).sort((a, b) => a[1].weight - b[1].weight);
const byCat = {};
for (const r of catalogRules) (byCat[r.category] ??= []).push(r);
let catOrder = 2;
for (const [key, c] of cats) {
  const rs = (byCat[key] ?? []).sort((a, b) => natural(a.slug, b.slug));
  if (!rs.length) continue;
  const rows = rs.map((r) => `| <a id="${r.slug}"></a>\`${r.id}\` | ${cell(r.name)} | ${sevLabel(r.severity)} | ${strategyLabel[r.strategy] ?? cell(r.strategy)} | ${(r.keywords ?? []).slice(0, 6).map((k) => `\`${String(k).replace(/[`|]/g, '')}\``).join(' ')} | ${(r.cwe ?? []).map((n) => `CWE-${n}`).join(', ')} |`);
  const page = [
    frontmatter({ title: `Secret rules: ${c.title}`, nav: c.title, description: noDash(c.summary), order: catOrder++, sources: ['cli/internal/sast/secretsgen/catalog.json', 'cli/internal/sast/secretsgen/main.go'] }),
    `${rs.length} rules, kind \`secrets\`. They run under \`vulnetix secrets\` and the secrets stage of \`vulnetix scan\`, not under \`vulnetix sast\`. Each is generated from one entry in \`internal/sast/secretsgen/catalog.json\`.`,
    '',
    'Detection: `keyword` means the pattern is tried only on lines that contain one of the listed keywords (case-insensitive); `entropy` means the matched token must also reach the entry\'s minimum Shannon entropy. Every catalog rule skips test files, lockfiles, minified and generated files, and paths under `testdata/`, `fixtures/`, `vendor/`, `node_modules/`, `dist/`, `build/` and `src/test/` (the `skip_path` list in `internal/sast/rules/lib_secrets.rego`), and documented example tokens.',
    '',
    '| Rule ID | Name | Severity | Detection | Keywords | CWE |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    'Suppress one with `// nosec <rule-id>` on the line, or `vulnetix ignore add --rule <rule-id>`. See [Suppressing findings](/sast/guides/suppressing-findings/).',
    '',
  ].join('\n');
  writeFileSync(join(outRules, 'secrets', `${key}.md`), page);
}

// Secret catalog overview.
{
  const handWritten = pageRules.filter((r) => r.kind === 'secrets');
  const rows = cats.filter(([k]) => byCat[k]?.length).map(([k, c]) => `| [${c.title}](/sast/rules/secrets/${k}/) | ${byCat[k].length} | ${cell(noDash(c.summary))} |`);
  const page = [
    frontmatter({ title: 'Secret detection rules', nav: 'Secret rules', description: 'The built-in rules of kind secrets: hand-written rules with their own pages, and the catalog-generated rules grouped by provider category.', order: 1, sources: ['cli/internal/sast/secretsgen/catalog.json', 'cli/internal/sast/secretsgen/main.go', 'cli/internal/sast/kinds.go'] }),
    `${handWritten.length + catalogRules.length} built-in rules have kind \`secrets\`. They are evaluated by \`vulnetix secrets\` and by \`vulnetix scan\`; \`vulnetix sast\` does not run them. Secret rules declare no languages, so every one reads every text file.`,
    '',
    '## Hand-written rules',
    '',
    `${handWritten.length} rules with their own page, listed in the [rules index](/sast/rules/) with kind \`secrets\`. They cover the common providers with context checks (an SDK reference near the key, documented example keys excluded) that a catalog entry cannot express.`,
    '',
    '## Catalog rules by category',
    '',
    `${catalogRules.length} rules generated by \`go run ./internal/sast/secretsgen\` (\`just gen-secrets\`) from \`internal/sast/secretsgen/catalog.json\`.`,
    '',
    '| Category | Rules | Covers |',
    '|---|---|---|',
    ...rows,
    '',
  ].join('\n');
  writeFileSync(join(outRules, 'secrets.md'), page);
}

// ---------------------------------------------------------------- index

{
  const all = [...rules].sort((a, b) => natural(a.slug, b.slug));
  const langCount = {};
  for (const r of all) for (const l of canonLangs(r)) langCount[l] = (langCount[l] ?? 0) + 1;
  const kindCount = {};
  for (const r of all) kindCount[r.kind] = (kindCount[r.kind] ?? 0) + 1;
  const sevCount = {};
  for (const r of all) sevCount[r.severity] = (sevCount[r.severity] ?? 0) + 1;
  const langs = Object.keys(langCount).sort((a, b) => (LANG_NAME[a] ?? a).localeCompare(LANG_NAME[b] ?? b));
  const kinds = Object.keys(kindCount).sort();

  const opt = (v, label) => `<option value="${esc(v)}">${esc(label)}</option>`;
  const rows = all.map((r) => {
    const l = canonLangs(r);
    const cwe = (r.cwe ?? []).map((n) => `CWE-${n}`);
    return `<tr data-lang="${l.join(' ')}" data-sev="${esc(r.severity)}" data-kind="${esc(r.kind)}" data-cwe="${cwe.join(' ').toLowerCase()}"><td><a href="${ruleHref(r.slug)}"><code>${esc(r.id)}</code></a></td><td>${esc(noDash(r.name))}</td><td>${esc(sevLabel(r.severity))}</td><td>${esc(r.kind)}</td><td>${esc(langNames(r))}</td><td>${esc(cwe.join(', '))}</td></tr>`;
  });

  const page = [
    frontmatter({ title: 'SAST rules index', nav: 'Rules index', description: 'Every built-in Rego rule the Vulnetix CLI ships, filterable by language, severity, kind and CWE.', order: 1, sources: ['cli/internal/sast/rules/', 'cli/internal/sast/language_filter.go', 'cli/internal/sast/kinds.go'] }),
    `The CLI embeds ${all.length} rules from \`internal/sast/rules/\`. \`vulnetix sast\` runs the ${kindCount.sast ?? 0} of kind \`sast\`; the other kinds run under their own commands and under \`vulnetix scan\`. Print the same list from the binary you have with \`vulnetix sast --list-default-rules\`.`,
    '',
    '| Kind | Rules | Command |',
    '|---|---|---|',
    ...kinds.map((k) => `| \`${k}\` | ${kindCount[k]} | ${{ sast: '`vulnetix sast`', secrets: '`vulnetix secrets`', oci: '`vulnetix containers`', iac: '`vulnetix iac`' }[k] ?? '`vulnetix scan`'} |`),
    '',
    '| Severity | Rules |',
    '|---|---|',
    ...SEV.filter((s) => sevCount[s]).map((s) => `| ${sevLabel(s)} | ${sevCount[s]} |`),
    '',
    'Rule counts by language (a rule that names several languages counts once in each):',
    '',
    '| Language | Rules |',
    '|---|---|',
    ...langs.map((l) => `| ${LANG_NAME[l] ?? l} | ${langCount[l]} |`),
    '',
    `Catalog secret rules (VNX-SEC-081 and up) link to a row on their [category page](/sast/rules/secrets/); every other rule has its own page.`,
    '',
    '## Find a rule',
    '',
    '<div class="rule-filter" data-rule-filter>',
    `<label>Search <input type="search" data-f="q" placeholder="ID or name"></label>`,
    `<label>Language <select data-f="lang"><option value="">All</option>${langs.map((l) => opt(l, LANG_NAME[l] ?? l)).join('')}</select></label>`,
    `<label>Severity <select data-f="sev"><option value="">All</option>${SEV.filter((s) => sevCount[s]).map((s) => opt(s, sevLabel(s))).join('')}</select></label>`,
    `<label>Kind <select data-f="kind"><option value="">All</option>${kinds.map((k) => opt(k, k)).join('')}</select></label>`,
    `<label>CWE <input type="search" data-f="cwe" placeholder="e.g. 89" inputmode="numeric"></label>`,
    `<output data-count>${all.length} rules</output>`,
    '</div>',
    '',
    '<table data-rule-table>',
    '<thead><tr><th>Rule</th><th>Name</th><th>Severity</th><th>Kind</th><th>Languages</th><th>CWE</th></tr></thead>',
    '<tbody>',
    ...rows,
    '</tbody>',
    '</table>',
    '',
    '<script>',
    '(() => {',
    "  const box = document.querySelector('[data-rule-filter]');",
    "  const rows = [...document.querySelectorAll('[data-rule-table] tbody tr')];",
    "  const count = box.querySelector('[data-count]');",
    "  const val = (k) => box.querySelector(`[data-f=\"${k}\"]`).value.trim().toLowerCase();",
    '  const apply = () => {',
    "    const q = val('q'), lang = val('lang'), sev = val('sev'), kind = val('kind'), cwe = val('cwe').replace(/^cwe-?/, '');",
    '    let n = 0;',
    '    for (const tr of rows) {',
    "      const ok = (!q || tr.textContent.toLowerCase().includes(q))",
    "        && (!lang || tr.dataset.lang.split(' ').includes(lang))",
    '        && (!sev || tr.dataset.sev === sev)',
    '        && (!kind || tr.dataset.kind === kind)',
    "        && (!cwe || tr.dataset.cwe.split(' ').includes(`cwe-${cwe}`));",
    "      tr.hidden = !ok; if (ok) n++;",
    '    }',
    "    count.textContent = `${n} of ${rows.length} rules`;",
    "    const p = new URLSearchParams(); for (const k of ['q', 'lang', 'sev', 'kind', 'cwe']) if (val(k)) p.set(k, val(k));",
    "    history.replaceState(null, '', p.size ? `?${p}` : location.pathname);",
    '  };',
    '  const init = new URLSearchParams(location.search);',
    "  for (const el of box.querySelectorAll('[data-f]')) { if (init.get(el.dataset.f)) el.value = init.get(el.dataset.f); el.addEventListener('input', apply); }",
    '  apply();',
    '})();',
    '</script>',
    '',
    'Filters are kept in the address bar, so a filtered view can be linked: `/sast/rules/?lang=go&sev=high`.',
    '',
  ].join('\n');
  writeFileSync(join(outRoot, 'sast', 'rules.md'), page);
}

console.log(`sast-rules: ${rules.length} rules from cli@${sha}: ${pageRules.length} rule pages (${withProse} with prose), ${catalogRules.length} catalog secret rules on ${Object.keys(byCat).length} category pages, index at sast/rules.md`);
