#!/usr/bin/env node
// gen-action-pages.mjs: write the GitHub Action pages from the action.yml files
// at a cli release tag, so a page can never describe an input no release has.
//
//   node scripts/gen-action-pages.mjs --cli ../cli [--tag v4.24.0]
//
// With no --tag it reads the release GitHub marks Latest. An action with a hand
// written page keeps its prose and gets a fresh Inputs and Outputs table and
// `checked` line. An action with none gets a generated page. The table of every
// action sits between the catalogue markers in cli/ci-cd/github-actions.md.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const cli = opt('--cli') ?? join(root, '..', 'cli');
const tag = opt('--tag') ?? execFileSync('gh', ['release', 'view', '-R', 'Vulnetix/cli', '--json', 'tagName', '--jq', '.tagName'], { encoding: 'utf8' }).trim();

// The generated action.yml files have one shape: top-level scalars, then inputs
// and outputs of two-space keys with four-space fields.
function parseAction(text) {
  const out = { inputs: {}, outputs: {} };
  const unq = (v) => v.trim().replace(/^'(.*)'$/, '$1').replaceAll("''", "'");
  let section = null, key = null;
  for (const l of text.split('\n')) {
    let m;
    if ((m = l.match(/^([a-z]+):\s*(.*)$/))) {
      section = m[1] === 'inputs' || m[1] === 'outputs' ? m[1] : null;
      if (m[1] === 'description') out.description = unq(m[2]);
    } else if (section && (m = l.match(/^  ([a-z0-9-]+):\s*$/))) {
      key = m[1];
      out[section][key] = {};
    } else if (section && key && (m = l.match(/^    (description|default):\s*(.*)$/))) {
      out[section][key][m[1]] = unq(m[2]);
    }
  }
  return out;
}

const git = (...a) => execFileSync('git', ['-C', cli, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const paths = git('ls-tree', '-r', '--name-only', tag).split('\n').filter((p) => /^([^/]+\/){1,2}action\.yml$/.test(p) && !p.startsWith('tools/') && !p.startsWith('.'));

const home = (dir) => {
  const [a, b] = dir.split('/');
  if (a === 'sast' && b) return ['sast/github-actions', b];
  if (a === 'sca' && b) return ['sca/github-actions', b];
  if (['sast', 'attest'].includes(a)) return [a === 'attest' ? 'attestation/github-actions' : 'sast/github-actions', a];
  if (['sca', 'containers', 'license'].includes(a) || a.startsWith('license-')) return ['sca/github-actions', a];
  if (['sbom', 'cbom', 'aibom'].includes(a) || a.startsWith('bom-')) return ['sbom/github-actions', a];
  if (a === 'secrets') return ['secrets/github-actions', a];
  if (a === 'iac') return ['iac-scanning/github-actions', a];
  if (a === 'malscan') return ['malware/github-actions', a];
  if (a === 'vex') return ['vex/github-actions', a];
  if (a === 'tea-release') return ['tea/github-actions', a];
  if (a.startsWith('config-')) return ['platform-iac/github-actions', a];
  if (a === 'jail' || a === 'jail-explain') return ['quality-gates/github-actions', a];
  return ['cli/github-actions', a];
};

const inputTable = (inputs) => ['| Input | Description | Default |', '|---|---|---|',
  ...Object.entries(inputs ?? {}).map(([k, v]) => `| \`${k}\` | ${String(v.description).replaceAll('|', '\\|')} | ${v.default ? `\`${v.default}\`` : '-'} |`)].join('\n');
const outputTable = (outputs) => ['| Output | Description |', '|---|---|',
  ...Object.entries(outputs ?? {}).map(([k, v]) => `| \`${k}\` | ${String(v.description).replaceAll('|', '\\|')} |`)].join('\n');

// Replace a section body, up to the next heading of the same level.
function replaceSection(md, heading, body) {
  const start = md.indexOf(`\n## ${heading}\n`);
  if (start < 0) return md;
  const from = md.indexOf('\n', start + 1) + 1;
  const next = md.indexOf('\n## ', from);
  // Keep any prose after the table: it explains the action, not the table.
  const old = md.slice(from, next < 0 ? md.length : next);
  const prose = old.replace(/^\s*\|[^\n]*\n(\|[^\n]*\n?)*/m, '').trim();
  return md.slice(0, from) + `\n${body}\n` + (prose ? `\n${prose}\n` : '') + (next < 0 ? '' : md.slice(next));
}

// Variations: one short workflow per way to use the action, written only for the
// inputs the action really has, so a page never shows an input it lacks.
const creds = ['org-id: ${{ secrets.VULNETIX_ORG_ID }}', 'api-key: ${{ secrets.VULNETIX_API_KEY }}'];
const job = (dir, withLines, { permissions = ['contents: read'], extra = [], ref = 'v4' } = {}) => [
  '```yaml',
  'jobs:',
  '  vulnetix:',
  '    runs-on: ubuntu-latest',
  '    permissions:',
  ...permissions.map((p) => `      ${p}`),
  '    steps:',
  '      - uses: actions/checkout@v5',
  ...extra,
  `      - uses: Vulnetix/cli/${dir}@${ref}`,
  '        with:',
  ...withLines.map((l) => `          ${l}`),
  '```',
].join('\n');

function variations(dir, a) {
  const has = (k) => k in (a.inputs ?? {});
  const out = [];
  const add = (title, why, block) => out.push(`### ${title}\n\n${why}\n\n${block}`);
  if (has('fail-on')) {
    add('Gate on severity or exploitation', 'Fail the job on the findings that matter, and let the rest report without failing it. Each line is one condition.',
      job(dir, [...creds, 'fail-on: |', '  high', '  kev']));
  }
  if (has('fail-on-findings')) {
    add('Report without failing the job', 'Adopt the action first and turn the gate on later. The artifact, attestation and publish steps run either way.',
      job(dir, [...creds, 'fail-on-findings: false']));
  }
  if (has('github-code-scanning')) {
    add('Publish to GitHub code scanning', 'Alerts appear in the Security tab, in a category of their own so this job never closes another job\'s alerts.',
      job(dir, [...creds, 'github-code-scanning: true'], { permissions: ['contents: read', 'security-events: write'] }));
  }
  if (has('attest') && has('release-tag')) {
    add('Attest the output and attach it to a release', 'Sign the files with a GitHub artifact attestation and add them to the release the workflow is publishing.',
      job(dir, [...creds, 'attest: true', 'release-tag: ${{ github.event.release.tag_name }}'], { permissions: ['contents: write', 'id-token: write', 'attestations: write'] }));
  }
  if (has('exclude') || has('rules') || has('extra-args')) {
    const l = [...creds];
    if (has('exclude')) l.push('exclude: |', '  **/testdata/**', '  vendor/**');
    if (has('rules')) l.push('rules: |', '  Vulnetix/community-rules');
    add('Narrow the scan', 'Skip paths, add an external rule repository, or pass any other flag of the command with `extra-args`, one argument per line.', job(dir, l));
  }
  const [head, leaf] = dir.split('/');
  if (leaf && head === 'sast') {
    add('Scan the rest of the repository', `Pair this job with a high-level \`sast\` job that skips ${leaf}, so every file is scanned exactly once.`,
      job('sast', [...creds, `not-language: ${leaf}`]));
  }
  if (leaf && head === 'sca') {
    add('Scan the rest of the repository', `Pair this job with a high-level \`sca\` job that skips ${leaf}, so every manifest is scanned exactly once.`,
      job('sca', [...creds, `not-package-manager: ${leaf}`]));
  }
  if (has('path')) {
    add('A subdirectory or monorepo package', 'Point the action at one directory. Run it once per package with a matrix when each has its own manifest.',
      job(dir, [...creds, 'path: services/api']));
  }
  add('Pin the CLI for a locked workflow', 'Use an exact tag, or a full commit SHA, and leave `version` empty: the action installs the release its own ref was cut from, so an `actions.lock` entry or a SHA pin names the binary too. Setting `version` to `v4` or `latest` floats instead.',
    job(dir, [...creds], { ref: tag }));
  add('Pull requests from forks', 'Secrets are not available to a fork. Leave the credentials out and the action runs in community mode, with nothing published.',
    job(dir, [has('fail-on-findings') ? 'fail-on-findings: false' : 'path: .']));
  return `## Variations\n\n${out.join('\n\n')}\n`;
}

// Read a page if there is one. Opening the file and handling ENOENT avoids a check
// followed by a read, which can race with another writer.
function readOrEmpty(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return '';
    throw e;
  }
}

const stamp = (md) => md.replace(/^checked: .*$/m, `checked: [cli@${tag}]`);

const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const rows = [];
let order = 40;
for (const p of paths.sort()) {
  const dir = p.replace(/\/action\.yml$/, '');
  const a = parseAction(git('show', `${tag}:${p}`));
  const [seg, slug] = home(dir);
  const page = join(root, 'src/content/docs', seg, `${slug}.md`);
  rows.push(`| [\`${dir}\`](/${seg}/${slug}/) | ${a.description} |`);
  const prior = readOrEmpty(page);
  const keepOrder = prior.match(/^order: (\d+)$/m);
  if (prior && !/^generated: true$/m.test(prior)) {
    let md = prior;
    md = replaceSection(md, 'Inputs', inputTable(a.inputs));
    md = replaceSection(md, 'Outputs', outputTable(a.outputs));
    writeFileSync(page, stamp(md));
    continue;
  }
  mkdirSync(dirname(page), { recursive: true });
  const required = Object.entries(a.inputs ?? {}).filter(([k, v]) => !v.default && /^(reference|file|files|before|after|ecosystem)$/.test(k));
  const withLines = ['org-id: ${{ secrets.VULNETIX_ORG_ID }}', 'api-key: ${{ secrets.VULNETIX_API_KEY }}',
    ...required.map(([k]) => `${k}: <${k}>`)].map((l) => `          ${l}`).join('\n');
  writeFileSync(page, `---
title: ${JSON.stringify(`Vulnetix/cli/${dir} action`)}
nav: ${JSON.stringify(dir)}
description: ${JSON.stringify(`The Vulnetix/cli/${dir} GitHub Action: inputs, outputs and a workflow.`)}
order: ${keepOrder ? keepOrder[1] : order++}
sources: [cli/${p}, cli/tools/actiongen/spec.go, cli/tools/actiongen/catalog.go]
checked: [cli@${tag}]
updated: ${today}
generated: true
---

${a.description}

\`\`\`yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/${dir}@v4
        with:
${withLines}
\`\`\`

${variations(dir, a)}
## Inputs

${inputTable(a.inputs)}

## Outputs

${outputTable(a.outputs)}
`);
}

const index = join(root, 'src/content/docs/cli/ci-cd/github-actions.md');
let md = readFileSync(index, 'utf8');
const table = `<!-- catalogue:start -->\n| Action | What it does |\n|---|---|\n${rows.join('\n')}\n<!-- catalogue:end -->`;
md = md.includes('<!-- catalogue:start -->')
  ? md.replace(/<!-- catalogue:start -->[\s\S]*<!-- catalogue:end -->/, () => table)
  : md.replace('\n## Secrets\n', () => `\n## The catalogue\n\n${table}\n\n## Secrets\n`);
writeFileSync(index, stamp(md));
console.log(`${rows.length} actions from cli@${tag}`);
