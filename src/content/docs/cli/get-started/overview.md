---
title: Vulnetix CLI
nav: Overview
description: The vulnetix binary runs every Vulnetix scanner, signs in to your organisation, publishes results from CI, and is the entry point for most other Vulnetix products.
order: 1
sources: [cli/cmd/root.go, cli/cmd/exit_codes.go, cli/pkg/auth/credentials.go, cli/cmd/config_documents.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

`vulnetix` is one Go binary for Linux, macOS and Windows. It parses your manifests and source locally, asks the Vulnetix VDB about the packages it found, writes its results under `.vulnetix/` in the project, and, when you are signed in, publishes those results to your organisation. Files are not uploaded. What is published is the SBOM and the SARIF, and a SARIF result carries a few lines of source around each finding (`--snippet-context`, `0` turns it off).

These pages cover what every command shares: installing it, signing in, running it in CI, the orchestrating `scan` command, `report`, `analyze`, the GitHub posture commands, and the global flags, environment variables and exit codes. Each scanner and product has its own segment, linked from the map below.

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh
vulnetix auth login
vulnetix scan
```

Without signing in, VDB lookups use the shared community credential at community rate limits, and nothing is stored in Vulnetix. See [Credential methods](/cli/authentication/methods/#community-fallback).

## Product map

Every top-level command in `vulnetix --help`, and the docs segment that owns it.

| Command | What it does | Documented in |
|---|---|---|
| `agent` | Wires AI coding agents to Vulnetix and answers their lifecycle hooks | [Pix](/pix/) |
| `ai-firewall` | Points AI clients at the Vulnetix AI Firewall and manages its policy | [AI Firewall](/ai-firewall/) |
| `aibom` | Discovers AI agents, SDKs and models; writes a CycloneDX AIBOM | [SBOM](/sbom/) |
| `analyze` | Builds the repository's tech-stack graph and evidence-backed metrics | [CLI: analyze](/cli/commands/analyze/) |
| `api` | Finds OpenAPI and Swagger descriptions in a repository and uploads them | [CLI: api](/cli/commands/api/) |
| `attest` | Verifies signatures and in-toto provenance on artefacts | [Attestation](/attestation/) |
| `auth` | Signs in, shows and verifies credentials, signs out | [CLI: authentication](/cli/authentication/overview/) |
| `bom` | Reads, validates, diffs and inspects SBOM documents | [SBOM](/sbom/) |
| `cbom` | Discovers cryptographic usage; writes a CycloneDX CBOM with post-quantum posture | [SBOM](/sbom/) |
| `cdx` | Writes a standalone CycloneDX SBOM with no VDB lookup or upload | [SBOM](/sbom/) |
| `completion` | Prints shell completion scripts | [CLI: completion](/cli/commands/completion/) |
| `config` | Validates `vulnetix.com/v1` documents; sets and reads org policy | [Platform IaC](/platform-iac/) |
| `containers` | Runs only the container file analysis | [SCA](/sca/) |
| `defend` | Shows, saves and records block rules and detections for a finding with no fix | [Virtual patching](/virtual-patching/) |
| `env` | Prints platform, git, package manager and memory context | [CLI: utilities](/cli/commands/utilities/) |
| `fix` | Applies validated dependency fixes, then rescans | [SCA](/sca/) |
| `gha` | Publishes a workflow run's scanner reports; audits GitHub posture | [CLI: gha upload](/cli/ci-cd/gha-command/), [CLI: GitHub posture](/cli/commands/gha/) |
| `help` | Prints help for any command | This page |
| `iac` | Runs only Infrastructure as Code analysis | [IaC scanning](/iac-scanning/) |
| `ignore` | Manages suppression rules for scanner findings | [Vulnerability management](/vulnerability-management/) |
| `image` | Inventories a container image for container curation | [SCA](/sca/) |
| `jail` | Gates the pipeline on the organisation's jail policy | [Quality gates](/quality-gates/) |
| `license` | Checks package licences for conflicts and policy | [SCA](/sca/) |
| `lsp` | Runs the Vulnetix language server over stdio | [VS Code](/vscode/) |
| `malscan` | Scans installed dependency directories for malware | [Malware](/malware/) |
| `package-firewall` | Configures package managers to use the Vulnetix Package Firewall | [Package Firewall](/package-firewall/) |
| `pix` | Installs the Pix plugin's skills (`vulnetix pix install`, with `--agent` and `--skill`) | [Pix](/pix/) |
| `report` | Renders the stored results of the last scan without rescanning | [CLI: report](/cli/commands/replay/) |
| `sast` | Runs only static analysis | [SAST](/sast/) |
| `sca` | Runs only dependency (software composition) analysis | [SCA](/sca/) |
| `scan` | Runs every scanner in one pass and applies one set of gates | [CLI: scan](/cli/commands/scan/) |
| `secrets` | Runs only secret detection | [Secrets](/secrets/) |
| `skills` | Installs, checks, updates and removes Vulnetix agent skills | [Pix](/pix/) |
| `surface` | Checks from inside your network that registered routes and hosts still answer | [CLI: surface](/cli/commands/surface/) |
| `tea` | Publishes to and reads from the Transparency Exchange API | [TEA](/tea/) |
| `triage` | Triages GitHub alerts or Vulnetix findings against the VDB and writes VEX | [CLI: triage](/cli/commands/triage/) |
| `update` | Replaces the binary with the latest release | [CLI: utilities](/cli/commands/utilities/) |
| `upload` | Publishes a third-party SARIF, CycloneDX or SPDX report | [CLI: upload](/cli/commands/upload/) |
| `vdb` | Queries the Vulnetix Vulnerability Database API | [VDB API](/vdb-api/) |
| `version` | Prints the version, commit and build details | [CLI: utilities](/cli/commands/utilities/) |
| `vex` | Reads, validates and applies VEX statements | [VEX](/vex/) |

`vulnetix` with no command runs an authentication health check over every credential source. See [Utilities](/cli/commands/utilities/#vulnetix-with-no-command).

## Find the page for your task

| I want to | Read |
|---|---|
| Install on a laptop or a runner | [Install](/cli/get-started/install/) |
| Scan a project for the first time | [Quickstart](/cli/get-started/quickstart/) |
| Sign in without a browser | [Credential methods](/cli/authentication/methods/#apikey) |
| Find out which credential the CLI is using | [Credential precedence](/cli/authentication/precedence/) |
| Fail a build on high-severity or exploited findings | [scan: when to fail](/cli/commands/scan/#when-to-fail) |
| Run Vulnetix in GitHub Actions | [GitHub Actions](/cli/ci-cd/github-actions/) |
| Send gosec, Trivy or Semgrep results to Vulnetix | [Third-party scanners](/cli/ci-cd/third-party-scanners/) |
| Check a repository's workflows for injection flaws | [GitHub posture commands](/cli/commands/gha/) |
| Tell a pipeline failure from a gate that could not decide | [Exit codes](/cli/reference/exit-codes/) |
| Know what is in `.vulnetix/` | [Files](/cli/reference/files/) |

## GitHub Actions

The per-command actions are listed on [GitHub Actions](/cli/ci-cd/github-actions/#an-action-for-each-command). The CLI-level ones are [setup](/cli/github-actions/setup/), [analyze](/cli/github-actions/analyze/), [upload](/cli/github-actions/upload/), [gha-upload](/cli/github-actions/gha-upload/) and [github-publish](/cli/github-actions/github-publish/). Results can also be published straight into GitHub with [gha publish](/cli/commands/gha-publish/).

## Platform IaC

The CLI is where config-as-code runs from. `vulnetix config validate`, `config kinds` and `config schema` check `apiVersion: vulnetix.com/v1` documents offline against the schemas built into the CLI, which are a release of [Vulnetix/config-schemas](https://github.com/Vulnetix/config-schemas). `config plan`, `apply` and `export` send documents to the config engine; `config set|get` are the imperative forms. `ai-firewall apply|export` and the policy form of `config set package-firewall` became aliases of the engine in CLI v4.0.0, as `config set quality-gate|eol-policy` already were. A file is a Platform IaC document if its `apiVersion` is `vulnetix.com/v1` and its `kind` is one `vulnetix config kinds` lists. The CLI reads `.vulnetix/config` and three well-known files: `.vulnetix/ai-firewall.yaml`, `.vulnetix/license-policy.yaml` and `.vulnetix/license-exceptions.yaml`.

The CLI embeds one release of the schemas (CLI v4.1.1 embeds config-schemas v1.12.0), and refuses a kind added in a later release as unknown before it sends anything. The [kind catalogue](/platform-iac/kinds/catalogue/) and each kind's page say from which CLI release a kind is known. The CLI evaluates no CEL expression; see [CEL rule expressions](/platform-iac/reference/cel/). The CLI's own settings (credentials, output and gate flags) are flags and environment variables, not documents. See [Platform IaC](/platform-iac/).
