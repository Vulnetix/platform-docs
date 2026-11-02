// The coverage rules inventory-check.mjs enforces. test/coverage.test.mjs pins
// each rule.
//
// 1. Every atom matches at least one feature. An unmatched atom is a feature
//    nobody has listed.
// 2. Every feature that is drafted or verified has its page on disk.
// 3. Every user-facing atom of a drafted or verified feature is named on that
//    feature's own page. Atoms of REF_KINDS, and atoms a feature lists in
//    `refOnly`, may instead be named only on the generated reference pages.
//    A feature may name more pages in `pages`; an atom named on any of its
//    pages counts. A page path that starts with "/" is relative to the docs
//    root rather than the Software Factory segment (inventory-check.mjs).

export const USER_FACING = new Set(['setting', 'code', 'enum', 'route', 'cli-flag', 'cli-sub', 'cli-cmd', 'tui-cmd', 'voice-tool', 'template', 'default', 'console', 'belai-config', 'cli-command', 'iac-kind', 'config-route', 'guardian-route']);
// Long lists a guide should summarise, not repeat.
export const REF_KINDS = new Set(['route', 'cli-flag', 'belai-config', 'template']);
export const REFERENCE_PAGES = ['reference/settings', 'reference/validation-codes', 'reference/enums', 'reference/http-api', 'reference/console-routes', 'reference/templates', 'reference/voice-tools', 'belai/cli-reference', 'belai/tui-commands', 'belai/settings-file'];
export const STATUSES = ['todo', 'drafted', 'verified', 'n/a'];

// needle is the text that must appear on a page for an atom to count as named
// there: an enum's value, a route's path without /v1, a flag with its dash, a
// subcommand's last word, a Belai config key without its section.
export function needle(a) {
  switch (a.kind) {
    case 'enum': return a.value.split('=')[1];
    case 'route':
    case 'config-route': return a.value.split(' ')[1].replace(/^\/v1/, '');
    // Guardian's API page writes its paths from /v1/guardian.
    case 'guardian-route': return a.value.split(' ')[1].replace(/^\/v1\/guardian/, '');
    case 'cli-flag': return `-${a.value.split(' -')[1]}`;
    case 'cli-sub': return a.value.split(' ').slice(-1)[0];
    case 'belai-config': return a.value.split('.').slice(1).join('.');
    default: return a.value;
  }
}

// checkCoverage applies the three rules. textOf(page) returns a page's
// Markdown, or null when the page does not exist.
export function checkCoverage(atoms, features, textOf) {
  const problems = [];
  const ids = new Set();
  const fts = features.map((ft) => {
    if (ids.has(ft.id)) problems.push(`duplicate feature id ${ft.id}`);
    ids.add(ft.id);
    return { ...ft, _re: ft.match.map((p) => new RegExp(p)), _refOnly: (ft.refOnly ?? []).map((p) => new RegExp(p)), _atoms: [] };
  });

  const unmatched = [];
  for (const a of atoms) {
    let hit = false;
    for (const ft of fts) if (ft._re.some((re) => re.test(a.id))) { ft._atoms.push(a); hit = true; }
    if (!hit) unmatched.push(a);
  }

  const ref = REFERENCE_PAGES.map(textOf).filter(Boolean).join('\n');
  const missing = [];
  for (const ft of fts) {
    if (ft.status === 'todo' || ft.status === 'n/a') continue;
    const texts = [ft.page, ...(ft.pages ?? [])].map((p) => [p, textOf(p)]);
    const gone = texts.filter(([, t]) => t == null).map(([p]) => p);
    if (gone.length) { problems.push(`${ft.id}: status ${ft.status} but ${gone.map((p) => `${p}.md`).join(', ')} does not exist`); continue; }
    const text = texts.map(([, t]) => t).join('\n');
    for (const a of ft._atoms) {
      if (!USER_FACING.has(a.kind)) continue;
      const n = needle(a);
      if (text.includes(n)) continue;
      if ((REF_KINDS.has(a.kind) || ft._refOnly.some((re) => re.test(a.id))) && ref.includes(n)) continue;
      missing.push(`${ft.id} (${ft.page}): ${a.id}`);
    }
  }
  return { features: fts, unmatched, missing, problems, ok: !unmatched.length && !missing.length && !problems.length };
}
