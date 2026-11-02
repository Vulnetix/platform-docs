---
title: vulnetix aibom
description: Discover AI coding agents, AI SDKs, model names and AI infrastructure in a project and write a CycloneDX AI bill of materials.
order: 1
sources: [cli/cmd/aibom.go, cli/internal/aibom/catalog/tools.json, cli/internal/aibom/catalog/libraries.json, cli/internal/aibom/catalog/infrastructure.json, cli/cmd/scan.go, cli/cmd/suppress.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

`vulnetix aibom` finds evidence of AI coding agents and AI use in a project and writes an AI Bill of Materials in CycloneDX.

```bash
vulnetix aibom [path] [flags]
```

## Detection passes

| Pass | Reads | Skipped by |
|---|---|---|
| Environment | Known AI tool and provider environment variable names. Values are never read, so secrets never reach the AIBOM. | `--no-env` |
| Filesystem | Tool config directories, instruction files, ignore files, skills, hooks, plugins, steering, memory, prompts, agents, commands and marketplace manifests | always runs |
| Source code | AI SDK and framework use per language, and the model-name literals passed to them. Names are read from the SDK parameter (`model=`, `modelId=`, `deployment_name=`), so unknown and future models are still found. | `--no-source` |
| Commit history | Commits authored by an agent: `Co-Authored-By` trailers, session markers, agent bot authors, "Generated with" lines. Reads at most `--commit-scan-max` commits from HEAD. | `--no-commits` |
| IaC | Kubernetes manifests (including KServe, Kubeflow and KubeRay resources), compose files, Dockerfiles and Terraform: serving runtimes, agent platforms, vector databases, training frameworks, declared models, model volumes, GPU requests, managed AI services | `--no-iac` |

The built-in catalog is version `2026.06.4`: 84 AI coding agents, 73 AI provider services, 2 cross-tool conventions (`AGENTS.md`, `.mcp.json`) and 102 AI SDKs. See [Supported agents and providers](/sbom/aibom/supported-tools/), [AI SDKs](/sbom/aibom/libraries/) and [AI infrastructure](/sbom/aibom/infrastructure/).

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `[path]`, `--path` | string | `.` | Directory to scan |
| `--depth` | int | `25` | Maximum recursion depth |
| `--ignore` | string, repeatable | | Glob of paths to skip |
| `-o`, `--output` | string | `pretty` | Terminal output: `pretty` (alias `table`), `json` (raw detections), `cyclonedx-json`. The file is written whichever you choose. |
| `--output-file` | string | `<path>/.vulnetix/ai-bom.cdx.json` | Where the AIBOM is written |
| `--spec-version` | string | `1.7` | `1.6` or `1.7` |
| `--catalog` | string | | Catalog file to merge over the built-in one. See [AIBOM catalog format](/sbom/aibom/catalog-format/). |
| `--no-builtin-catalog` | bool | `false` | Use only `--catalog` |
| `--no-env` | bool | `false` | Skip the environment pass |
| `--no-source` | bool | `false` | Skip the source pass |
| `--no-commits` | bool | `false` | Skip the commit-history pass |
| `--no-iac` | bool | `false` | Skip the IaC pass |
| `--commit-scan-max` | int | `2000` | Most commits the commit-history pass reads |
| `--include-home` | bool | `false` | Also look for tool config directories in your home directory |
| `--include-system` | bool | `false` | Look in every account's home (`/home/*`, `/root`), not just yours |
| `--system-root` | string | `/` | The filesystem `--include-system` describes: a mounted volume, an unpacked image, or `/proc/<pid>/root` |
| `--no-upload` | bool | `false` | Do not send the AIBOM to Vulnetix. It is sent automatically when you are authenticated. |
| `--aibom-include-ignored` | bool | `false` | Include files matched by `.gitignore` |

`--disable-memory` (a global flag) turns off the memory tracking described below.

## Examples

```bash
vulnetix aibom                                  # summary; writes .vulnetix/ai-bom.cdx.json
vulnetix aibom ./myproject -o json              # raw detections as JSON
vulnetix aibom -o cyclonedx-json                # CycloneDX to stdout, still saved to the file
vulnetix aibom --output-file build/aibom.json   # a different path
vulnetix aibom --no-env --no-source             # filesystem, commit and IaC evidence only
vulnetix aibom --catalog ./extra-rules.json     # extend the built-in catalog
```

## Output document

| Detection | CycloneDX component |
|---|---|
| AI coding tool | `application` |
| AI SDK | `library` |
| Model name | `machine-learning-model`, with a `modelCard` |
| Model weight file in the repository | `data` |

Evidence is carried in `vulnetix:ai/*` properties. A value the IaC pass could not verify carries `vulnetix:ai/confidence-gap` set to `true` and a `vulnetix:ai/gap-reason`. The document is schema-validated before it is written. It names `vulnetix-aibom` in `metadata.tools` and claims the `design` and `discovery` lifecycle phases.

## Memory and resolved components

Detected components are tracked in `.vulnetix/memory.yaml`. A component missing from a later run is marked resolved and recorded in `.vulnetix/vex-aibom.openvex.json`.

## Ignoring a component

```bash
vulnetix ignore add --category ai --value claude-sonnet-4 --type false_positive --reason "test fixture string"
```

`--value` is the model id or purl. An ignored AI component is also hidden in the Vulnetix console. See [Ignore rules](/vex/suppression/ignore-rules/).

## Inside a scan

`vulnetix scan` runs the same catalog and pipeline as one of its passes. Turn it off with `vulnetix scan --no-aibom`.

| | `vulnetix aibom` | the pass inside `vulnetix scan` |
|---|---|---|
| Passes | chosen with `--no-env`, `--no-source`, `--no-commits`, `--no-iac` | all |
| CycloneDX file written | yes | no |
| Terminal output | yes | no |
| Memory tracking | yes | yes |
| Sent when authenticated | yes, unless `--no-upload` | yes |

## Privacy

The environment pass records variable names and whether they are set, never their values. No source content is uploaded.
