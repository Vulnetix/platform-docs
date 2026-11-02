---
title: Change guard
description: Checks only what a git commit or git push is about to record for credentials, with the same rules as vulnetix secrets, and blocks by default.
order: 3
sources: [cli/internal/agent/changeguard.go, cli/internal/agent/run.go, cli/internal/agent/policy.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

The change guard runs on `PreToolUse` when a shell command contains `git commit` or `git push`. It reads exactly what that command would record and runs the secret rules [`vulnetix secrets`](/secrets/) uses, locally. Nothing it reads leaves the machine.

## What it reads

| Command | Files read |
|---|---|
| `git commit` | The staged blobs: `git diff --cached --name-only --diff-filter=ACMR` |
| `git commit -a` (or `--all`) | The staged blobs, plus the working tree of tracked files with unstaged changes |
| `git push`, with an upstream | The files changed in `@{upstream}..HEAD`, at `HEAD` |
| `git push`, no upstream (first push) | Every file in the `HEAD` tree |
| `git -C <dir> ...` | The same, run in `<dir>` |

Only added, copied, modified and renamed files are read, so a finding that was already in the repository is not reported again on every commit.

## Decisions

The change guard acts on one signal, `secret`. With the default policy (`changeGuard.block: [secret]`) a credential in the change denies the command, and the reason names each finding. Set `secret` under `changeGuard.warn` to report without blocking, or leave it out of both lists to turn the change guard off. See [Policy file](/pix/hooks/policy-file/).

## Limits

| Limit | Value | When it bites |
|---|---|---|
| Time budget | 8 seconds | No verdict, the command proceeds |
| Files read | 400 | The guard says it read part of the change, and that the rest was not checked |
| Bytes read | 8 MB | Same |

> [!CAREFUL] A capped read is not a clean result
> When a cap stops it, the guard does not say "no secrets found". It reports how many files it read and that the rest was unchecked. A first push of a whole repository is the common case. Run `vulnetix secrets` over the repository before the first push.

## Related

- [`secret-scan`](/pix/skills/scanners/#secret-scan): the same rules on demand, staged files only or the whole repository.
- [Secrets scanning](/secrets/) for the rules and CI use.
