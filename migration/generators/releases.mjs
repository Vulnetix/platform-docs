#!/usr/bin/env node
// releases.mjs: the CLI and config-schemas releases the kind pages are
// generated from. They are pinned in releases.json, not asked of GitHub, so a
// release of either repository does not turn the generators job red: the job
// checks out these tags and regenerates exactly what is committed.
//
//   node migration/generators/releases.mjs            print the pins
//   node migration/generators/releases.mjs --check    warn (exit 0) when a newer
//                                                     release exists
//   node migration/generators/releases.mjs --bump     write the latest releases
//                                                     to releases.json; then
//                                                     check out those tags, run
//                                                     kind-reference.mjs and commit
//
// --check and --bump read GITHUB_TOKEN or GH_TOKEN when set.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SEMVER = /^v\d+\.\d+\.\d+$/;
export const PINS_FILE = fileURLToPath(new URL('./releases.json', import.meta.url));
const REPOS = { cli: 'Vulnetix/cli', configSchemas: 'Vulnetix/config-schemas' };

export function parsePins(text) {
  const pins = JSON.parse(text);
  for (const key of Object.keys(REPOS)) {
    if (!SEMVER.test(pins[key] ?? '')) throw new Error(`releases.json: "${key}" must be a release tag like v1.2.3, got ${JSON.stringify(pins[key])}`);
  }
  return { cli: pins.cli, configSchemas: pins.configSchemas };
}

export const readPins = (file = PINS_FILE) => parsePins(readFileSync(file, 'utf8'));

export const verCmp = (a, b) => {
  const pa = a.slice(1).split('.').map(Number), pb = b.slice(1).split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
};

export async function latest(repo) {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const headers = { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
  const json = await res.json();
  if (!SEMVER.test(json.tag_name ?? '')) throw new Error(`${repo}: no release (${JSON.stringify(json).slice(0, 200)})`);
  return json.tag_name;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  const pins = readPins();
  if (!mode) {
    console.log(JSON.stringify(pins, null, 2));
  } else if (mode === '--check' || mode === '--bump') {
    const now = {};
    for (const [key, repo] of Object.entries(REPOS)) now[key] = await latest(repo);
    if (mode === '--check') {
      for (const [key, repo] of Object.entries(REPOS)) {
        if (verCmp(now[key], pins[key]) > 0) console.log(`::warning::${repo} has released ${now[key]}; the kind pages are generated from ${pins[key]}. Run node migration/generators/releases.mjs --bump, then the generators, and commit.`);
      }
    } else {
      writeFileSync(PINS_FILE, JSON.stringify(now, null, 2) + '\n');
      console.log(`releases.json: cli ${now.cli}, configSchemas ${now.configSchemas}. Now check out those tags and run kind-reference.mjs.`);
    }
  } else {
    console.error('usage: releases.mjs [--check | --bump]');
    process.exit(2);
  }
}
