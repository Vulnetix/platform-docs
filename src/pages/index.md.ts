// The site home as Markdown (/index.md): where to start, and every product with
// a link to its Markdown home. The index agents start from.
import type { APIRoute } from 'astro';
import { SEGMENT_GROUPS, hrefFor } from '../lib/nav';
import { mdHref } from '../lib/markdown-export.mjs';

export const GET: APIRoute = () => {
  const body = [
    '# Vulnetix documentation',
    'User and reference documentation for every Vulnetix product. Every page is also Markdown at its path with ".md" in place of the trailing slash.',
    '## Start here',
    [
      '1. [Install the CLI](/cli/get-started/install.md) with the install script, Homebrew, Scoop or a direct download.',
      '2. [Run your first scan](/cli/get-started/quickstart.md): `vulnetix auth login`, then `vulnetix scan` from the project root.',
      "3. [Open the Resolve Platform](https://www.vulnetix.com/resolve/) to see the scan's findings, triage them and set policy for your organization.",
    ].join('\n'),
    ...SEGMENT_GROUPS.flatMap((g) => [`## ${g.title}`, g.segments.map((s) => `- [${s.title}](${mdHref(hrefFor(s.home))}): ${s.summary}`).join('\n')]),
  ];
  return new Response(body.join('\n\n') + '\n', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
