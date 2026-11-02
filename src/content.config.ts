import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    // One sentence shown under the title and used as the meta description.
    description: z.string(),
    // Sort order inside the page's section in the sidebar.
    order: z.number().default(100),
    // Shorter label for the sidebar, when the title is long.
    nav: z.string().optional(),
    // Where the page's facts come from, shown at the foot of the page.
    sources: z.array(z.string()).default([]),
    // The commits the page was last checked against, e.g. "vdb-site@4f6d37b".
    checked: z.array(z.string()).default([]),
    updated: z.string().optional(),
    // Written by scripts/gen-reference.mjs; edit the generator, not the page.
    generated: z.boolean().default(false),
    // Delivery status, for a product whose docs cover features that have not
    // shipped (the VS Code extension). Doc.astro renders it as a badge under the
    // title, with a note on anything that is not `available`.
    status: z.enum(['available', 'in-development', 'planned']).optional(),
  }),
});

export const collections = { docs };
