// Rules for reading Go source without a Go toolchain. inventory-scan.mjs uses
// these; test/go-source.test.mjs pins each rule.

// goLiteral turns a Go default value from a settings spec into what the docs
// show: quotes dropped from a string, a slice literal as a JSON-style list, a
// map literal as an object, and digit separators removed from a number.
//   "x" -> x    []any{} -> []    []any{50, 80} -> [50, 80]
//   map[string]any{"mode": "all"} -> {"mode": "all"}    1_000 -> 1000
// Quotes leave one matched pair at a time, so unbalanced runs that the Default
// matcher can pick up survive repeated calls unchanged.
export function goLiteral(raw) {
  let s = raw;
  while (s.length > 1 && s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  return s
    .replace(/^\[\][\w.]+\{(.*)\}$/, '[$1]')
    .replace(/^map\[[\w.]+\][\w.]+\{(.*)\}$/, '{$1}')
    .replace(/^(\d+(?:_\d+)+)$/, (x) => x.replace(/_/g, ''));
}

// settingSpec reads the fields after `Kind: fcK<Type>` in a settings spec
// line: Min, Max, Default (a whole slice or map literal, a quoted string, or a
// bare value), Store and Locked. Missing fields are left out.
export function settingSpec(rest) {
  const d = {};
  const min = rest.match(/Min: (-?[\d._e+]+)/);
  const max = rest.match(/Max: (-?[\d._e+]+)/);
  const def = rest.match(/Default: ((?:\[\]|map\[[\w.]+\])[\w.]+\{[^}]*\}|"[^"]*"|[^,}]+)/);
  const st = rest.match(/Store: "(\w+)"/);
  if (min) d.min = min[1];
  if (max) d.max = max[1];
  if (def) d.default = goLiteral(def[1]);
  if (/Locked: true/.test(rest)) d.locked = true;
  if (st) d.store = st[1];
  return d;
}

// A file's subcommands belong to the command that dispatches to it. Most files
// in belai/cmd/belai are named for their command (rccmd.go -> rc); the few
// that are not are listed here.
export const SUB_PARENT = { agentfiles: 'agent crew' };
export const subParent = (file) => {
  const n = file.replace(/(cmd)?\.go$/, '');
  return SUB_PARENT[n] ?? n;
};

// goSubcommands lists "<command> <sub>" for each top-level `case "x":` in a
// command file. Cases of a switch on a dereferenced flag (switch *backend)
// are that flag's values, not subcommands, and are skipped. main.go holds the
// root flags, not a subcommand switch, so it yields nothing.
export function goSubcommands(file, src) {
  if (file === 'main.go') return [];
  const out = [];
  for (const m of src.matchAll(/^\tcase ("[a-z][a-z0-9-]*"(?:, "[a-z][a-z0-9-]*")*):/gm)) {
    const sw = [...src.slice(0, m.index).matchAll(/^\tswitch (.*) \{$/gm)].pop();
    if (sw && /\*[a-zA-Z]/.test(sw[1])) continue;
    for (const v of m[1].matchAll(/"([^"]+)"/g)) out.push(`${subParent(file)} ${v[1]}`);
  }
  return out;
}
