import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callouts, pendingLinks } from '../src/plugins/docs-markdown.mjs';

const el = (tagName, children = [], properties = {}) => ({ type: 'element', tagName, properties, children });
const txt = (value) => ({ type: 'text', value });
const quote = (...children) => el('blockquote', [txt('\n'), ...children, txt('\n')]);
const visitCallout = (node) => callouts.element.visit(node);
const visitLink = (href) => pendingLinks.element.visit(el('a', [txt('label')], { href }));

test('a blockquote starting with a marker becomes that callout, titled by the rest of the line', () => {
  const out = visitCallout(quote(el('p', [txt('[!CAREFUL] Stop is final\nIt cancels every run.')])));
  assert.equal(out.tagName, 'aside');
  assert.deepEqual(out.properties.className, ['callout', 'callout-careful']);
  assert.equal(out.children[0].children[0].value, 'Stop is final');
  assert.equal(out.children[1].children[0].value, 'It cancels every run.');
});

test('each marker has its own class and default title', () => {
  for (const [marker, cls, title] of [['WHY', 'why', 'Why it works this way'], ['CAREFUL', 'careful', 'Careful'], ['PIX', 'pix', 'On a Pix call']]) {
    const out = visitCallout(quote(el('p', [txt(`[!${marker}]\nBody.`)])));
    assert.deepEqual(out.properties.className, ['callout', `callout-${cls}`]);
    assert.equal(out.children[0].children[0].value, title);
  }
});

test('later paragraphs of the quote stay in the callout', () => {
  const out = visitCallout(quote(el('p', [txt('[!WHY] Title')]), el('p', [txt('Second.')])));
  assert.equal(out.children.length, 2);
  assert.equal(out.children[1].children[0].value, 'Second.');
});

test('a plain blockquote, or an unknown marker, is left alone', () => {
  assert.equal(visitCallout(quote(el('p', [txt('Just a quote.')]))), undefined);
  assert.equal(visitCallout(quote(el('p', [txt('[!NOTE] Not ours')]))), undefined);
});

test('a link to a written docs page is kept', () => {
  assert.equal(visitLink('/software-factory/control/autonomy/'), undefined);
  assert.equal(visitLink('/software-factory/control/autonomy/#levels'), undefined);
});

test('a link to an unwritten docs page renders as text', () => {
  const out = visitLink('/software-factory/control/not-written-yet/');
  assert.equal(out.tagName, 'span');
  assert.deepEqual(out.properties.className, ['pending-link']);
  assert.equal(out.children[0].value, 'label');
});

test('external, protocol-relative and non-docs links are never touched', () => {
  assert.equal(visitLink('https://belai.vulnetix.com/'), undefined);
  assert.equal(visitLink('//example.com/x/y'), undefined);
  assert.equal(visitLink('/'), undefined);
  assert.equal(visitLink('/img/sf-board.webp'), undefined);
});
