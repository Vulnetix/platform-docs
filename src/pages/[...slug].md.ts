// The Markdown twin of every docs page, at the page's path with ".md" in place
// of the trailing slash: /cli/get-started/install/ → /cli/get-started/install.md.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { hrefFor } from '../lib/nav';
import { toMarkdown } from '../lib/markdown-export.mjs';

export const getStaticPaths = (async () => {
  const docs = await getCollection('docs');
  return docs.map((d) => ({ params: { slug: hrefFor(d.id).replace(/^\/|\/$/g, '') }, props: { entry: d } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: CollectionEntry<'docs'> };
  const { title, description, status } = entry.data;
  return new Response(toMarkdown({ title, description, status, body: entry.body }), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
