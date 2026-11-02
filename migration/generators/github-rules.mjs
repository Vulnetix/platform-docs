#!/usr/bin/env node
// github-rules.mjs: write the GitHub posture rule pages (VNX-GH-*) from the
// Vulnetix CLI repository.
//
// Where the rules come from:
//   The rule catalogue lives in vdb-sca-match/ghaudit (rules_workflows.go,
//   rules_actions.go, rules_settings.go, rules_org.go). The CLI renders one
//   Hugo page per rule from it with internal/ghtasks/docs.go (RuleDocs), and
//   TestGitHubRuleDocs fails when website/content/docs/github-rules/ is stale
//   against the vdb-sca-match version pinned in the CLI's go.mod
//   (`GHRULES_UPDATE=1 go test ./internal/ghtasks/` rewrites them).
//
//   This script reads those rendered pages from a git ref of the cli
//   repository (default origin/main), so it needs no Go toolchain and no access
//   to the private vdb-sca-match module. With --verify it also runs
//   TestGitHubRuleDocs in the checkout first, which needs both.
//
// Outputs, in this repository:
//   src/content/docs/cli/github-rules/overview.md        rule index
//   src/content/docs/cli/github-rules/vnx-gh-<nnn>.md    one page per rule
//
// Every page it writes has `generated: true`. Before writing, it deletes the
// pages under cli/github-rules/ that carry that flag, so a rule removed from
// the catalogue loses its page. Hand-written pages without the flag are kept.
//
// Usage:
//   node migration/generators/github-rules.mjs [--cli <path>] [--ref <git ref>] [--out <dir>] [--verify]
//
//   --cli     cli repository checkout (default: $VULNETIX_CLI_REPO, else ../cli
//             next to this repository)
//   --ref     git ref to read the rendered pages from (default: origin/main;
//             run `git -C <cli> fetch` first)
//   --out     docs root (default: src/content/docs of this repository)
//   --verify  run `go test ./internal/ghtasks -run TestGitHubRuleDocs` in the
//             cli checkout before reading (checks the working tree, not --ref)
//
// No dependencies beyond Node 20.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '..', '..');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const cli = resolve(opt('cli', process.env.VULNETIX_CLI_REPO || resolve(root, '..', 'cli')));
const ref = opt('ref', 'origin/main');
const outRoot = resolve(opt('out', join(root, 'src', 'content', 'docs')));
const outDir = join(outRoot, 'cli', 'github-rules');
const srcDir = 'website/content/docs/github-rules';

const git = (...a) => execFileSync('git', ['-C', cli, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 });

if (!existsSync(join(cli, '.git'))) {
  console.error(`github-rules: ${cli} is not a git checkout; pass --cli <path to the cli repository>`);
  process.exit(2);
}

if (args.includes('--verify')) {
  try {
    execFileSync('go', ['test', './internal/ghtasks/', '-run', 'TestGitHubRuleDocs', '-count=1'], { cwd: cli, stdio: 'inherit' });
  } catch {
    console.error('github-rules: TestGitHubRuleDocs failed; the CLI pages are stale. Run `GHRULES_UPDATE=1 go test ./internal/ghtasks/` in the cli repository and commit.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------- provenance

const sha = git('rev-parse', '--short=9', ref).trim();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The commit date of the ref, not today's, so re-running on the same commit changes nothing.
const updated = (() => {
  const iso = git('log', '-1', '--format=%cs', ref).trim();
  const d = new Date(`${iso}T00:00:00Z`);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
})();
const gomod = git('show', `${ref}:go.mod`);
const matchVersion = (gomod.match(/github\.com\/Vulnetix\/vdb-sca-match\s+(v[^\s]+)/) ?? [])[1] ?? 'unknown';
const checked = [`cli@${sha}`, `vdb-sca-match@${matchVersion}`];

const TASKS = {
  workflows: { title: 'Workflows', file: 'rules_workflows.go' },
  actions: { title: 'Actions and images', file: 'rules_actions.go' },
  settings: { title: 'Repository settings', file: 'rules_settings.go' },
  org: { title: 'Organisation settings', file: 'rules_org.go' },
};

// ---------------------------------------------------------------- read

const files = git('ls-tree', '--name-only', `${ref}:${srcDir}`).split('\n').filter((f) => /^vnx-gh-\d+\.md$/.test(f));
if (files.length === 0) {
  console.error(`github-rules: no vnx-gh-*.md under ${srcDir} at ${ref}`);
  process.exit(2);
}

// Docs rule: no em dashes. The catalogue uses them as parenthetical pairs and
// clause breaks; a comma reads correctly in both.
const dashes = (s) => s.replace(/\s+\u2014\s+/g, ', ').replace(/\u2014/g, ', ');

const parseFrontmatter = (src) => {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error('no frontmatter');
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].startsWith('"') ? JSON.parse(kv[2]) : kv[2];
  }
  return { fm, body: src.slice(m[0].length) };
};

const rules = files.map((f) => {
  const { fm, body } = parseFrontmatter(git('show', `${ref}:${srcDir}/${f}`));
  const [id, ...nameParts] = fm.title.split(' – ');
  const name = nameParts.join(' – ');
  const meta = body.match(/^\*\*Severity:\*\* (.*)$/m);
  if (!meta) throw new Error(`${f}: no severity line`);
  const fields = Object.fromEntries(meta[1].split(' | ').map((p) => {
    const kv = p.match(/^\*\*([^:]+):\*\* (.*)$/);
    return kv ? [kv[1], kv[2]] : ['Severity', p];
  }));
  const task = (fields.Command.match(/vulnetix gha (\w+)/) ?? [])[1];
  if (!TASKS[task]) throw new Error(`${f}: unknown task in ${fields.Command}`);
  const line = (label) => (body.match(new RegExp(`^\\*\\*${label}:\\*\\* (.*)$`, 'm')) ?? [])[1];
  const section = (h) => (body.match(new RegExp(`^## ${h}\\n\\n([\\s\\S]*?)(?=\\n## |$)`, 'm')) ?? [])[1]?.trim();
  return {
    file: f,
    id,
    name,
    description: fm.description,
    severity: fields.Severity,
    confidence: fields.Confidence,
    cwe: fields.CWE,
    task,
    needs: line('Needs')?.replace(/\. Without them.*$/, ''),
    uses: line('Uses, when available')?.replace(/, to rate each finding.*$/, ''),
    mappings: line('Mappings'),
    overview: section('Overview'),
    remediation: section('Remediation'),
    scoring: section('Scoring'),
  };
}).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

// ---------------------------------------------------------------- write

const yaml = (s) => JSON.stringify(s);
const frontmatter = (o) => [
  '---',
  `title: ${yaml(o.title)}`,
  ...(o.nav ? [`nav: ${yaml(o.nav)}`] : []),
  `description: ${yaml(o.description)}`,
  `order: ${o.order}`,
  `sources: [${o.sources.map(yaml).join(', ')}]`,
  `checked: [${checked.map(yaml).join(', ')}]`,
  `updated: ${yaml(updated)}`,
  'generated: true',
  '---',
  '',
].join('\n');

const isGenerated = (p) => /^generated:\s*true\s*$/m.test((readFileSync(p, 'utf8').match(/^---\n([\s\S]*?)\n---/) ?? [])[1] ?? '');

mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) {
  const p = join(outDir, f);
  if (f.endsWith('.md') && isGenerated(p)) rmSync(p);
}

const slug = (id) => id.toLowerCase();
const banner = `<!-- Generated by migration/generators/github-rules.mjs from cli/${srcDir} at ${checked.join(', ')}. Edit the rule in vdb-sca-match/ghaudit, not this page. -->\n`;

for (const r of rules) {
  const facts = [
    ['Severity', r.severity],
    ['Confidence', r.confidence],
    ['CWE', r.cwe],
    ['Command', `\`vulnetix gha ${r.task}\`, \`vulnetix gha audit\``],
    ...(r.needs ? [['Needs', `${r.needs}. Without them the rule is reported as not evaluated, never as passed.`]] : []),
    ...(r.uses ? [['Uses, when available', `${r.uses}, to rate each finding against the repository's own configuration.`]] : []),
    ...(r.mappings ? [['Mappings', r.mappings]] : []),
  ];
  const lines = [
    frontmatter({
      title: `${r.id}: ${dashes(r.name)}`,
      nav: r.id,
      description: dashes(r.description),
      order: Number(r.id.replace(/\D/g, '')),
      sources: [`vdb-sca-match/ghaudit/${TASKS[r.task].file}`, 'cli/internal/ghtasks/docs.go'],
    }),
    banner,
    dashes(r.overview),
    '',
    '| | |',
    '|---|---|',
    ...facts.map(([k, v]) => `| ${k} | ${dashes(v)} |`),
    '',
    '## Remediation',
    '',
    dashes(r.remediation),
    '',
    '## Run only this rule',
    '',
    '```sh',
    `vulnetix gha ${r.task} --rule ${r.id}`,
    '```',
    '',
  ];
  if (r.scoring) lines.push('## Scoring', '', dashes(r.scoring), '');
  lines.push(`All rules: [GitHub rules](/cli/github-rules/overview/).`, '');
  writeFileSync(join(outDir, `${slug(r.id)}.md`), lines.join('\n'));
}

// The index.
const idx = [
  frontmatter({
    title: 'GitHub posture rules',
    nav: 'All rules',
    description: 'The VNX-GH rules that vulnetix gha workflows, actions, settings, org and audit evaluate: workflow injection and privilege flaws, the action supply chain, and repository and organisation settings.',
    order: 0,
    sources: Object.values(TASKS).map((t) => `vdb-sca-match/ghaudit/${t.file}`).concat(['cli/internal/ghtasks/docs.go']),
  }),
  banner,
  `${rules.length} rules. The same engine runs in the \`vulnetix gha\` posture commands and in the Software Factory on GitHub App events, so a finding means the same thing in both places. The commands, their flags and the GitHub token each one needs are on [GitHub posture commands](/cli/commands/gha/).`,
  '',
  '| Context | Meaning |',
  '|---|---|',
  '| needs | The rule only runs when those GitHub facts were read through the API. Without them it is reported as not evaluated, never as passed. |',
  '| uses | The rule runs on the files alone, and reads those facts when present to lower or raise the severity of each finding. |',
  '',
];
for (const [task, t] of Object.entries(TASKS)) {
  const rs = rules.filter((r) => r.task === task);
  idx.push(`## ${t.title} (\`vulnetix gha ${task}\`)`, '', '| Rule | Severity | Context |', '|---|---|---|');
  for (const r of rs) {
    const ctx = [r.needs && `needs ${r.needs}`, r.uses && `uses ${r.uses}`].filter(Boolean).join('; ');
    idx.push(`| [${r.id}](/cli/github-rules/${slug(r.id)}/): ${dashes(r.name)} | ${r.severity} | ${ctx} |`);
  }
  idx.push('');
}
writeFileSync(join(outDir, 'overview.md'), idx.join('\n'));

console.log(`github-rules: wrote ${rules.length} rule pages and overview.md to ${outDir} (${checked.join(', ')})`);
