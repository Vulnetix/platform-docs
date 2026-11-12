import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePins, readPins, verCmp, latest, PINS_FILE } from '../migration/generators/releases.mjs';

// The kind pages are generated from the CLI and config-schemas releases pinned
// in migration/generators/releases.json. A new release of either repository
// must not turn the generators job red, so the job checks out the pins rather
// than asking GitHub for the latest.
const dir = new URL('../src/content/docs/platform-iac/kinds/', import.meta.url).pathname;
const pages = readdirSync(dir).filter((f) => f.endsWith('.md'));
const pins = readPins();

test('the pins are release tags, and anything else is refused', () => {
  assert.match(pins.cli, /^v\d+\.\d+\.\d+$/);
  assert.match(pins.configSchemas, /^v\d+\.\d+\.\d+$/);
  assert.deepEqual(parsePins('{"cli":"v3.1.2","configSchemas":"v1.0.0","x":1}'), { cli: 'v3.1.2', configSchemas: 'v1.0.0' });
  for (const bad of ['{"cli":"latest","configSchemas":"v1.0.0"}', '{"cli":"v3.1.2"}', '{"cli":"v3.1","configSchemas":"v1.0.0"}', '{"cli":"v3.1.2","configSchemas":"main"}']) {
    assert.throws(() => parsePins(bad), /releases\.json/, bad);
  }
});

test('versions compare numerically, not as text', () => {
  assert.ok(verCmp('v3.169.1', 'v3.169.0') > 0);
  assert.ok(verCmp('v3.170.0', 'v3.169.9') > 0);
  assert.ok(verCmp('v1.10.0', 'v1.9.0') > 0);
  assert.equal(verCmp('v1.11.1', 'v1.11.1'), 0);
});

test('every generated kind page records exactly the pinned releases', () => {
  for (const f of pages) {
    const s = readFileSync(join(dir, f), 'utf8');
    const checked = s.match(/^checked: \[(.*)\]$/m)?.[1] ?? '';
    assert.ok(checked.includes(`"config-schemas@${pins.configSchemas}"`), `${f}: checked is ${checked}, releases.json pins config-schemas ${pins.configSchemas}; run kind-reference.mjs`);
    if (f !== 'catalogue.md') assert.ok(checked.includes(`"cli@${pins.cli}"`), `${f}: checked is ${checked}, releases.json pins cli ${pins.cli}; run kind-reference.mjs`);
    for (const m of s.matchAll(/The latest CLI, (v\d+\.\d+\.\d+)/g)) assert.equal(m[1], pins.cli, `${f}: names a CLI other than the pin`);
  }
});

test('the generators job checks out the pins and does not ask GitHub for the latest release', () => {
  const yml = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  const job = yml.slice(yml.indexOf('\n  generators:'), yml.indexOf('\n  deploy:'));
  assert.doesNotMatch(job, /releases\/latest/);
  assert.doesNotMatch(job, /VULNETIX_CLI_VERSION/);
  assert.match(job, /releases\.json/);
  assert.match(job, /ref: \$\{\{ steps\.releases\.outputs\.schemas \}\}/);
});

const modPath = fileURLToPath(new URL('../migration/generators/releases.mjs', import.meta.url));
const root = fileURLToPath(new URL('..', import.meta.url));
const runCli = (mode, cliTag, schemasTag) => spawnSync(process.execPath, ['--input-type=module', '-e', `
globalThis.fetch = async (url) => ({ json: async () => ({ tag_name: url.includes('/cli/') ? ${JSON.stringify(cliTag)} : ${JSON.stringify(schemasTag)} }) });
process.argv = [process.execPath, ${JSON.stringify(modPath)}, ${JSON.stringify(mode)}];
await import(${JSON.stringify('file://' + modPath)});
`], { cwd: root, encoding: 'utf8' });

// latest() reads the token env vars and the global fetch. Each test stubs both
// and puts the originals back, so later tests still see the real fetch and the
// caller's tokens.
const withStubs = async (fn) => {
  const saved = { fetch: globalThis.fetch, GITHUB_TOKEN: process.env.GITHUB_TOKEN, GH_TOKEN: process.env.GH_TOKEN };
  delete process.env.GITHUB_TOKEN;
  delete process.env.GH_TOKEN;
  try {
    await fn();
  } finally {
    globalThis.fetch = saved.fetch;
    for (const k of ['GITHUB_TOKEN', 'GH_TOKEN']) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
};

test('latest() sends the bearer token only when a token env var is set', () => withStubs(async () => {
  const seen = [];
  globalThis.fetch = async (url, opts) => {
    seen.push({ url, headers: opts.headers });
    return { json: async () => ({ tag_name: 'v4.10.2' }) };
  };
  await latest('Vulnetix/cli');
  assert.equal(seen[0].headers.Authorization, undefined);
  assert.equal(seen[0].url, 'https://api.github.com/repos/Vulnetix/cli/releases/latest');
  process.env.GITHUB_TOKEN = 'sekrit';
  seen.length = 0;
  await latest('Vulnetix/cli');
  assert.equal(seen[0].headers.Authorization, 'Bearer sekrit');
}));

test('latest() throws naming the repo on a non-semver or missing tag', () => withStubs(async () => {
  globalThis.fetch = async () => ({ json: async () => ({ tag_name: 'main' }) });
  await assert.rejects(latest('Vulnetix/cli'), /Vulnetix\/cli: no release/);
  globalThis.fetch = async () => ({ json: async () => ({}) });
  await assert.rejects(latest('Vulnetix/config-schemas'), /Vulnetix\/config-schemas: no release/);
}));

test('the CLI prints the pins JSON with no arguments and exits 0', () => {
  const r = spawnSync(process.execPath, ['migration/generators/releases.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), readPins());
});

test('the CLI exits 2 with the usage line on an unknown mode', () => {
  const r = spawnSync(process.execPath, ['migration/generators/releases.mjs', '--wat'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: releases\.mjs \[--check \| --bump\]/);
});

test('--check warns when a newer release exists and is silent when the pins are current', () => {
  const pins = readPins();
  const silent = runCli('--check', pins.cli, pins.configSchemas);
  assert.equal(silent.status, 0, silent.stderr);
  assert.equal(silent.stdout, '');
  const warned = runCli('--check', 'v99.0.0', 'v99.1.0');
  assert.equal(warned.status, 0, warned.stderr);
  const warnings = warned.stdout.split('\n').filter((l) => l.startsWith('::warning::'));
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /Vulnetix\/cli has released v99\.0\.0/);
  assert.match(warnings[1], /Vulnetix\/config-schemas has released v99\.1\.0/);
});

test('--bump writes the fetched releases to releases.json', () => {
  const before = readFileSync(PINS_FILE, 'utf8');
  try {
    const r = runCli('--bump', 'v9.9.9', 'v8.8.8');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /releases\.json: cli v9\.9\.9, configSchemas v8\.8\.8/);
    assert.equal(readFileSync(PINS_FILE, 'utf8'), JSON.stringify({ cli: 'v9.9.9', configSchemas: 'v8.8.8' }, null, 2) + '\n');
  } finally {
    writeFileSync(PINS_FILE, before);
  }
});
