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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  if (existsSync(page)) {
    let md = readFileSync(page, 'utf8');
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
order: ${order++}
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
