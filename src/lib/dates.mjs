// Front matter `updated` is written "05 Nov 2026". isoDate turns it into
// "2026-11-05" for <meta property="article:modified_time"> and the sitemap's
// <lastmod>, or null when it does not parse: a wrong date is worse than none.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const isoDate = (text) => {
  const m = String(text ?? '').trim().match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  const day = Number(m[1]);
  if (month < 0 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(Number(m[3]), month, day));
  if (d.getUTCDate() !== day) return null; // 31 Feb
  return d.toISOString().slice(0, 10);
};
