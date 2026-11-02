---
title: Subagents
nav: Overview
description: The five Claude Code subagents in the Pix plugin, bulk-triage, dep-upgrade-orchestrator, pr-security-reviewer, compliance-bundler and incident-responder, with their inputs, stages, outputs and limits.
order: 1
sources: [pix-ai-coding-assistant/vulnetix/agents/bulk-triage.md, pix-ai-coding-assistant/vulnetix/agents/dep-upgrade-orchestrator.md, pix-ai-coding-assistant/vulnetix/agents/pr-security-reviewer.md, pix-ai-coding-assistant/vulnetix/agents/compliance-bundler.md, pix-ai-coding-assistant/vulnetix/agents/incident-responder.md]
checked: [pix-ai-coding-assistant@7aebf02]
updated: 02 Nov 2026
---

A subagent runs a multi-step job in its own context, so a 40-CVE backlog does not fill your main conversation. They ship only in the Claude Code plugin (`/plugin install vulnetix@vulnetix-plugins`); `npx skills` and `gh` installs copy skills only.

Claude Code picks a subagent from its description, or you name it: *use the bulk-triage agent on the open findings*.

| Agent | Does | Model, effort, turns | Writes |
|---|---|---|---|
| [`bulk-triage`](#bulk-triage) | Scores many vulnerabilities and groups them P1 to P4 | `sonnet`, medium, 15 | `.vulnetix/memory.yaml`, once |
| [`dep-upgrade-orchestrator`](#dep-upgrade-orchestrator) | Upgrades every vulnerable dependency, manifest by manifest, verifying each | `sonnet`, high, 25 | `.vulnetix/upgrade/`, manifests |
| [`pr-security-reviewer`](/pix/agents/pr-security-reviewer/) | Runs the scanners that apply to a pull request and writes one review | `sonnet`, medium, 18 | `.vulnetix/review/` |
| [`compliance-bundler`](#compliance-bundler) | Builds an audit bundle: SBOM, licences, SARIF, VEX, checksums | `sonnet`, medium, 12 | `.vulnetix/compliance/<timestamp>/` |
| [`incident-responder`](#incident-responder) | Runs the playbook for an actively exploited CVE | `sonnet`, high, 20 | `.vulnetix/detection/`, `.vulnetix/iocs/`, `.vulnetix/vex/` |

Each definition also carries `triggers`, `chain`, `outputBudget` and `cooldown` keys. Nothing reads them today: they do not start an agent or run anything after it. Some `chain` entries (`soc-triage`, `compliance-report`, `code-review-security`) name skills that do not exist.

All five work on every plan, including Community. Their VDB lookups count against your daily API limit, and their turns are model usage billed by whoever bills your Claude Code usage.

## bulk-triage

| | |
|---|---|
| Input | A list of CVE ids, or every `under_investigation` or `affected` finding in `.vulnetix/memory.yaml` with no CWSS score yet |
| Runs | `vulnetix vdb vuln` and `vulnetix vdb exploits` per id with `--disable-memory`; manifest search for repository impact; Snort rule availability; Dependabot alert state with `gh` |
| Tools | `Bash`, `Read`, `Glob`, `Grep`, `Edit`, `Write`, `WebFetch` |

Each vulnerability is analysed independently. The priority uses the VDB's CWSS score (0 to 10) when the response has one, otherwise a weighted score:

| Factor | Weight | Raw score, 0 to 10 |
|---|---|---|
| Technical impact | 25% | RCE 10, privilege escalation 9, data exfiltration 8.5, tampering 7, DoS 4 |
| Exploitability | 25% | EPSS x 10, +2 Metasploit, +1.5 verified PoC, +1.5 CISA KEV, capped at 10 |
| Exposure | 15% | Network and public 10, network and internal 7, adjacent 5, local 3 |
| Complexity | 15% | 10 for low complexity, no auth, no interaction; less for each |
| Repository relevance | 20% | Direct and reachable 10, direct and unknown 7, transitive 4, not found 0 |

| Tier | Score | Means |
|---|---|---|
| P1 | 9.0 and above | Act now |
| P2 | 7.0 to 8.9 | Plan this sprint |
| P3 | 5.0 to 6.9 | Schedule it |
| P4 | below 5.0 | Track it |

The score and factor breakdown go to each finding's `cwss` block in one consolidated write at the end, with a `bulk-triage` history entry.

## dep-upgrade-orchestrator

| Stage | Does |
|---|---|
| 1 | `vulnetix agent capabilities --force`; asks for the package manager if none is detected |
| 2 | `vulnetix scan --evaluate-sca -o json --disable-memory > .vulnetix/upgrade/inventory.json` |
| 3 | Plans each fix: a patch bump goes ahead, a minor bump asks first, a major bump needs your confirmation and a `dependency-choice` recommendation. Groups by manifest. |
| 4 | Per item: `fix`, apply, `<package manager> install`, `dep-resolve` and retry on a conflict, `verify-fix`. A failure is logged and the run continues. |
| 5 | `vulnetix scan --evaluate-sca --severity high --exploits weaponized -o json` |
| 6 | Report of what was upgraded, skipped and failed |

## compliance-bundler

Writes to `.vulnetix/compliance/<YYYYMMDDTHHMMSSZ>/`; every run is a new directory.

| File | From |
|---|---|
| `sbom.cdx.json` | `vulnetix scan -o json-cyclonedx` |
| `licenses.spdx.json` | `vulnetix license -o json-spdx` |
| `findings.sarif` | `vulnetix scan --evaluate-sast --evaluate-secrets --evaluate-sca -o json-sarif` |
| `vex.cdx.json` | `vulnetix triage --provider vulnetix --vex-format cyclonedx -o json` |
| `*.sig.bundle` | `cosign sign-blob --yes`, when you ask to sign and `cosign` is installed |
| `manifest.json` | SHA-256 of every file |
| `README.md` | A Markdown index |

With your agreement it uploads the SBOM and VEX with `vulnetix upload --file`.

## incident-responder

| Stage | Does |
|---|---|
| 1 | Loads capabilities and memory; pulls `vulnetix vdb sightings`, `kev get`, `iocs`, `attack-techniques`, `fixes` and `remediation plan` for the CVE |
| 2 | **Active** if KEV-listed, sighted within 30 days, or EPSS above 0.5. Otherwise dormant: it recommends `fix` and stops. |
| 3 | IOCs and ATT&CK summary; a STIX bundle at `.vulnetix/iocs/<VULN_ID>.stix.json` when `derived.soar` is `stix` |
| 4 | Snort, YARA and Nuclei content to `.vulnetix/detection/<VULN_ID>/`, for the engines installed |
| 5 | Patch path with `verify-fix`; workarounds from `vulnetix vdb workarounds` |
| 6 | OpenVEX to `.vulnetix/vex/<VULN_ID>.<timestamp>.vex.json` |
| 7 | Report |

It deploys nothing: rule files are written for you to load into your engines.
