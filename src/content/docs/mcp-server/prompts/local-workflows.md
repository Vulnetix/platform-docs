---
title: Local workflows
description: What each of the 18 prompts needs on your machine, how to install and sign in to the Vulnetix CLI, and which clients can run the steps.
order: 3
sources:
  - mcp-server/src/prompts/generated.ts
  - cli/install.sh
  - cli/cmd/auth.go
  - cli/cmd/agent.go
checked: [mcp-server@1725a04, cli@4c8c3b7]
updated: 02 Nov 2026
---

Every prompt runs on your machine, not on the server. That is also why no code leaves your machine through this server: the alternative would be uploading your source to be scanned.

## Install and sign in

```bash
curl -fsSL https://cli.vulnetix.com/install.sh | sh
```

Without root, install to a user directory:

```bash
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir ~/.local/bin
```

Other install methods (Homebrew, Scoop, Nix, `go install`) are on the [CLI install page](/cli/). Then sign in once; the CLI and the MCP server use the same organisation credential:

```bash
vulnetix auth login
vulnetix auth status
```

## What each prompt needs

| Prompt | Needs | Optional tools it uses |
|---|---|---|
| `vulnetix_sast_scan` | Source files | Semgrep with a `.semgrep` config |
| `vulnetix_secret_scan` | The repo, or staged changes | |
| `vulnetix_iac_scan` | Terraform, OpenTofu, Nix or Kubernetes manifests | |
| `vulnetix_container_scan` | A Dockerfile, Containerfile or compose file | Trivy, Grype, Syft; Docker or Podman for `--image` |
| `vulnetix_license_check` | A dependency tree | |
| `vulnetix_sbom_generate` | The repo | Syft, cosign |
| `vulnetix_eol_check` | Manifests | |
| `vulnetix_fix` | Writable manifests and the package manager | |
| `vulnetix_dep_resolve` | The package manager (`npm ls`, `pnpm why`, `go mod why`, `cargo tree -i`) | |
| `vulnetix_verify_fix` | The repo, to re-scan | |
| `vulnetix_vex_publish` | `.vulnetix/memory.yaml` | `gh` to comment on a pull request |
| `vulnetix_dependency_choice` | Manifests | |
| `vulnetix_repo_impact` | The repo's manifests and lockfiles | |
| `vulnetix_typosquat_check` | Manifests | |
| `vulnetix_detection_rules` | Somewhere to write rules | Snort, YARA, Nuclei when installed |
| `vulnetix_exploit_test` | A target you are authorised to test | Nuclei |
| `vulnetix_secure_code_write` | The file or topic you are working on | |
| `vulnetix_dashboard` | `.vulnetix/memory.yaml` only | |

Third-party scanners are optional. `vulnetix agent capabilities` writes `.vulnetix/capabilities.yaml` with what it found on your machine, and the workflows read it to decide what to offer.

## Shared state

Several workflows read and write `.vulnetix/memory.yaml` in the repository: tracked findings, triage decisions and history. It is the CLI's file; the server never sees it. `vulnetix_dashboard` reads only that file.

## Which clients can run the steps

The prompts tell the agent to run shell commands, so the client needs a terminal tool.

| Client | Runs the steps |
|---|---|
| Claude Code | Yes, Bash tool |
| Cursor, Windsurf, VS Code with Copilot | Yes, in agent mode |
| Cline, Roo Code, Continue, Goose, Zed | Yes |
| Codex CLI | Yes, inside its sandbox |
| Claude Desktop | No shell and no repository |

## Only want the data

You do not need to install anything for the 31 tools. Every lookup works with only the MCP connection.
