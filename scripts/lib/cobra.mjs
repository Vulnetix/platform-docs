// cobra.mjs: read a Cobra command tree from Go source without a Go toolchain.
//
// The Vulnetix CLI declares its commands in cmd/*.go in a few shapes, and this
// reads each of them with regular expressions:
//
//   var fooCmd = &cobra.Command{ Use: "foo ..." }        package-level command
//   cmd := &cobra.Command{ Use: "foo" } ... return cmd   command built by a func
//   return &cobra.Command{ Use: "foo" }                  the same, returned directly
//   parent.AddCommand(fooCmd, newBarCommand(), ...)      edges, on one line or several
//   parent.AddCommand(&cobra.Command{ Use: "baz" })      inline child
//   for _, c := range []*cobra.Command{a, b} { parent.AddCommand(c) }
//
// A command's name is the first word of its Use string. Paths start below the
// root command (rootCmd), so `vulnetix auth login` is "auth login". A Hidden
// command (and everything under it) is left out. A command
// whose Use is not a string literal (vdb_defences.go builds its lanes from a
// table) is not reached; the CLI's command manifest covers those.

const DEF_GLOBAL = /^var\s+(\w+)\s*=\s*&cobra\.Command\{/;
const DEF_LOCAL = /^\s+(\w+)\s*:?=\s*&cobra\.Command\{/;
const DEF_RETURN = /^\s+return\s+&cobra\.Command\{/;
const DEF_INLINE = /^\s*(\w+)\.AddCommand\(&cobra\.Command\{/;
const FUNC = /^func\s+(?:\([^)]*\)\s+)?(\w+)\(/;
const USE = /\bUse:\s*"([^"]*)"/;

// Split a call's argument text at top-level commas.
function splitArgs(body) {
  const args = [];
  let d = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(' || ch === '{' || ch === '[') d++;
    if (ch === ')' || ch === '}' || ch === ']') d--;
    if (ch === ',' && d === 0) { args.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

/**
 * @param {{file: string, src: string}[]} files Go files (tests excluded by the caller)
 * @returns {Map<string, {file: string, use: string}>} command path -> where it is declared
 */
export function cobraTree(files) {
  const nodes = new Map(); // key -> { use, file }
  const funcResult = new Map(); // builder func name -> key of the command it returns
  const pending = []; // { file, fn, parent, child, resolved? }

  for (const { file, src } of files) {
    const lines = src.split('\n');
    const fnAt = [];
    const rangeAt = [];
    let fn = null;
    let rangeList = null;
    let collecting = null;
    const scoped = (name) => `${file}:${fn}:${name}`;
    // The Use: of a definition starting at line i, on that line or below it,
    // before the definition's closing brace, and whether it is Hidden.
    const useFrom = (i) => {
      const indent = lines[i].match(/^\s*/)[0];
      let use = null;
      let hidden = false;
      for (let j = i; j < Math.min(lines.length, i + 400); j++) {
        const m = lines[j].match(USE);
        if (m && use == null) use = m[1];
        if (/^\s*Hidden:\s*true/.test(lines[j])) hidden = true;
        if (j > i && lines[j].startsWith(`${indent}}`)) break;
      }
      return use == null ? null : { use, hidden };
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const f = line.match(FUNC);
      if (f) { fn = f[1]; rangeList = null; }

      let m;
      if ((m = line.match(DEF_GLOBAL))) {
        const d = useFrom(i);
        if (d) nodes.set(m[1], { ...d, file });
      } else if ((m = line.match(DEF_INLINE))) {
        const d = useFrom(i);
        if (d) {
          const key = `${file}:${i}:inline`;
          nodes.set(key, { ...d, file });
          pending.push({ file, fn, parent: m[1], child: key, resolved: true });
        }
      } else if (fn && (m = line.match(DEF_LOCAL))) {
        const d = useFrom(i);
        if (d) nodes.set(scoped(m[1]), { ...d, file });
      } else if (fn && DEF_RETURN.test(line)) {
        const d = useFrom(i);
        if (d) { const key = `${file}:${fn}:()`; nodes.set(key, { ...d, file }); funcResult.set(fn, key); }
      }
      if (fn && (m = line.match(/^\s+return\s+(\w+)\s*$/)) && nodes.has(scoped(m[1]))) funcResult.set(fn, scoped(m[1]));

      if ((m = line.match(/range\s+\[\]\*cobra\.Command\{([^}]*)(\})?/))) {
        const ids = m[1].split(',').map((s) => s.trim()).filter(Boolean);
        if (m[2]) rangeList = ids; else collecting = ids;
      } else if (collecting) {
        const end = line.indexOf('}');
        collecting.push(...line.slice(0, end < 0 ? undefined : end).split(',').map((s) => s.trim()).filter(Boolean));
        if (end >= 0) { rangeList = collecting; collecting = null; }
      }
      fnAt[i] = fn;
      rangeAt[i] = rangeList;
      if (/^\}/.test(line)) fn = null;
    }

    // AddCommand calls, read from the whole file so a call on the same line as
    // its func (`func init() { rootCmd.AddCommand(x) }`) or spread over several
    // lines is read the same way.
    const starts = [0];
    for (let k = 0; k < src.length; k++) if (src[k] === '\n') starts.push(k + 1);
    const lineOf = (off) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; } return lo; };
    for (const m of src.matchAll(/(\w+)\.AddCommand\(/g)) {
      let depth = 1;
      let j = m.index + m[0].length;
      const start = j;
      while (j < src.length && depth > 0) {
        if (src[j] === '(') depth++;
        else if (src[j] === ')') depth--;
        j++;
      }
      const body = src.slice(start, j - 1);
      if (/^\s*&cobra\.Command\{/.test(body)) continue; // inline child, read above
      const ln = lineOf(m.index);
      const at = fnAt[ln];
      for (const a of splitArgs(body)) {
        if (rangeAt[ln] && /^\w+$/.test(a) && !nodes.has(`${file}:${at}:${a}`) && !nodes.has(a)) {
          for (const r of rangeAt[ln]) pending.push({ file, fn: at, parent: m[1], child: r });
          continue;
        }
        const call = a.match(/^(\w+)\(/);
        pending.push({ file, fn: at, parent: m[1], child: call ? { fn: call[1] } : a });
      }
    }
  }

  const resolve = (name, file, fn) => {
    if (typeof name === 'object') return funcResult.get(name.fn) ?? null;
    if (fn && nodes.has(`${file}:${fn}:${name}`)) return `${file}:${fn}:${name}`;
    if (nodes.has(name)) return name;
    return null;
  };
  const children = new Map();
  for (const e of pending) {
    const p = resolve(e.parent, e.file, e.fn);
    const c = e.resolved ? e.child : resolve(e.child, e.file, e.fn);
    if (p && c) (children.get(p) ?? children.set(p, []).get(p)).push(c);
  }

  const paths = new Map();
  const visit = (key, prefix, seen) => {
    for (const c of children.get(key) ?? []) {
      if (seen.has(c)) continue;
      const n = nodes.get(c);
      const name = n.use.split(/\s+/)[0];
      if (!name || n.hidden) continue;
      const path = prefix ? `${prefix} ${name}` : name;
      if (!paths.has(path)) paths.set(path, n);
      visit(c, path, new Set([...seen, c]));
    }
  };
  visit('rootCmd', '', new Set(['rootCmd']));
  return paths;
}
