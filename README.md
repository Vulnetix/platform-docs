# platform-docs

Source for https://docs.vulnetix.com, the user and reference documentation for every Vulnetix product. Each product has its own segment of the site under `src/content/docs/<segment>/`; the segments are listed in `src/lib/nav.ts`.
Old docs hostnames answer with a 301 to the matching path here. Those rules live in `vdb-site/terraform/dns.tf`, the only owner of the zone's redirect ruleset.
The redirect Worker (`redirects/`) is deployed by hand: `node scripts/build-redirects.mjs --check dist`, then `npx wrangler deploy` from `redirects/`.

Astro 7, Tailwind v4 and Pagefind. The site is static: search runs in the browser and there is no backend.
A link to any page with `?search` (or `?search=<terms>`) opens the search dialog on arrival, prefilled with the terms, and drops the parameter from the address bar so a reload does not reopen it. The www.vulnetix.com footer links to `/?search`.

```sh
corepack enable
yarn install
yarn dev            # http://localhost:4321
yarn build          # dist/ plus the Pagefind index
yarn check-links    # after a build
```

Pages are Markdown in `src/content/docs/<segment>/`. Pushing to `main` deploys through `.github/workflows/pages.yml`. DNS and the Pages settings live in `terraform/`.

## Markdown for agents

Every page is also served as Markdown at its path with `.md` in place of the trailing slash: `/cli/get-started/install/` is `/cli/get-started/install.md`, a segment home `/cli/` is `/cli.md`, and the site home is `/index.md`, which lists every product. `src/pages/[...slug].md.ts` and `src/pages/index.md.ts` write them with `src/lib/markdown-export.mjs`; `test/markdown-export.test.mjs` covers the rules.

- A twin is `# Title`, the description, a status line only when the page is not `available`, then the page body. No front matter, no footer.
- HTML comments are dropped from prose and kept inside code. Runs of blank lines collapse to one.
- A link to another page points at its `.md` twin, anchor kept; a link to a segment home's own path (`/<segment>/get-started/overview/`) points at `/<segment>.md`. Assets, `/?search`, external links and code are left alone.
- A link to a page that does not exist yet becomes its text, the same rule `pendingLinks` applies to the HTML (both use `exists()`).
- Redirect stubs have no twin.

Each HTML page names its twin in `<meta name="markdown">` and `<link rel="alternate" type="text/markdown">`, has a Markdown button under the description, and opens its `<body>` with a note telling agents to fetch the Markdown (clipped from view and `aria-hidden`, but left in the DOM so HTML-to-text tools read it).

`/llms.txt` (llmstxt.org format, `src/pages/llms.txt.ts`) lists every product and its sections with absolute links to their Markdown twins. It and `/index.md` are built from one list in `src/lib/site-index.mjs`.

## Search engines

- **Sitemap.** `scripts/sitemap.mjs` writes `sitemap-index.xml` and `sitemap-0.xml` from the built pages (not redirect stubs, not the `.md` twins); `robots.txt` points at it, which is how Google finds it. Each page's `<lastmod>` is its front matter `updated` (Doc.astro writes it as `<meta property="article:modified_time">`), else the date of the last commit to its source file, else left out. The build job checks out full history for the git fallback; in a shallow clone those pages get no `<lastmod>`.
- **IndexNow.** `scripts/indexnow.mjs` sends every sitemap URL on docs.vulnetix.com to `api.indexnow.org`, Bing and Yandex, which share it with Seznam, Naver, Mojeek and DuckDuckGo. It runs in the `indexnow` job of `pages.yml` after each deploy, and daily at 07:00 UTC through `seo.yml` (also run by hand with `gh workflow run seo.yml`). `--dry-run` prints the payload without sending. The key is public by design: `public/<key>.txt` holds it as the proof of ownership and must match `KEY` in the script. A run fails only when every endpoint refuses.

## Integrity

`scripts/sri.mjs` runs last in `yarn build`; `node scripts/sri.mjs --check dist` in `pages.yml` fails the deploy on any gap.

- Each same-origin `<link rel="stylesheet">`, `<link rel="preload">` and `<script src>` gets `integrity="sha384-…"` from the built file.
- An import map pins `/pagefind/pagefind.js`, which search loads with a dynamic import, by its sha384. Browsers without import-map integrity ignore it.
- Every page has a Content-Security-Policy `<meta>` (GitHub Pages cannot send headers), right after `<meta charset>`: `'self'` for everything, `'wasm-unsafe-eval'` for Pagefind, and the sha256 of every inline script and style. Astro (`security.csp` in `astro.config.mjs`) hashes the scripts it bundles; `sri.mjs` adds the `is:inline` theme script and the import map.
- Not covered: Pagefind's index and fragment files, which it fetches, and inline `style="…"` attributes (Shiki's code colours), which `style-src-attr 'unsafe-inline'` allows.
- A new external script, style, font or image would be blocked by the policy until it is added to `astro.config.mjs`.

## Generated pages and drift checks

- `migration/generators/*` write the generated pages from the source repositories. The `generators` job in `pages.yml` checks out `cli`, `config-schemas` (at the tag pinned in `migration/generators/releases.json`), `terraform-provider-resolve` and `malscan-engine`, reruns them and fails when a page differs in anything but its `checked:` stamp.
- `migration/generators/kind-reference.mjs` writes the Platform IaC kind pages, the kind catalogue, the CEL reference and the Terraform resource list. It reads the schemas (and each schema's `x-vulnetix` annotation), the schema examples, the provider's HCL examples on its `main` branch, and the `cli` release pinned in `releases.json`; the facts a schema cannot carry are in `kind-notes.mjs`. To move to newer releases run `node migration/generators/releases.mjs --bump` (with `GH_TOKEN` set), check out the pinned `config-schemas` tag, and run it against that checkout: `node migration/generators/kind-reference.mjs --schemas ../config-schemas --provider ../terraform-provider-resolve --cli ../cli`. It does not block the deploy.
- `test/mcp-counts.test.mjs` compares the tool and prompt counts quoted on the mcp-server pages with the registrations in `../mcp-server/src`.
- `test/migration.test.mjs` checks the retired hosts' redirect maps: every target is a page (and heading), no old path is listed twice, and every host and alias has a Worker route.
- `test/status.test.mjs` requires a `status` on every vscode page.
- `test/descriptions.test.mjs` requires every page `description` to be 160 characters or fewer, the length search results show. Generators fit theirs with `metaDescription` in `migration/generators/description.mjs`, which ends a long one at its strongest clause.
