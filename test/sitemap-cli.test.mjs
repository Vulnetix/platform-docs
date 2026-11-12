import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitDates } from '../scripts/sitemap.mjs';
import { hidingGitEnv, withoutGitEnv as cleanEnv } from './env.mjs';

const CLI = fileURLToPath(new URL('../scripts/sitemap.mjs', import.meta.url));

// The CLI spawns git with no GIT_* vars and no repo context. Running it with
// cwd: dist keeps it out of any repository, so the git fallback is always
// empty and the walk itself is exercised without depending on this checkout
// being a full git clone (it is not: the sandbox worktree resolves objects
// only through the harness's alternate-objects env).
const mkDist = () => {
  const dist = mkdtempSync(join(tmpdir(), 'sitemap-dist-'));
  const mk = (...parts) => mkdirSync(join(dist, ...parts), { recursive: true });
  mk('sub', 'nested');
  mk('moved');
  mk('pagefind');
  mk('_astro');
  writeFileSync(join(dist, 'index.html'), '<html><head><meta charset="utf-8"><link rel="canonical" href="https://docs.vulnetix.com/"></head><body></body></html>');
  writeFileSync(join(dist, 'sub', 'index.html'), '<html><head><meta charset="utf-8"><meta property="article:modified_time" content="2026-01-02"><a href="https://github.com/Vulnetix/platform-docs/edit/main/src/content/docs/cli/get-started/install.md">Edit this page</a></head><body></body></html>');
  writeFileSync(join(dist, 'sub', 'nested', 'index.html'), '<html><head><meta charset="utf-8"><a href="https://github.com/Vulnetix/platform-docs/edit/main/src/content/docs/cli/get-started/install.md">Edit this page</a></head><body></body></html>');
  writeFileSync(join(dist, 'sub', 'old.html'), '<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=https://docs.vulnetix.com/new/"><title>Moved</title></head><body></body></html>');
  writeFileSync(join(dist, 'moved', 'index.html'), '<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=https://docs.vulnetix.com/sub/"><title>Moved</title></head><body></body></html>');
  writeFileSync(join(dist, 'pagefind', 'index.html'), '<html><head><meta charset="utf-8"></head><body></body></html>');
  writeFileSync(join(dist, '_astro', 'a.css'), 'body{}');
  writeFileSync(join(dist, 'loose.txt'), 'not html');
  return dist;
};

const sitemapEntries = (dist) => {
  const xml = readFileSync(join(dist, 'sitemap-0.xml'), 'utf8');
  return [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)].map((m) => ({ loc: m[1], lastmod: m[2] ?? null }));
};

test('the CLI walk: skips pagefind/_astro, non-index files and meta-refresh stubs, writes both sitemaps', () => {
  const dist = mkDist();
  try {
    const r = spawnSync(process.execPath, [CLI, dist], { cwd: dist, encoding: 'utf8', env: cleanEnv() });
    assert.equal(r.status, 0, r.stderr);
    const entries = sitemapEntries(dist);
    assert.deepEqual(entries.map((e) => e.loc), ['https://docs.vulnetix.com/', 'https://docs.vulnetix.com/sub/', 'https://docs.vulnetix.com/sub/nested/']);
    const byLoc = new Map(entries.map((e) => [e.loc, e]));
    assert.equal(byLoc.get('https://docs.vulnetix.com/').lastmod, null, 'canonical-only page: the fixture has no git history, so no lastmod');
    assert.equal(byLoc.get('https://docs.vulnetix.com/sub/').lastmod, '2026-01-02', 'article:modified_time wins over the git fallback');
    assert.equal(byLoc.get('https://docs.vulnetix.com/sub/nested/').lastmod, null, 'the fixture has no git history, so the edit-link fallback gets no date');
    assert.ok(!readFileSync(join(dist, 'sitemap-0.xml'), 'utf8').includes('/moved/') && !readFileSync(join(dist, 'sitemap-0.xml'), 'utf8').includes('old.html'), 'meta-refresh stubs and non-index files are not entries');
    assert.match(readFileSync(join(dist, 'sitemap-index.xml'), 'utf8'), /<sitemap><loc>https:\/\/docs\.vulnetix\.com\/sitemap-0\.xml<\/loc><\/sitemap>/);
    assert.match(r.stdout, new RegExp(`sitemap: ${entries.length} urls, ${entries.filter((e) => e.lastmod).length} with lastmod`));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('gitDates is empty when the tree is shallow', () => {
  const repo = mkdtempSync(join(tmpdir(), 'sitemap-shallow-'));
  try {
    const git = (args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', env: cleanEnv() });
    git(['init', '-q']);
    git(['-c', 'user.name=t', '-c', 'user.email=t@e.c', 'commit', '--no-gpg-sign', '-q', '--allow-empty', '-m', 'x']);
    writeFileSync(join(repo, '.git', 'shallow'), '');
    git(['log', '-1']); // git still accepts the tree: shallow with no boundary commits
    // gitDates runs in-process here, so hide the ambient GIT_* vars or git
    // follows them out of the fixture repo.
    assert.equal(hidingGitEnv(() => gitDates(repo)).size, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('gitDates maps each docs file to its newest commit date', () => {
  const repo = mkdtempSync(join(tmpdir(), 'sitemap-dates-'));
  try {
    const git = (args, extra = {}) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', env: cleanEnv(extra) });
    git(['init', '-q']);
    // gitDates reads %cs, the committer date: set both dates explicitly.
    git(['-c', 'user.name=t', '-c', 'user.email=t@e.c', 'commit', '--no-gpg-sign', '-q', '--allow-empty', '--date=2026-01-02T00:00:00Z', '-m', 'x'], { GIT_COMMITTER_DATE: '2026-01-02T00:00:00Z' });
    const src = join(repo, 'src', 'content', 'docs');
    mkdirSync(src, { recursive: true });
    const f = join(src, 'a.md');
    writeFileSync(f, 'a');
    git(['add', '.']);
    git(['-c', 'user.name=t', '-c', 'user.email=t@e.c', 'commit', '--no-gpg-sign', '-q', '--date=2026-02-03T00:00:00Z', '-m', 'y'], { GIT_COMMITTER_DATE: '2026-02-03T00:00:00Z' });
    const dates = hidingGitEnv(() => gitDates(repo));
    assert.equal(dates.get('src/content/docs/a.md'), '2026-02-03');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('gitDates is empty when git fails: absent from PATH, or not in a repository', () => {
  const script = fileURLToPath(new URL('../scripts/sitemap.mjs', import.meta.url));
  const code = `const { gitDates } = await import(${JSON.stringify(script)});\nconst d = gitDates();\nconsole.log(d.size);\nprocess.exit(d.size === 0 ? 0 : 1);`;
  const absent = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env: cleanEnv({ PATH: '/nonexistent' }) });
  assert.equal(absent.status, 0, absent.stderr);
  assert.equal(absent.stdout.trim(), '0');
  const dir = mkdtempSync(join(tmpdir(), 'sitemap-nogit-'));
  try {
    const notRepo = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: dir, encoding: 'utf8', env: cleanEnv() });
    assert.equal(notRepo.status, 0, notRepo.stderr);
    assert.equal(notRepo.stdout.trim(), '0');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});