---
title: "Quickstart: first SAST scan and a CI gate"
nav: Quickstart
description: Run vulnetix sast on a project, read one finding, fail a build on high severity, and upload SARIF to GitHub code scanning.
order: 2
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/internal/scanopts/surface.go, cli/cmd/exit_codes.go, cli/internal/sast/input.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

You need the Vulnetix CLI on your `PATH` (see [/cli/](/cli/) for install). No account is needed: without credentials the scan runs fully and uploads nothing of yours.

## 1. Scan a directory

```bash
cd your-project
vulnetix sast --depth 10
```

`--depth 10` matters for any tree deeper than two directories; the default of 3 silently skips `a/b/c/file.py`. The first run compiles the rules for the languages it finds, which takes from a few seconds to a few minutes on a laptop. Later runs reuse the [result cache](/sast/reference/flags/#cache-and-performance) for files that have not changed.

A run on a small Flask app prints, in a pipe or CI:

```text
vulnetix sast: FINDINGS  3 sast findings in 1 file, 2 need action, 1 can wait

  HIGH      app/main.py:5  VNX-PY-003  pickle.loads() unpickles data, which can execute arbitrary code; use json or another data-only format for anything that crosses a trust boundary
  HIGH      app/main.py:8  VNX-PY-007  call() runs a command line built from non-constant text through the shell; pass an argument list with shell=False, or shlex.quote() every interpolated value
  LOW       app/main.py:8  VNX-1100  Process launched through a hard-coded OS-specific shell with no platform check in this file; isolate the call behind a platform check or adapter, or run the program directly without a shell
  [OK] Memory:   ./.vulnetix/memory.yaml
  [OK] SARIF:    ./.vulnetix/sast.sarif
```

In a terminal the same findings are grouped by rule (see [Reading the results](/sast/guides/reading-results/)).

## 2. Look at one rule

```bash
vulnetix sast --depth 10 --explain VNX-PY-003
```

`--explain` runs only that rule and prints its description, CWE and every place it fired. It writes and uploads nothing. Each rule also has a page: [VNX-PY-003](/sast/rules/vnx-py-003/).

## 3. Fail the build

A scan exits 0 when it finds things, unless you ask it to fail:

```bash
vulnetix sast --depth 10 --fail-on high
echo $?   # 1 when any finding is high or critical
```

| Exit | Meaning |
|---|---|
| `0` | Scan finished; no gate breached. |
| `1` | A gate breached, or the scan failed. |
| `2` | Bad arguments or configuration, before any work. |
| `3` | `--jail` could not reach a verdict. |

When you are signed in to an organisation with a quality gate, its severity threshold replaces `--fail-on`'s severity. See [Flags](/sast/reference/flags/#when-to-fail).

## 4. Silence a false positive

Add a `nosec` comment naming the rule on the reported line:

```python
data = pickle.loads(blob)  # nosec vnx-py-003
```

See [Suppressing findings](/sast/guides/suppressing-findings/) for ignore rules and test code.

## 5. Upload SARIF to GitHub code scanning

```yaml
# .github/workflows/sast.yml
name: SAST
on: [push, pull_request]
permissions:
  contents: read
  security-events: write
jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Vulnetix CLI
        run: curl -fsSL https://cli.vulnetix.com/install.sh | sh
      - name: SAST
        run: vulnetix sast --depth 10 --no-progress -o vulnetix-sast.sarif --fail-on high
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: vulnetix-sast.sarif
```

Write SARIF with `-o <file>.sarif` in CI rather than relying on `.vulnetix/sast.sarif`, which is deleted on a clean run. `-o` writes the file on every run, so the upload step always has something to send.

## Next

- [Flags](/sast/reference/flags/) for paths, excludes, rule packs and gates.
- [Custom rules](/sast/guides/custom-rules/) to add your own checks.
- [Rules index](/sast/rules/) to see what runs.
