---
title: Dependency skills
description: dependency-choice, typosquat-check, dep-resolve, eol-check and license-check, the skills for choosing, vetting, unblocking and auditing packages.
order: 2
sources: [pix-ai-coding-assistant/skills/dependency-choice/SKILL.md, pix-ai-coding-assistant/skills/typosquat-check/SKILL.md, pix-ai-coding-assistant/skills/dep-resolve/SKILL.md, pix-ai-coding-assistant/skills/eol-check/SKILL.md, pix-ai-coding-assistant/skills/license-check/SKILL.md]
checked: [pix-ai-coding-assistant@7aebf02, cli@4c8c3b7]
updated: 02 Nov 2026
---

These skills cover the decisions before and around a dependency. The [dependency guard](/pix/hooks/dependency-guard/) is the automatic check at install time; these are the deliberate conversations.

## dependency-choice

Which package to add for a capability, and what each option costs.

| | |
|---|---|
| Arguments | `<capability or package name> [--ecosystem npm\|pypi\|...]` |
| Runs | `vulnetix vdb packages search`, `vulnetix vdb packages get` (health, end of life, OpenSSF Scorecard), `vulnetix vdb package-vulns` (advisory history), or the MCP equivalents |
| Writes | A decision entry in `.vulnetix/memory.yaml` |
| Calls | `typosquat-check` before recommending an unfamiliar name |

It asks first whether the platform already does the job (`SubtleCrypto` before a crypto package, `fetch` before an HTTP client, `structuredClone` before a deep-clone package). For each candidate it weighs last release, how the project responded to past advisories, Scorecard, transitive dependency count, licence against this repository's policy, and end of life. The output is a comparison and a recommendation with its reason; you make the call.

Not for checking whether an already-chosen package is allowed: that is the dependency guard.

## typosquat-check

Whether a name impersonates a popular package or is known-malicious.

| | |
|---|---|
| Arguments | `<package-name>` for one package, or `--installed` for every direct dependency in the lockfile of `derived.primary_package_manager` |
| Runs | `vulnetix scan --block-malware -o json`, `vulnetix vdb ai-malware list -o json`, `vulnetix vdb packages search` (name-similarity scores) |
| Output | `ALLOW`, `WARN` or `BLOCK` per package, with the reason (similarity, age, maintainer signals) |
| Writes | An `event: typosquat-check` entry in `.vulnetix/memory.yaml` |

`BLOCK` is rare and urgent. Before removing a flagged package it suggests `git log -p -- <manifest>` to see what depends on it. Similarity is heuristic, so a legitimate package near a popular name (`typescript-eslint` and `typescript`) can score high.

## dep-resolve

A `fix` bump failed on peer or transitive constraints: find a compatible set.

| | |
|---|---|
| Arguments | `<package-name> [--target-version X]` |
| Runs | `npm ls`, `pnpm why`, `yarn why`, `pip show`, `go mod why` or `cargo tree -i` for the detected package manager; `vulnetix vdb versions`, `vulnetix vdb fixes` |
| Grants | `Edit`, and the package managers `npm`, `yarn`, `pnpm`, `pip`, `cargo`, `go` |
| Writes | The manifest or override block, after you approve; `event: dep-resolve` in memory |

It proposes, in order of preference:

1. A single bump to the version Safe Harbour picks under `safeHarbourStrategy` in `.vulnetix/agent.yaml` that satisfies the constraints.
2. A package-manager override: npm `overrides`, pnpm `pnpm.overrides`, yarn `resolutions`, Go `replace`, Cargo `[patch]`.
3. Inlining the patched upstream code as first-party code (`fix` type A0). Copy the upstream LICENSE with it.
4. A workaround only: hand off to [`detection-rules`](/pix/skills/defence/#detection-rules).

It always stops for approval before editing a manifest, then suggests `verify-fix`. pip has no override mechanism; pinning the transitive in `requirements.txt` with `--no-deps` on the parent is the workaround it offers.

## eol-check

Runtimes and packages past end of life, or close to it.

| | |
|---|---|
| Arguments | `[--strict]`: also flag anything reaching end of life within 90 days |
| Runs | `vulnetix scan --block-eol -o json` (exits non-zero on a hit), `vulnetix vdb product <runtime>` for Node, Python, Java, Go and .NET dates |
| Output | A table of runtime or package, installed version, end-of-life date, days past, action |
| Writes | `event: eol-check` in memory |

Container base images are checked when the repository has a Dockerfile or Containerfile. It flags; for the upgrade target, pair it with `dependency-choice`. See [EOL policy](/quality-gates/) for gating builds on end of life.

## license-check

Licence conflicts against a policy.

| | |
|---|---|
| Arguments | `[--policy permissive\|copyleft-aware\|strict]` |
| Runs | `vulnetix license -o json-spdx` |
| Writes | `.vulnetix/licenses.<timestamp>.spdx.json`, and counts to `.vulnetix/licenses/<timestamp>.summary.yaml` |
| Reads | `.vulnetix/license-policy.yaml`, an allowlist that overrides the built-in policies, when present |

| Policy | Flags |
|---|---|
| `permissive` | `GPL-*`, `AGPL-*`, `LGPL-*` against an MIT, Apache-2.0 or BSD codebase |
| `copyleft-aware` | `AGPL-*` and `SSPL-1.0` |
| `strict` | Anything outside MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0 |

A dual-licensed package is reported under its first licence. A non-SPDX string such as "see LICENSE file" is `Unknown`. The output is not legal review.
