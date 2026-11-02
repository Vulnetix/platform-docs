# platform-docs

Source for https://docs.vulnetix.com, the user and reference documentation for every Vulnetix product. Each product has its own segment of the site under `src/content/docs/<segment>/`; the segments are listed in `src/lib/nav.ts`.

| Segment | Path | Was |
|---|---|---|
| Software Factory (console, workflows, Pix calls, the Belai CLI and TUI) | `src/content/docs/software-factory/` | software-factory.vulnetix.com |

Old docs hostnames answer with a 301 to the matching path here. Those rules live in `vdb-site/terraform/dns.tf`, the only owner of the zone's redirect ruleset.

Astro 7, Tailwind v4 and Pagefind. The site is static: search runs in the browser and there is no backend.

```sh
corepack enable
yarn install
yarn dev            # http://localhost:4321
yarn build          # dist/ plus the Pagefind index
yarn check-links    # after a build
```

Pages are Markdown in `src/content/docs/<segment>/`. Pushing to `main` deploys through `.github/workflows/pages.yml`. DNS and the Pages settings live in `terraform/`.

## Feature coverage (Software Factory segment)

Every Software Factory feature has to be documented, and features land upstream every day, so coverage is checked by machine:

- `scripts/inventory-scan.mjs` reads sibling checkouts of `vdb-site`, `website`, `belai` and `saas` and writes `inventory/atoms.json`. An atom is one thing a user can touch, such as an API route, a console page, a settings key, an enum value, an error code, a CLI flag, a TUI command or a voice tool. It also lists every handler file, package and design doc, so a new one is never skipped silently. The file records the commit of each repository it read.
- `inventory/features.mjs` is the full list of features. Each feature names the page that documents it and gives patterns for the atoms it owns. Its status moves from `todo` to `drafted` (the page is written from the code) to `verified` (the page was re-read against the code at the commits in its `checked` frontmatter). A feature found after a pass enters as `drafted`.
- `scripts/inventory-check.mjs` fails if:
  - an atom matches no feature
  - a drafted or verified feature has no page
  - a page leaves out a key, code, enum value, slash command or other user-facing atom of its feature. Routes, CLI flags, Belai config keys and templates may instead be named only on the generated reference pages, and a feature can leave other atoms to them with `refOnly`.

  It writes `COVERAGE.md`.

The scanner reads Go source with regular expressions, so a few rules decide what counts. They live in `scripts/lib/go-source.mjs` and the coverage rules in `scripts/lib/coverage.mjs`, and `yarn test` pins each one:

- A setting's default is read as a whole Go literal and shown as JSON: `[]any{50, 80}` becomes `[50, 80]`, a map becomes an object.
- A subcommand is a `case "x":` of a command file's switch. Cases of a switch on a flag's value (`switch *backend`) are flag values, not subcommands. A file is named for its command (`rccmd.go` is `rc`), except those listed in `SUB_PARENT` (`agentfilescmd.go` is `agent crew`).
- A link to a docs page that does not exist yet renders as plain text, and a blockquote that starts `[!WHY]`, `[!CAREFUL]` or `[!PIX]` becomes a callout (`src/plugins/docs-markdown.mjs`).

CI runs `yarn test` and the strict coverage check before every deploy.

To pick up new upstream features, pull the source repositories and then run:

```sh
yarn inventory:scan
yarn inventory:check     # lists unmatched atoms: add or extend features for them
```

Source paths default to `../<repo>`. Override them with `SF_SRC_VDB_SITE=/path` and the matching variable for each other repository.

The same scan also reads `cli` (every Cobra command path, from `cmd/*.go` and `docs/command-manifest.json`), `config-schemas` (every kind), `vdb-site` (the `/v1/config` routes) and `siem` (Guardian's console API routes). Those features sit at the end of `inventory/features.mjs`; their pages start with `/` and are relative to `src/content/docs`. A CLI command with no docs yet is listed in `UNDOCUMENTED` there, under a `todo` feature.

## Generated pages and drift checks

- `migration/generators/*` write the generated pages from the source repositories. The `generators` job in `pages.yml` checks out `cli`, `config-schemas`, `malscan-engine` and `mcp-server`, reruns them and fails when a page differs in anything but its `checked:` stamp. It does not block the deploy. `mcp-server` is private, so the job needs a `DOCS_READ_TOKEN` secret with read access to it; without it the MCP count test only compares the pages with each other.
- `test/mcp-counts.test.mjs` compares the tool and prompt counts quoted on the mcp-server pages with the registrations in `../mcp-server/src`.
- `test/migration.test.mjs` checks the retired hosts' redirect maps: every target is a page (and heading), no old path is listed twice, and every host and alias has a Worker route.
- `test/status.test.mjs` requires a `status` on every vscode page.

The redirect Worker (`redirects/`) is deployed by hand: `node scripts/build-redirects.mjs --check dist`, then `npx wrangler deploy` from `redirects/`.
