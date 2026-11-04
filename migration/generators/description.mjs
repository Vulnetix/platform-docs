// description.mjs: fit a generated page description to a search result.
//
// A description is the subtitle under a page title and its meta description,
// which search engines cut at about 160 characters. Generated descriptions come
// from prose written for the page itself and often run longer, so they are
// shortened here, at the last clause that still leaves a whole thought, rather
// than truncated mid-word by whoever displays them.

export const MAX_DESCRIPTION = 160;

// Cut points, strongest first: a clause, then a list item, then a conjunction.
const TIERS = [/(, and |; |: )/g, /, /g, /( and | or )/g];

export function metaDescription(text, max = MAX_DESCRIPTION) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  // The longest prefix that ends at the strongest boundary that fits with a
  // full stop and still says something (60 characters or more).
  for (const tier of TIERS) {
    let cut = -1;
    for (const m of s.matchAll(tier)) {
      if (m.index + 1 > max) break;
      if (m.index >= 60) cut = m.index;
    }
    if (cut > 0) return `${s.slice(0, cut).replace(/[\s,;:.]+$/, '')}.`;
  }
  // No usable clause: end at a word, and say it continues.
  const words = s.slice(0, max - 1);
  return `${words.slice(0, words.lastIndexOf(' ')).replace(/[\s,;:.]+$/, '')}…`;
}
