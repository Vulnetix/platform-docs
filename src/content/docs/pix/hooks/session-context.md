---
title: Session context
description: Tells the agent what the repository's last recorded scan found when a session starts, and answers from that record when a prompt names a CVE or GHSA.
order: 4
sources: [cli/internal/agent/sessioncontext.go, cli/internal/memory/memory.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`session-context` answers `SessionStart` and `UserPromptSubmit`. It reads `.vulnetix/memory.yaml` under the repository root and never scans: it runs before the agent's turn, while a person waits at the prompt. It always informs and never blocks.

## On session start

The agent receives one summary of the last scan on record, shaped like this:

```
Vulnetix: last scan of this repository (2026-10-30T09:12:44Z, main) found 7 vulnerabilities across 312 packages, 1 critical, 2 high, 4 medium.
Malicious package: event-stream
Known exploited: CVE-2021-44228

This is the recorded snapshot, not a scan run just now.
```

| Line | From `memory.yaml` |
|---|---|
| Time, branch, counts and severity split | `last_scan` (`timestamp`, `git_branch`, `vulns`, `packages`, `critical`, `high`, `medium`, `low`; zero counts are left out) |
| `Malicious package(s)` | Findings with `is_malicious: true`, one per package, at most 5 named |
| `Known exploited` | Other findings with `in_cisa_kev: true`, at most 5 named |

With no scan on record it says so in one line, "Vulnetix: no scan on record for this repository", and that `vulnetix scan` writes one.

## When a prompt names an advisory

A prompt is matched for `CVE-YYYY-NNNN...` and `GHSA-xxxx-xxxx-xxxx` identifiers, case-insensitive, at most 5 per prompt. A prompt with none costs one regular expression and returns nothing. Each identifier is looked up in the recorded findings by key, then by alias:

```
Vulnetix, from this repository's last scan:
  CVE-2021-44228  <the recorded finding>
  CVE-2024-3094  not in this repository's last scan

From the recorded snapshot. `vulnetix scan` refreshes it.
```

"Not in this repository's last scan" is said out loud because silence would read as "not affected", which is a stronger claim than the record supports. With no scan on record, a prompt gets no answer.

Other identifier schemes (OSV, RUSTSEC, PYSEC, vendor ids) are not matched. Ask the agent to use [`repo-impact`](/pix/skills/vulnerabilities/#repo-impact) for those.

## Keeping it current

The record is whatever the last `vulnetix scan` wrote. Run a scan after a dependency change, or let CI run one. See [Repository files](/pix/reference/repository-files/#memoryyaml) for the fields.
