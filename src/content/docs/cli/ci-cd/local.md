---
title: Local runs and git hooks
nav: Local and pre-push
description: Run the same checks on a developer machine before pushing, as a git pre-push hook, with the output and gates CI uses.
order: 10
sources: [cli/cmd/scan.go, cli/internal/scanopts/surface.go, cli/cmd/report.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

A local run uses your own login (`vulnetix auth login --store keyring`) and the same flags as CI, so a breach shows up before the pipeline does.

```sh
vulnetix scan --fail-on high,kev,malware      # the gate CI applies
vulnetix scan -q                              # one line when there are findings, nothing when clean
vulnetix scan --only sca                      # dependencies only, fastest
vulnetix scan --dry-run                       # what would be scanned; no API calls
vulnetix report                               # look again without rescanning
```

## pre-push hook

`.git/hooks/pre-push` (make it executable with `chmod +x`):

```sh
#!/bin/sh
# Block a push when Vulnetix finds a high, critical, exploited or malicious dependency.
command -v vulnetix >/dev/null 2>&1 || { echo "vulnetix not installed; skipping"; exit 0; }
exec vulnetix scan --only sca,secrets --ignore-git --fail-on high,kev,malware -q --no-banner --no-progress
```

`git push --no-verify` skips it. To share the hook, commit it under `.githooks/` and run `git config core.hooksPath .githooks` once per clone.

## pre-commit framework

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: vulnetix
        name: vulnetix secrets
        entry: vulnetix secrets --ignore-git --fail-on medium -q --no-banner --no-progress
        language: system
        pass_filenames: false
        stages: [pre-commit]
```

## Keep results out of git

```sh
printf '.vulnetix/\n' >> .gitignore
```

## Uploading reports from your machine

Scans publish their own results when you are signed in. Reports from other tools go through [upload](/cli/commands/upload/):

```sh
vulnetix upload --file semgrep.sarif
```

`--ignore-git` skips the secrets pass over git history (up to 500 commits by default), which keeps a hook fast; CI should still run it.
