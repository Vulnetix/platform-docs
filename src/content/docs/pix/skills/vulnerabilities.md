---
title: Vulnerability skills
description: The repo-impact, fix, verify-fix and dashboard skills, which check whether an advisory reaches a repository, apply a fix, prove it landed and show decisions.
order: 3
sources: [pix-ai-coding-assistant/skills/repo-impact/SKILL.md, pix-ai-coding-assistant/skills/fix/SKILL.md, pix-ai-coding-assistant/skills/fix/references/workflow.md, pix-ai-coding-assistant/skills/fix/references/memory-yaml-schema.md, pix-ai-coding-assistant/skills/verify-fix/SKILL.md, pix-ai-coding-assistant/skills/dashboard/SKILL.md, cli/cmd/scan.go]
checked: [pix-ai-coding-assistant@7aebf02, cli@4c8c3b7]
updated: 02 Nov 2026
---

The usual sequence is `repo-impact`, then `fix`, then `verify-fix`, then [`vex-publish`](/pix/skills/attestations/#vex-publish). `dashboard` shows where a repository stands at any point.

## repo-impact

Whether one advisory reaches anything in this repository.

| | |
|---|---|
| Arguments | `<CVE-...\|GHSA-...>` |
| Runs | A dependency scan of the tree, `vulnetix vdb vuln <id>` (or `vulnetix_vuln` with `detail: summary` over MCP), a reachability scan |
| Answer | `AFFECTED`, `NOT AFFECTED` or `CANNOT DETERMINE`, with package, installed version, affected range and fixed version |

It answers four questions in order, and each can end the enquiry:

1. Is the package here at all, directly or transitively?
2. Is the installed version in the affected range? `>=2.0.0 <2.17.1` does not include `2.17.1`.
3. Is there a fixed version, and how far away is it?
4. Is the vulnerable code reachable from this repository?

It says which questions it could not answer. "Reachability unknown" is never reported as "unreachable". If `.vulnetix/memory.yaml` already has a current scan it reuses it and says it is a snapshot.

## fix

A concrete remediation for one triaged finding, applied with a rollback path.

| | |
|---|---|
| Arguments | `<vuln-id>` |
| Runs | `vulnetix vdb fixes`, `vulnetix vdb vuln`, `vulnetix vdb exploits`, `vulnetix vdb traffic-filters` when no fix exists, the package manager's dry run, `vulnetix scan` |
| Grants | `Edit` |
| Writes | Manifest and lockfile edits; `<file>.vulnetix-backup` copies first; the finding's entry in `.vulnetix/memory.yaml` |

Fix types, best first:

| Type | What | When |
|---|---|---|
| A0 | Inline the needed code as first-party code and drop the dependency | The package is small or only a small part is used |
| A | Version bump | The usual fix |
| B | Patch from a distro, registry or upstream commit | No release carries the fix |
| C | Workaround | Temporary mitigation, such as a traffic filter |
| D | Advisory guidance | Nothing to apply yet |

Every proposal reports the current version and how it was found (user-supplied, manifest, lockfile, installed, context or unknown), the target version and its source, and a **Safe Harbour confidence** from 0.00 to 1.00: above 0.90 is a patch bump on an official release, 0.35 to 0.90 a minor bump or backported patch, below 0.35 a major bump or unreleased fix. It never "fixes" by downgrading. If the dry run fails, it restores the backups and reports the conflict; pass it to `dep-resolve`.

## verify-fix

Whether a fix landed, as PASS or FAIL.

| | |
|---|---|
| Arguments | `<vuln-id>` |
| Runs | `vulnetix scan --evaluate-sca --severity high --exploits weaponized -o json`, then `vulnetix vdb fixes` and `vulnetix vdb vuln` for the advisory |
| Grants | `Bash(git:*)` |
| Writes | On PASS, `status: fixed`, `decision.choice: fix-applied` and `event: fix-verified`. On FAIL, `status: affected` and `event: fix-verification-failed` with the reason. |

The verdict lists the pre-fix and post-fix versions, the affected range, whether the new version is still inside it, the scan gate result, and up to 5 regressions. It writes memory once at the end, so do not run two at once in one session.

## dashboard

What this repository already decided, read from the record rather than by scanning.

| | |
|---|---|
| Arguments | none |
| Reads | `.vulnetix/memory.yaml` |
| Output | Open (vulnerable, investigating) and resolved (fixed, not affected, risk accepted, deferred) counts, an open table sorted by CWSS priority then severity, a resolved table, and suggested next steps |

Use it when picking triage back up, before a release, or when joining a repository with a security history. It reads only the current repository.

## Decision values

`fix`, `verify-fix`, `bulk-triage` and `vex-publish` record your choice in `decision.choice`, one of nine values:

| `decision.choice` | VEX status | Meaning |
|---|---|---|
| `investigating` | `under_investigation` | The default for a new finding |
| `fix-applied` | `fixed` | The fix was applied |
| `inlined` | `fixed` | The dependency was replaced with first-party code |
| `not-affected` | `not_affected` | Does not affect this project |
| `risk-avoided` | `not_affected` (`component_not_present`) | The dependency was removed or the feature disabled |
| `mitigated` | `not_affected` (`inline_mitigations_already_exist`) | A workaround is in place |
| `risk-transferred` | `not_affected` (`vulnerable_code_cannot_be_controlled_by_adversary`) | A WAF or the platform handles it |
| `deferred` | `affected` (`will_fix`) | Will fix later |
| `risk-accepted` | `affected` (`will_not_fix`) | Accepted |

> [!CAREFUL] Known defects in these skills at pix-ai-coding-assistant@7aebf02
> `repo-impact` runs `vulnetix scan --sca`, a flag the current CLI does not have (use `vulnetix sca`, or `vulnetix scan --only sca`), and `vulnetix scan --reachability -o json`, where `--reachability` takes a mode (`direct`, `transitive`, `both`, `off`). `dashboard` and `fix` read and write `vulnerabilities:` and `manifests:` sections that the CLI does not keep when it next saves `memory.yaml`; see [Repository files](/pix/reference/repository-files/#memoryyaml). `verify-fix` suggests a `safe-harbor-resolver` agent that does not exist.
