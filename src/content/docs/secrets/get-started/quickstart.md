---
title: Quickstart
description: Scan a repository for hard-coded credentials, read the result, and fail a CI job when one is found.
order: 2
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/internal/scanopts/surface.go, cli/internal/scanopts/failon.go, cli/cmd/exit_codes.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

You need the Vulnetix CLI on your `PATH` ([installing the CLI](/cli/get-started/install/)). No sign-in is needed: without credentials the scan runs and reports locally.

## 1. Scan

Run it from the repository root:

```bash
vulnetix secrets
```

The scan reads the working tree to three directory levels and the last 500 commits. For a deep tree, raise the depth:

```bash
vulnetix secrets --depth 10
```

## 2. Read the result

The terminal report groups findings by credential: one row per distinct value, however many files hold it.

```text
 ✖ SECRETS 2 credentials in 3 places          1 to rotate · 1 not committed
   1092 rules ran · one value in several files counts once · values are never printed

 ROTATE NOW · 1 credential · committed to production code
 ──────────────────────────────────────────────────────────────────────────────
 ● CRITICAL  AWS access key ID       VNX-SEC-001  deploy/prod.tfvars:14
             committed in a1b2c3d, 41 days ago   also in .env.example:3
```

Ask for the rotation steps and every place the credential appears:

```bash
vulnetix secrets --explain VNX-SEC-001
```

[Reading the report](/secrets/guides/reading-the-report/) explains each group.

## 3. Fail the build

`--fail-on` takes a severity. The run exits `1` when any secrets finding is at or above it:

```bash
vulnetix secrets --fail-on high
```

In a pipeline, keep the SARIF file for your code-scanning dashboard and print nothing when the scan is clean:

```bash
vulnetix secrets --depth 10 --fail-on high -q -o secrets.sarif
```

A GitHub Actions job:

```yaml
jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # the history pass needs the commits
      - name: Install the Vulnetix CLI
        run: curl -fsSL https://cli.vulnetix.com/install.sh | sh
      - name: Scan for secrets
        run: vulnetix secrets --depth 10 --fail-on high -o secrets.sarif
```

> [!CAREFUL] Shallow clones hide history
> `actions/checkout` fetches one commit by default, so the history pass sees only that commit. Set `fetch-depth: 0`, or a depth at least as large as `--git-history-max-commits`.

## 4. Deal with a false positive

Mark the line in the source with a `nosec` comment naming the rule:

```python
EXAMPLE_KEY = "AKIAIOSFODNN7EXAMPL3"  # nosec VNX-SEC-001
```

or record a rule that the whole organisation shares:

```bash
vulnetix ignore add --category secrets --rule VNX-SEC-001 --file docs/example.env \
  --type false_positive --reason "documented example key"
```

[Suppressing findings](/secrets/guides/suppression/) covers both.

## Next

- [Flags](/secrets/reference/flags/) for every option.
- [Output and exit codes](/secrets/reference/output/) for the files written and what is uploaded.
