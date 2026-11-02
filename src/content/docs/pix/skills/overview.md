---
title: Skills
nav: Overview
description: The 18 Pix skills, their arguments, the tools each is allowed to run, what usually follows each one, and the rules every skill shares.
order: 1
sources: [pix-ai-coding-assistant/skills/*/SKILL.md, pix-ai-coding-assistant/skills/_lib/contract.md, pix-ai-coding-assistant/justfile]
checked: [pix-ai-coding-assistant@7aebf02]
updated: 02 Nov 2026
---

A skill is a procedure the agent follows in your repository. Each one is an Agent Skills `SKILL.md` under [`skills/`](https://github.com/Vulnetix/pix-ai-coding-assistant/tree/main/skills), installed by [`vulnetix skills install`](/pix/get-started/install/#3-install-the-skills).

A skill earns its place only if it needs **the repository**, needs **you**, or needs **a sequence** a model would not compose correctly alone. Fetching one record is none of those, so lookups are MCP tools and `vulnetix vdb` subcommands, not skills.

## Invoking a skill

The agent picks a skill from its description, or you name it. In Claude Code with the plugin, skills are namespaced:

```
/vulnetix:repo-impact CVE-2021-44228
/vulnetix:fix CVE-2024-29041
```

Installed through `npx skills` or `gh`, the skill is `/repo-impact` (or however your agent lists skills). Every skill is `user-invocable: true`.

## All skills

| Skill | The question | Arguments | Usually followed by |
|---|---|---|---|
| [`dependency-choice`](/pix/skills/dependencies/#dependency-choice) | I need capability X: which package, and what am I trading? | `<capability or package name> [--ecosystem npm\|pypi\|...]` | `typosquat-check`, `fix` |
| [`typosquat-check`](/pix/skills/dependencies/#typosquat-check) | Is this name impersonating something, or known-malicious? | `[<package-name>] \| [--installed]` | `dependency-choice` |
| [`dep-resolve`](/pix/skills/dependencies/#dep-resolve) | The bump is blocked by peer dependencies: find a compatible set | `<package-name> [--target-version X]` | `dependency-choice`, `fix`, `verify-fix` |
| [`eol-check`](/pix/skills/dependencies/#eol-check) | What here is past end of life, or will be within 90 days? | `[--strict]` | `dep-resolve`, `fix` |
| [`license-check`](/pix/skills/dependencies/#license-check) | Does anything here conflict with our licence policy? | `[--policy permissive\|copyleft-aware\|strict]` | |
| [`repo-impact`](/pix/skills/vulnerabilities/#repo-impact) | Does this CVE reach anything in this repository? | `<CVE-...\|GHSA-...>` | `fix`, `dependency-choice` |
| [`fix`](/pix/skills/vulnerabilities/#fix) | Apply a fix for this finding, here, safely | `<vuln-id>` | `verify-fix`, `vex-publish` |
| [`verify-fix`](/pix/skills/vulnerabilities/#verify-fix) | Did the fix land? | `<vuln-id>` | `vex-publish` |
| [`dashboard`](/pix/skills/vulnerabilities/#dashboard) | What have we already decided here? | none | `repo-impact` |
| [`sast-scan`](/pix/skills/scanners/#sast-scan) | Code-level vulnerabilities in changed files | `[--rule-id ID] [--paths file1 file2] [--baseline]` | `secure-code-write`, `verify-fix` |
| [`secret-scan`](/pix/skills/scanners/#secret-scan) | Hardcoded credentials | `[--paths file1 file2] [--staged-only]` | `verify-fix` |
| [`iac-scan`](/pix/skills/scanners/#iac-scan) | Terraform, OpenTofu, Nix and Kubernetes misconfigurations | `[--paths file1 file2]` | `verify-fix` |
| [`container-scan`](/pix/skills/scanners/#container-scan) | Dockerfile, Containerfile and compose risks; image CVEs with Trivy or Grype | `[--paths Dockerfile1 Dockerfile2] [--image registry/img:tag]` | `verify-fix` |
| [`secure-code-write`](/pix/skills/scanners/#secure-code-write) | I am about to write auth, crypto or SQL: what should I know? | `[<file-path>] \| [<topic: auth\|crypto\|sql\|xss\|deser>]` | `sast-scan` |
| [`detection-rules`](/pix/skills/defence/#detection-rules) | I cannot patch this: what do I deploy instead? | `<vuln-id>` | `exploit-test`, `verify-fix` |
| [`exploit-test`](/pix/skills/defence/#exploit-test) | Prove this is or is not exploitable against my authorised target | `<vuln-id> [--target URL]` | `verify-fix` |
| [`sbom-generate`](/pix/skills/attestations/#sbom-generate) | Produce the SBOM a customer or auditor asked for | `[--format cyclonedx\|spdx\|both] [--sign] [--output PATH]` | `vex-publish` |
| [`vex-publish`](/pix/skills/attestations/#vex-publish) | Publish our triage decisions as VEX | `[--format openvex\|cyclonedx] [--upload]` | |

"Usually followed by" is the skill's `metadata.chain`. It is advice to the agent: nothing runs the next skill automatically.

## Tool grants

Each skill's `allowed-tools` lists only the commands its body runs. No skill is granted bare `Bash`, and no read-only skill is granted `Write` or `Edit`.

| Grant | Skills |
|---|---|
| `Bash(vulnetix:*) Read Grep Glob` only | `dashboard`, `dependency-choice`, `eol-check`, `iac-scan`, `license-check`, `repo-impact`, `secret-scan`, `secure-code-write`, `typosquat-check` |
| `+ Edit` | `fix` |
| `+ Edit` and package managers (`npm`, `yarn`, `pnpm`, `pip`, `cargo`, `go`) | `dep-resolve` |
| `+ Write` | `detection-rules` |
| `+ Bash(git:*)` | `verify-fix` |
| `+ Bash(semgrep:*)` | `sast-scan` |
| `+ Bash(nuclei:*)` | `exploit-test` |
| `+ Bash(syft:*) Bash(grype:*) Bash(trivy:*)` | `container-scan` |
| `+ Write Bash(syft:*) Bash(cosign:*)` | `sbom-generate` |
| `+ Write Bash(cosign:*) Bash(gh:*)` | `vex-publish` |

Each skill also names a model: `haiku` for `dashboard`, `sonnet` for the rest. A host that does not read the key ignores it.

## Rules every skill follows

These come from the shared contract, [`skills/_lib/contract.md`](https://github.com/Vulnetix/pix-ai-coding-assistant/blob/main/skills/_lib/contract.md):

1. **MCP first, CLI otherwise.** If `vulnetix_*` tools are present, use them for data. Anything that touches the working tree uses the CLI even when MCP is there.
2. **Install the CLI if it is missing**, with Homebrew, Scoop, Nix or the install script, then `vulnetix agent install`.
3. **Find credentials, never ask for a key.** The CLI's own lookup order applies. With none, say once that the session is on the shared Community tier.
4. **`vulnetix auth login` needs you.** The skill shows the URL and code and waits; it cannot approve the device grant.
5. **Read `.vulnetix/capabilities.yaml` first** where the skill depends on local tools, and skip what is not installed rather than fail. Refresh it with `vulnetix agent capabilities`.
6. **Write state to `.vulnetix/`**, mostly `memory.yaml`. See [Repository files](/pix/reference/repository-files/).

## Checking the skills yourself

From a clone of the repository:

| Command | Does |
|---|---|
| `just validate` | `skill-validator check --strict` against the Agent Skills spec |
| `just evals` | Checks the eval corpus (`skills/*/evals/`); no model, no credential |
| `just evals-full claude` | Drives real agents through the corpus. Costs money. |
