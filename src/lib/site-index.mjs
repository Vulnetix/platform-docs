// The site's product index for agents, in two forms from one list:
// /index.md (src/pages/index.md.ts), the home page as Markdown with
// root-relative links, and /llms.txt (src/pages/llms.txt.ts) in the llmstxt.org
// format with absolute links. Every link is to a page's Markdown twin.
//
// groups: [{ title, segments: [{ title, summary, href, sections?: [{ title, href }] }] }]
// with hrefs as nav.ts hrefFor gives them.
import { mdHref } from './markdown-export.mjs';

export const SITE = 'https://docs.vulnetix.com';
const RULE = 'Every page is Markdown at its path with ".md" in place of the trailing slash';

export const homeMarkdown = (groups) => [
  '# Vulnetix documentation',
  `User and reference documentation for every Vulnetix product. ${RULE}.`,
  '## Start here',
  [
    '1. [Install the CLI](/cli/get-started/install.md) with the install script, Homebrew, Scoop or a direct download.',
    '2. [Run your first scan](/cli/get-started/quickstart.md): `vulnetix auth login`, then `vulnetix scan` from the project root.',
    "3. [Open the Resolve Platform](https://www.vulnetix.com/resolve/) to see the scan's findings, triage them and set policy for your organization.",
  ].join('\n'),
  ...groups.flatMap((g) => [`## ${g.title}`, g.segments.map((s) => `- [${s.title}](${mdHref(s.href)}): ${s.summary}`).join('\n')]),
].join('\n\n') + '\n';

export const llmsTxt = (groups) => {
  const abs = (href) => SITE + mdHref(href);
  return [
    '# Vulnetix documentation',
    `> User and reference documentation for every Vulnetix product: the CLI and its scanners, configuration as code, Software Factory, firewalls, SBOM, VEX, the MCP server and the VDB API. ${RULE}; ${SITE}/index.md is the start page.`,
    ...groups.flatMap((g) => [
      `## ${g.title}`,
      g.segments.map((s) => [
        `- [${s.title}](${abs(s.href)}): ${s.summary}`,
        ...(s.sections ?? []).map((sec) => `  - [${sec.title}](${abs(sec.href)})`),
      ].join('\n')).join('\n'),
    ]),
  ].join('\n\n') + '\n';
};
