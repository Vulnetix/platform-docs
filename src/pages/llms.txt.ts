// /llms.txt (llmstxt.org): every product and its sections, each linking to the
// Markdown twin of its first page.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SEGMENT_GROUPS, hrefFor } from '../lib/nav';
import { llmsTxt } from '../lib/site-index.mjs';

export const GET: APIRoute = async () => {
  // The same order as the sidebar (Doc.astro).
  const docs = (await getCollection('docs')).sort((a, b) => (a.data.order - b.data.order) || a.id.localeCompare(b.id));
  const first = (seg: string, sec: string) => docs.find((d) => d.id.split('/')[0] === seg && d.id.split('/')[1] === sec);
  const groups = SEGMENT_GROUPS.map((g) => ({
    title: g.title,
    segments: g.segments.map((s) => ({
      title: s.title,
      summary: s.summary,
      href: hrefFor(s.home),
      sections: s.sections.flatMap((sec) => {
        const d = first(s.id, sec.id);
        return d ? [{ title: sec.title, href: hrefFor(d.id) }] : [];
      }),
    })),
  }));
  return new Response(llmsTxt(groups), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
