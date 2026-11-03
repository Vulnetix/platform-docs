# platform-docs

Source for https://docs.vulnetix.com, the user and reference documentation for every Vulnetix product. Each product has its own segment of the site under `src/content/docs/<segment>/`; the segments are listed in `src/lib/nav.ts`.
Old docs hostnames answer with a 301 to the matching path here. Those rules live in `vdb-site/terraform/dns.tf`, the only owner of the zone's redirect ruleset.
The redirect Worker (`redirects/`) is deployed by hand: `node scripts/build-redirects.mjs --check dist`, then `npx wrangler deploy` from `redirects/`.

Astro 7, Tailwind v4 and Pagefind. The site is static: search runs in the browser and there is no backend.

```sh
corepack enable
yarn install
yarn dev            # http://localhost:4321
yarn build          # dist/ plus the Pagefind index
yarn check-links    # after a build
```

Pages are Markdown in `src/content/docs/<segment>/`. Pushing to `main` deploys through `.github/workflows/pages.yml`. DNS and the Pages settings live in `terraform/`.

## Generated pages and drift checks

- `migration/generators/*` write the generated pages from the source repositories. The `generators` job in `pages.yml` checks out `cli`, `config-schemas` (at the tag pinned in `migration/generators/releases.json`), `terraform-provider-resolve` and `malscan-engine`, reruns them and fails when a page differs in anything but its `checked:` stamp.
- `migration/generators/kind-reference.mjs` writes the Platform IaC kind pages, the kind catalogue, the CEL reference and the Terraform resource list. It reads the schemas (and each schema's `x-vulnetix` annotation), the schema examples, the provider's HCL examples on its `main` branch, and the `cli` release pinned in `releases.json`; the facts a schema cannot carry are in `kind-notes.mjs`. To move to newer releases run `node migration/generators/releases.mjs --bump` (with `GH_TOKEN` set), check out the pinned `config-schemas` tag, and run it against that checkout: `node migration/generators/kind-reference.mjs --schemas ../config-schemas --provider ../terraform-provider-resolve --cli ../cli`. It does not block the deploy.
- `test/mcp-counts.test.mjs` compares the tool and prompt counts quoted on the mcp-server pages with the registrations in `../mcp-server/src`.
- `test/migration.test.mjs` checks the retired hosts' redirect maps: every target is a page (and heading), no old path is listed twice, and every host and alias has a Worker route.
- `test/status.test.mjs` requires a `status` on every vscode page.
