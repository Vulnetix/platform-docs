import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePins, readPins, verCmp } from '../migration/generators/releases.mjs';

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
