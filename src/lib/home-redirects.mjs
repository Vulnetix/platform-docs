// A segment's home page (<segment>/get-started/overview) is served at
// /<segment>/ (nav.ts hrefFor), so its own path has no page. Links to that
// path still circulate (the CLI installer printed one), so each one gets a
// meta-refresh stub through astro.config.mjs redirects, the same mechanism as
// the moved Platform IaC pages.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DOCS = join(import.meta.dirname, '../content/docs');

export const homeRedirects = () => Object.fromEntries(
  readdirSync(DOCS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(DOCS, d.name, 'get-started/overview.md')))
    .map((d) => [`/${d.name}/get-started/overview`, `/${d.name}/`]),
);
