// Markdown extensions for the docs, as Sätteri hast plugins (Astro 7's native
// Markdown pipeline; the remark pipeline is not used).
//
// callouts: a blockquote whose first line starts with a marker becomes one of
// the docs' three callouts. Text after the marker is the title.
//
//   > [!WHY] Why runs are held, not dropped
//   > A dropped run means ...
//
//   WHY      the reason behind a design choice
//   CAREFUL  something that changes or stops work when you might not expect it
//   PIX      what to say on a Pix call to do this from a phone
//
// Heading ids are assigned by Astro after these plugins run, so the "#" links
// next to headings are added by the page script in src/layouts/Doc.astro.

import { exists } from '../lib/markdown-export.mjs';

const KINDS = {
  WHY: { cls: 'why', title: 'Why it works this way' },
  CAREFUL: { cls: 'careful', title: 'Careful' },
  PIX: { cls: 'pix', title: 'On a Pix call' },
};
const MARKER = /^\s*\[!(WHY|CAREFUL|PIX)\][ \t]*([^\n]*)\n?/;

const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const txt = (value) => ({ type: 'text', value });

export const callouts = {
  name: 'sf-callouts',
  element: {
    filter: ['blockquote'],
    visit(node) {
      const kids = (node.children ?? []).filter((c) => !(c.type === 'text' && !c.value.trim()));
      const p = kids[0];
      if (!p || p.type !== 'element' || p.tagName !== 'p') return;
      const first = p.children?.[0];
      if (!first || first.type !== 'text') return;
      const m = first.value.match(MARKER);
      if (!m) return;
      const kind = KINDS[m[1]];
      const rest = first.value.slice(m[0].length);
      const pChildren = [...(rest ? [txt(rest)] : []), ...p.children.slice(1)];
      while (pChildren[0] && pChildren[0].type === 'element' && pChildren[0].tagName === 'br') pChildren.shift();
      const body = [...(pChildren.length ? [el('p', {}, pChildren)] : []), ...kids.slice(1)];
      return el('aside', { className: ['callout', `callout-${kind.cls}`] }, [el('p', { className: ['callout-title'] }, [txt(m[2].trim() || kind.title)]), ...body]);
    },
  },
};

// pendingLinks: a link to a docs page that has not been written yet renders as
// plain text, so the site never ships a dead link while sections land one at
// a time. The link appears by itself on the build after its page exists.
// exists() is shared with the Markdown twins (src/lib/markdown-export.mjs),
// which drop the same links.

export const pendingLinks = {
  name: 'sf-pending-links',
  element: {
    filter: ['a'],
    visit(node) {
      const href = node.properties?.href;
      if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return;
      if (exists(href.split('#')[0])) return;
      // Say so in the build log: a link that quietly turns into text is how a
      // typo in a page name goes unnoticed.
      console.warn(`pending link dropped: ${href}`);
      return el('span', { className: ['pending-link'] }, node.children ?? []);
    },
  },
};
