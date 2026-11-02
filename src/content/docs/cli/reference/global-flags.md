---
title: Global flags
description: The flags every vulnetix command accepts, and the environment conditions that change the same behaviour.
order: 1
sources: [cli/cmd/root.go, cli/cmd/banner.go, cli/internal/analytics/ga4.go, cli/internal/display/context.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

Persistent flags, accepted by every command and subcommand.

| Flag | Default | Effect |
|---|---|---|
| `--org-id <uuid>` | | Organisation for commands that act on one (`upload`, `gha upload`, `--bom-manufacturer` fallback). Credentials still come from the normal sources. |
| `--silent` | off | Suppress log output; print only the final result. Also suppresses the banner. |
| `-v`, `--verbose` | off | Counted. `-v` adds diagnostics (rate limits, cache status, auth notes, retry and backoff messages, org policy overrides) and per-advisory version checks; `-vv` adds the raw evidence. |
| `--no-progress` | off | No progress bars or spinners |
| `--no-banner` | off | No startup banner |
| `--no-analytics` | off | No anonymous usage analytics for this run (sets `VULNETIX_NO_ANALYTICS=1`) |
| `--artifact-manifest <file>` | | Record every file the command writes in this JSON Lines [artifact manifest](/cli/reference/artifact-manifest/). Also `VULNETIX_ARTIFACT_MANIFEST`. |
| `--disable-memory` | off | Do not read or write `.vulnetix/memory.yaml`. VDB commands skip their memory side effects. |
| `--version` | | Print the bare version and exit |
| `-h`, `--help` | | Help for the command |

## Banner

The banner (version, build, auth state, API and Package Firewall status) goes to stderr, so it never mixes with `-o json-cyclonedx` or other stdout output. It is not printed when any of these hold: `--no-banner`, `--silent`, `CI=true`, `DO_NOT_TRACK=1`, or the command is answering an agent hook.

## Analytics

The CLI sends anonymous usage events (the command name and path, the auth method on login) with a client ID hashed from hostname, OS and architecture. They are off when:

| Condition | |
|---|---|
| `--no-analytics` | This run |
| `VULNETIX_NO_ANALYTICS` set to any value | Every run |
| `DO_NOT_TRACK=1` | Every run |
| `CI=true` and not GitHub Actions | Automatically. Under GitHub Actions they stay on unless turned off. |

## Output streams

Results go to stdout; logs, progress, warnings, the banner, update notices and errors go to stderr. `Error: <message>` is printed once on stderr before a non-zero exit, except where a command has already rendered its own verdict (gate breaches and jail verdicts). See [Exit codes](/cli/reference/exit-codes/).
