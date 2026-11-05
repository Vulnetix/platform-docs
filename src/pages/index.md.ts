// The site home as Markdown (/index.md): where to start, and every product with
// a link to its Markdown home. The index agents start from.
import type { APIRoute } from 'astro';
import { SEGMENT_GROUPS, hrefFor } from '../lib/nav';
import { homeMarkdown } from '../lib/site-index.mjs';

export const GET: APIRoute = () => {
  const groups = SEGMENT_GROUPS.map((g) => ({ title: g.title, segments: g.segments.map((s) => ({ title: s.title, summary: s.summary, href: hrefFor(s.home) })) }));
  return new Response(homeMarkdown(groups), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
