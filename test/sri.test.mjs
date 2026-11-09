import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGEFIND, PINNED, addSource, digest, directive, hasher, problems, processHtml, remoteProblems, remoteRefs, remoteUrls, scan, withRetries } from '../scripts/sri.mjs';

const FILES = { '/_astro/a.css': 'body{}', '/fonts/f.otf': 'font', '/x.js': 'js', [PAGEFIND]: 'pf' };
const hashOf = (files) => (url) => (url in files ? digest('sha384', files[url]) : null);
const hash = hashOf(FILES);
const CSP = `<meta http-equiv="content-security-policy" content="default-src 'self'; script-src 'self' 'sha256-bundled'; style-src 'self'; style-src-attr 'unsafe-inline';">`;
const page = (head, body = '') => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>t</title>${head}${CSP}</head><body>${body}</body></html>`;

test('same-origin stylesheets, preloads and script srcs get the digest of their file', () => {
  const out = processHtml(page('<link rel="stylesheet" href="/_astro/a.css"><link rel="preload" href="/fonts/f.otf" as="font" crossorigin><script type="module" src="/x.js"></script>'), hash);
  assert.ok(out.includes(`<link rel="stylesheet" href="/_astro/a.css" integrity="${digest('sha384', 'body{}')}">`));
  assert.ok(out.includes(`as="font" crossorigin integrity="${digest('sha384', 'font')}">`));
  assert.ok(out.includes(`src="/x.js" integrity="${digest('sha384', 'js')}">`));
  assert.deepEqual(problems(out, hash), []);
});

test('external and inline resources get no integrity attribute', () => {
  const out = processHtml(page('<link rel="stylesheet" href="https://cdn.example.com/a.css"><link rel="icon" href="/favicon.svg"><script>var a=1</script>'), hash);
  assert.ok(!/integrity/.test(out));
});

test('a "<script" inside an attribute value is not read as a tag', () => {
  const s = scan('<meta name="description" content="matches <script src> and <script, a quote"><script>x()</script>');
  assert.deepEqual(s.refs, []);
  assert.deepEqual(s.scripts, ['x()']);
});

test('pages that load search get an import map pinning pagefind.js, hashed into the CSP', () => {
  const out = processHtml(page('', `<script type="module">import('${PAGEFIND}')</script>`), hash);
  const s = scan(out);
  assert.equal(JSON.parse(s.importMap.body).integrity[PAGEFIND], digest('sha384', 'pf'));
  const scriptSrc = directive(s.csp, 'script-src');
  assert.ok(scriptSrc.includes(`'${digest('sha256', s.importMap.body)}'`));
  assert.ok(scriptSrc.includes("'sha256-bundled'"), 'Astro’s own hashes are kept');
  assert.deepEqual(problems(out, hash), []);
  assert.equal(processHtml(out, hash), out, 'running again changes nothing');
});

test('every inline script and style is hashed into its directive, not the -attr one', () => {
  const out = processHtml(page('<script>theme()</script><style>a{}</style>'), hash);
  const csp = scan(out).csp;
  assert.ok(directive(csp, 'script-src').includes(`'${digest('sha256', 'theme()')}'`));
  assert.ok(directive(csp, 'style-src').includes(`'${digest('sha256', 'a{}')}'`));
  assert.equal(directive(csp, 'style-src-attr').trim(), "'unsafe-inline'");
  assert.equal(addSource("script-src 'self'", 'script-src', "'self'"), "script-src 'self'");
});

test('the policy moves up to follow <meta charset>', () => {
  const out = processHtml(page('<script>early()</script>'), hash);
  assert.match(out, /<meta charset="utf-8"><meta http-equiv="content-security-policy"/);
});

test('--check catches a missing digest, a changed file, an unhashed inline script and a misplaced policy', () => {
  const out = processHtml(page('<link rel="stylesheet" href="/_astro/a.css">', `<script type="module">import('${PAGEFIND}')</script>`), hash);
  assert.deepEqual(problems(out, hash), []);
  const changed = hashOf({ ...FILES, '/_astro/a.css': 'body{color:red}', [PAGEFIND]: 'pf2' });
  assert.deepEqual(problems(out, changed), ['/_astro/a.css: integrity does not match the file', `import map: ${PAGEFIND} does not match the file`]);
  assert.deepEqual(problems(page('<link rel="stylesheet" href="/_astro/a.css">'), hash), ['/_astro/a.css: no integrity', 'the CSP does not follow <meta charset>']);
  assert.ok(problems(out.replace('</body>', '<script>injected()</script></body>'), hash).includes('an inline script is not in the CSP'));
});

test('remote files must be pinned and match their recorded digest', async () => {
  const url = 'https://cdn.jsdelivr.net/npm/x@1.0.0/f.woff2';
  const pinned = { [url]: digest('sha384', 'font') };
  const bytes = (b) => async () => Buffer.from(b);
  assert.deepEqual(remoteUrls(`<link rel="preconnect" href="https://cdn.jsdelivr.net"><link rel="preload" href="${url}">@font-face{src:url("${url}")}`), [url]);
  assert.deepEqual(await remoteProblems([url], bytes('font'), pinned), []);
  assert.deepEqual(await remoteProblems([url], bytes('tampered'), pinned), [`${url}: does not match its pinned digest`]);
  assert.deepEqual(await remoteProblems(['https://cdn.jsdelivr.net/npm/y@2/g.woff2'], bytes('font'), pinned), ['https://cdn.jsdelivr.net/npm/y@2/g.woff2: not pinned in scripts/sri.mjs']);
  const down = async () => { throw new Error('HTTP 503'); };
  assert.deepEqual(await remoteProblems([url], down, pinned), [`${url}: could not fetch (HTTP 503)`]);
});

test('every pinned font URL is a versioned jsDelivr path', () => {
  for (const [url, value] of Object.entries(PINNED)) {
    assert.match(url, /^https:\/\/cdn\.jsdelivr\.net\/npm\/@fontsource-variable\/geist@\d+\.\d+\.\d+\/files\/[a-z-]+\.woff2$/);
    assert.match(value, /^sha384-[A-Za-z0-9+/]{64}$/);
  }
});

test('a page’s remote files are its link and script tags, not URLs quoted in its text', () => {
  const url = 'https://cdn.jsdelivr.net/npm/x@1.0.0/f.woff2';
  const html = `<link rel="preload" href="${url}" as="font" crossorigin><pre><code>&lt;link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"&gt;</code></pre><p>see https://cdn.jsdelivr.net/npm/z/</p>`;
  assert.deepEqual(remoteRefs(html), [url]);
});

test('a remote file is fetched again before it is reported unreachable', async () => {
  const url = 'https://cdn.jsdelivr.net/npm/x@1.0.0/f.woff2';
  const pinned = { [url]: digest('sha384', 'font') };
  let calls = 0;
  const flaky = async () => { calls++; if (calls < 3) throw new Error('fetch failed'); return Buffer.from('font'); };
  const sleep = async () => {};
  assert.deepEqual(await remoteProblems([url], withRetries(flaky, [1, 1], sleep), pinned), []);
  assert.equal(calls, 3);
  calls = -10;
  assert.deepEqual(await remoteProblems([url], withRetries(flaky, [1, 1], sleep), pinned), [`${url}: could not fetch (fetch failed)`]);
});

const runCli = (check, dist) => spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/sri.mjs', import.meta.url)), ...(check ? ['--check'] : []), dist], { encoding: 'utf8' });

const makeDist = (pages, assets) => {
  const dir = mkdtempSync(join(tmpdir(), 'sri-dist-'));
  for (const [f, bytes] of [...assets, ...Object.entries(pages)]) {
    const p = join(dir, ...f.split('/').filter(Boolean));
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, bytes);
  }
  return dir;
};

const ASSETS = [['/_astro/a.css', 'body{}'], ['/x.js', 'js'], ['/favicon.svg', '<svg></svg>']];
const PAGES = {
  '/index.html': page('<link rel="stylesheet" href="/_astro/a.css"><script type="module" src="/x.js"></script>'),
  '/sub/guide.html': page('<link rel="stylesheet" href="/_astro/a.css">'),
  '/stub.html': page('<link rel="stylesheet" href="/_astro/a.css">', '<meta http-equiv="refresh" content="0;url=/">'),
};

test('hasher digests files by their cleaned url, caches the digest and returns null for a missing file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sri-hash-'));
  try {
    writeFileSync(join(dir, 'a.css'), 'body{}');
    mkdirSync(join(dir, 'sub dir'));
    writeFileSync(join(dir, 'sub dir', 'b.js'), 'js');
    const hash = hasher(dir);
    assert.equal(hash('/a.css'), digest('sha384', 'body{}'));
    assert.equal(hash('/a.css?raw'), digest('sha384', 'body{}'), 'a query string is stripped');
    assert.equal(hash('/a.css#frag'), digest('sha384', 'body{}'), 'a fragment is stripped');
    assert.equal(hash('/sub%20dir/b.js'), digest('sha384', 'js'), 'percent escapes are decoded');
    assert.equal(hash('/nope.css'), null);
    writeFileSync(join(dir, 'a.css'), 'changed{}');
    assert.equal(hash('/a.css'), digest('sha384', 'body{}'), 'the first digest is cached');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI writes integrity into every page and leaves meta-refresh stubs alone', () => {
  const dir = makeDist(PAGES, ASSETS);
  try {
    const r = runCli(false, dir);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, 'sri: 2 pages written\n');
    const out = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.ok(out.includes(`href="/_astro/a.css" integrity="${digest('sha384', 'body{}')}"`));
    assert.ok(out.includes(`src="/x.js" integrity="${digest('sha384', 'js')}"`));
    assert.ok(readFileSync(join(dir, 'sub', 'guide.html'), 'utf8').includes(`integrity="${digest('sha384', 'body{}')}"`));
    assert.equal(readFileSync(join(dir, 'stub.html'), 'utf8'), PAGES['/stub.html'], 'the stub is not rewritten');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--check verifies written pages and exits 0', () => {
  const dir = makeDist(PAGES, ASSETS);
  try {
    assert.equal(runCli(false, dir).status, 0);
    const r = runCli(true, dir);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, 'sri: 2 pages verified, 0 remote file(s) checked\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--check reports each gap as "<file>: <error>" and exits 1', () => {
  const dir = makeDist(PAGES, ASSETS);
  try {
    assert.equal(runCli(false, dir).status, 0);
    writeFileSync(join(dir, '_astro', 'a.css'), 'body{color:red}');
    const r = runCli(true, dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /^\/index\.html: \/_astro\/a\.css: integrity does not match the file$/m);
    assert.match(r.stderr, /^\/sub\/guide\.html: \/_astro\/a\.css: integrity does not match the file$/m);
    assert.match(r.stderr, /^sri: 2 problem\(s\)$/m);
    assert.equal(r.stdout, '', 'with failures the run stops before the summary line');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
