---
title: Reading the results
description: How the SAST terminal report groups findings by rule, what each group means, how --explain shows the evidence for one rule or file, and how test code and vendored code are recognised.
order: 1
sources: [cli/internal/report/code.go, cli/internal/report/testdata/code_rules_110.golden, cli/cmd/scan_explain.go, cli/internal/testsuite/attribute.go, cli/internal/testsuite/detect.go, cli/internal/scanopts/surface.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

In a terminal, `vulnetix sast` groups findings by rule, the way the dependency report groups by package. Each rule appears once, with how many places it fired, then its top files and line numbers:

```text
 ✖ SAST 19 findings in 8 files          15 need action · 1 can wait · 2 in tests · 1 vendored
   1 rule needs action · 774 of 2865 rules ran

 NEEDS ACTION · 1 rule · 15 places · production code
 ────────────────────────────────────────────────────────────────────────────────────────────────
 ● HIGH      VNX-GO-014    Lock() without a deferred Unlock()                       15 in 4 files
             internal/lsp/server.go   10   172 184 251 268 287 322 351 378 518 601
             internal/lsp/sca.go       3   231 247 252
             cmd/root.go               1   66
             + 1 more file

 CAN WAIT · 1 rule · 1 place · medium and low
 ────────────────────────────────────────────────────────────────────────────────────────────────
 ● MEDIUM    VNX-1325      make() sized from len()                                cmd/scan.go:103

 IN TESTS · 2 high-severity places · listed, not ranked
 ────────────────────────────────────────────────────────────────────────────────────────────────
             VNX-GO-014 2

 VENDORED · 1 place · third-party files in the tree
 ────────────────────────────────────────────────────────────────────────────────────────────────
             schemas/third_party/    1   VNX-CRYPTO-004 ×1

 NEXT
   vulnetix sast --explain VNX-GO-014            the rule, and all 15 places with the matched code
   vulnetix sast -v                              one snippet per rule, and every file it fired in
   vulnetix sast --show tests                    rank test code with the rest
   vulnetix sast --exclude schemas/third_party/  stop scanning code you did not write
```

"774 of 2865 rules ran" counts the rules left after the kind lock and the language pre-filter, against every rule loaded, including `--rule` packs.

## Groups

| Group | Contains |
|---|---|
| NEEDS ACTION | Critical and high findings in production code. |
| CAN WAIT | Medium and low findings, one line per rule. Seven rules by default; `-v` lists all. |
| IN TESTS | Critical and high findings in [test code](#test-code). Counted and listed, not ranked. `--show tests` moves them into NEEDS ACTION. |
| VENDORED | Critical and high findings under a `third_party/`, `third-party/`, `thirdparty/`, `vendor/`, `vendored/`, `node_modules/` or `bower_components/` directory. NEXT suggests the `--exclude` that stops scanning it. |
| NEXT | Commands that exist for this result, with the flags of this run (`--path`, `--exclude`, `--rule`) repeated. |

The groups change only the terminal view. SARIF, the upload and `--fail-on` see every finding: a high finding in a test file still fails `--fail-on high` unless you [suppress it](/sast/guides/suppressing-findings/#test-code).

In a pipe, or when `CI` is set, `--view auto` prints one plain line per finding instead. Force a layout with `--view plain`, `--view findings`, `--view table` or `--view json`.

## Explain one rule or file

```bash
vulnetix sast --explain VNX-GO-014        # one rule
vulnetix sast --explain internal/lsp/server.go   # every rule that fired in one file
```

| Query | What runs | Prints |
|---|---|---|
| A rule ID | That rule alone, as `--rule-id` does. No SCA. | The rule's severity, kind and description (WHY IT MATTERS), then every place it fired (WHERE): production code first, grouped by file, three matched lines each (all of them with `-v`), then the test files. |
| A file path | All rules, SCA skipped. | Each rule that fired in that file. |

An explain run writes no `.vulnetix/` files, uploads nothing and does not use the result cache. Repeat the same `--path`, `--depth`, `--exclude` and `--rule` flags as the run you are explaining; the NEXT block does this for you. A rule supplied by a `--rule` pack can only be explained with that pack loaded.

## Test code

Each finding's path is checked against the test naming conventions of every supported language (`*_test.go`, `test_*.py`, `*_test.py`, `*.test.ts`, `*.spec.js`, `*Test.java`, `*_spec.rb`, `*Tests.cs`, `tests/` directories and many more). A match is then corroborated by the repository:

- a test-runner config file on disk, up to 8 directories deep (`jest.config.js`, `pytest.ini`, `phpunit.xml`, `.rspec` and others);
- a test framework declared as a development dependency in a package manifest (`jest` in `devDependencies`, `pytest` in a dev requirements file, `rspec` in the `Gemfile`).

| `vulnetix/test-confidence` | Meaning |
|---|---|
| `confirmed` | A high or medium path match, corroborated by a config file or a declared dependency. |
| `high`, `medium`, `low` | The path match alone. |

Test-code findings are tagged in SARIF (`vulnetix/test-suite` and the other `vulnetix/test-*` properties, see [Output formats](/sast/reference/output-formats/#runs0results)), shown under IN TESTS, and marked as test code in the Resolve Platform. The config files found are uploaded with the snapshot by path, framework, size and SHA-256, without their contents.

> [!CAREFUL] `--suppress-test-code` drops every test-path match
> It removes every finding whose path matched a test convention, at any confidence, not only `confirmed` ones. A production file named like a test (`contest.py` is safe, `src/test_utils.py` is not) loses its findings. Check the `vulnetix/test-matched-pattern` of a few findings before turning it on.
