---
title: Scanner skills
description: sast-scan, secret-scan, iac-scan and container-scan run one Vulnetix scanner each and compose with Semgrep, Trivy, Grype and Syft when installed; secure-code-write coaches before the code is written.
order: 4
sources: [pix-ai-coding-assistant/skills/sast-scan/SKILL.md, pix-ai-coding-assistant/skills/secret-scan/SKILL.md, pix-ai-coding-assistant/skills/iac-scan/SKILL.md, pix-ai-coding-assistant/skills/container-scan/SKILL.md, pix-ai-coding-assistant/skills/secure-code-write/SKILL.md, cli/cmd/scan.go, cli/cmd/specialized_scans.go]
checked: [pix-ai-coding-assistant@7aebf02, cli@4c8c3b7]
updated: 02 Nov 2026
---

Each scanner skill wraps one CLI scanner, scopes it to what changed, renders a severity table, and records counts under `.vulnetix/`. The rules and flags of the scanners themselves are documented in their segments: [SAST](/sast/), [Secrets](/secrets/), [IaC](/iac-scanning/), [Containers](/sca/).

| Skill | CLI scanner | Optional local tools | Output file |
|---|---|---|---|
| `sast-scan` | `vulnetix sast -o json-sarif` | `semgrep`, when `.semgrep.yml` (or `.semgrep.yaml`, `semgrep.yml`, `semgrep.yaml`) exists | `.vulnetix/sast.<timestamp>.sarif`; `.vulnetix/sast/<branch>.summary.yaml` |
| `secret-scan` | `vulnetix secrets -o json` | none | `.vulnetix/secrets.<timestamp>.json`; `.vulnetix/secrets/<timestamp>.summary.yaml` |
| `iac-scan` | `vulnetix iac -o json` | `terraform` or `tofu`, only to suggest `terraform plan` | `.vulnetix/iac.<timestamp>.json`; `.vulnetix/iac/<timestamp>.summary.yaml` |
| `container-scan` | `vulnetix containers -o json` | `trivy`, `grype`, `syft`, and `docker` or `podman` for `--image` | `.vulnetix/containers.<timestamp>.json`; `.vulnetix/containers/` |

## sast-scan

| | |
|---|---|
| Arguments | `[--rule-id ID] [--paths file1 file2] [--baseline]` |
| Default scope | Files changed since `git merge-base origin/main HEAD`; the whole repository outside git |
| `--rule-id` | Passed through, for example `VNX-XXE-001` |
| `--baseline` | Also records the rule set with `vulnetix scan --evaluate-sast --list-default-rules -o json` |

With Semgrep and a Semgrep config present, it runs `semgrep --config .semgrep --json --quiet` and merges the findings into the SARIF, de-duplicated by file, line and rule. Repeated violations of one rule get a pointer to `secure-code-write`.

## secret-scan

| | |
|---|---|
| Arguments | `[--paths file1 file2] [--staged-only]` |
| Default scope | Files changed against the main branch, else the whole repository |
| `--staged-only` | `git diff --cached --name-only`; needs `git` |

Each finding is shown with 60% of the value replaced by `*`; the full secret is never printed and the summary file holds counts and paths, no values. It lists rotation steps per credential type and never rotates anything itself. For a secret already committed it recommends rotating, and `git filter-repo` or BFG to clean history. The [change guard](/pix/hooks/change-guard/) runs the same rules automatically on `git commit` and `git push`.

## iac-scan

| | |
|---|---|
| Arguments | `[--paths file1 file2]` |
| Requires | `derived.has_iac: true` in `capabilities.yaml` (a `*.tf` or `*.tofu` file), or `--paths` |

Reports open security groups, missing encryption, public buckets, IAM wildcards, unpinned providers, plaintext secrets, missing tags and unencrypted state backends, grouped by file, with a short code fix for each high-severity issue. It never runs `terraform apply`.

## container-scan

| | |
|---|---|
| Arguments | `[--paths Dockerfile1 Dockerfile2] [--image registry/img:tag]` |
| Reads | `Dockerfile`, `Containerfile`, `compose.yml`, `docker-compose.yml` |

Reports base-image risk, end-of-life bases, secrets in layers, a missing `USER`, root processes, missing healthchecks and vulnerable system packages. When installed: `trivy config` on the Dockerfile and `trivy image` on `--image`; `grype <image>`; `syft <image> -o cyclonedx-json` for a container SBOM. Findings are merged and de-duplicated by CVE and package. The CLI does not pull images, so `--image` needs Docker or Podman.

## secure-code-write

A coach for code you are about to write, grounded in the SAST rules that would fail it.

| | |
|---|---|
| Arguments | `[<file-path>]` or a topic: `auth`, `crypto`, `sql`, `xss`, `deser` (also `file`, `template`) |
| Runs | `vulnetix scan --list-default-rules -o json`, filtered by topic tag; `vulnetix vdb cwe list --keyword <topic> -V v2 -o json` |
| Writes | Nothing |

It lists the top rules to honour with their CWE, common pitfalls, and passing and failing snippets in the repository's language, then offers `sast-scan --paths <file>` once you have written the code.

> [!CAREFUL] `--paths` does not narrow the CLI scan today
> The four scanner skills pass their file list to the CLI as `--paths <files>`. In the current CLI, `--paths` on `sast`, `secrets`, `iac` and `containers` is a hidden, deprecated boolean alias for `--show-introduced-paths`, not a list of files, so the scan covers the project and can report findings in files you did not change.
