---
title: Related tools
description: "Two code reviewers that use the same Vulnetix scanners and VDB as the extension: Belai's `/vulnetix review` and the Pix `pr-security-reviewer` agent."
order: 6
sources: [belai/docs/vulnetix-review.md, belai/internal/profiles/builtin/vulnetix-review.json, pix-ai-coding-assistant/vulnetix/agents/pr-security-reviewer.md]
checked: [belai@ea3372a1, pix-ai-coding-assistant@de11107]
updated: 02 Nov 2026
status: available
---

The extension shows findings in the editor as you work. Two other Vulnetix tools review code with the same scanners and the same vulnerability database (VDB), but as an agent that reads the findings, checks them against the code and reports back. Neither needs the extension, and the extension does not start them.

| Tool | What it does | Docs |
|---|---|---|
| Belai `/vulnetix review` | Runs nine CLI scanners on the repository, checks each finding against the code, fixes the ones with one clear fix and writes a report | [Belai and Vulnetix](/software-factory/belai/vulnetix/) |
| Pix `pr-security-reviewer` | Reviews a pull request before merge and writes one review with an APPROVE or REQUEST_CHANGES verdict | [pr-security-reviewer](/pix/agents/pr-security-reviewer/) |

## Belai: `/vulnetix review`

Belai is a terminal coding agent. `/vulnetix review` (also `/vulnetix` and `/vulnetix run`) runs these Vulnetix CLI scanners in the working directory: `sca`, `containers`, `sast`, `secrets`, `iac`, `malscan`, `sbom`, `aibom` and `cbom`. Then it runs `vulnetix fix --dry-run`, or `vulnetix fix --yes` when `vulnetix.autofix` is on.

For each scanner with findings, a read-only agent (`belai:vulnetix-scanner`, limited to `Read`, `Grep` and `Glob`) reads the flagged code and its callers and decides whether each finding is real. The session then fixes the findings that have one clear fix, asks you about the ones that have several, and writes `.vulnetix/belai/code-review-report.md` with three sections:

| Section | Contents |
|---|---|
| Remediated | What was fixed |
| Needs direction | Each finding with more than one reasonable fix that is still undecided, with its options |
| Inconclusive | Each finding that further exploration could not decide, with the reason |

Cost:

- The scanners are free on the [Community plan](https://www.vulnetix.com/features/community).
- Your own model provider bills the agents' and the session's turns.
- On Pro, the fix plan also names Safe Harbour target versions. On Community it chooses from the fixed versions the scan reports.

## Pix: `pr-security-reviewer`

Pix brings Vulnetix to coding agents such as Claude Code. Its `pr-security-reviewer` agent reviews a pull request before it merges: it runs the scanners that apply to the changed files, checks each newly added direct dependency, and writes one review with an APPROVE or REQUEST_CHANGES verdict, which it can post with `gh pr review` once you confirm.

## Using them alongside the extension

- Both reviewers write their scan output and reports under the project's `.vulnetix/` directory, the same directory the language server reads `.vulnetix/memory.yaml` from. A suppression recorded there applies in the editor too; see [Suppressions](/vscode/findings/suppressions/).
- Both run the Vulnetix CLI with the CLI's own credential (`vulnetix auth login`), which is also what the language server uses. Their VDB lookups count against that key's daily limit.
