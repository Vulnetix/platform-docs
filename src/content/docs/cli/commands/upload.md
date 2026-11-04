---
title: upload
description: vulnetix upload publishes a SARIF, CycloneDX or SPDX report written by another tool to Vulnetix, under that tool's name and in the scan category the report implies.
order: 7
sources: [cli/cmd/upload.go, cli/cmd/upload_publish.go, cli/internal/upload, cli/action.yml]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

```sh
vulnetix upload [flags]
```

The Vulnetix scanners publish their own results. `upload` is for reports other tools wrote: gosec, Grype, Checkov, Syft and so on. Each report is recorded under the name and version of the tool that produced it, in the category inferred from the report, with the same findings, triage and VEX records a Vulnetix scan creates.

```sh
vulnetix upload --file gosec.sarif
vulnetix upload --file grype.cdx.json --org-id 8ff8f1e4-0000-4000-8000-000000000000
vulnetix upload --dir ./reports --json
```

In GitHub Actions, prefer [`vulnetix gha upload`](/cli/ci-cd/gha-command/), which publishes every report a workflow run uploaded as an artifact, in one call.

## Flags

| Flag | Default | Effect |
|---|---|---|
| `--file <path>` | | One report |
| `--dir <dir>` | `.vulnetix/` discovery | Every report in a directory |
| `--format <f>` | detected from content | Override: `cyclonedx`, `spdx`, `sarif`, `openvex`, `csaf_vex` |
| `--org-id <uuid>` | the credential's org | Organisation to publish to. Must be a UUID. |
| `--json` | off | Print the result as JSON (category, tool, finding counts, snapshot) |
| `--base-url <url>` | | Override the Vulnetix API base URL (sets `VULNETIX_API_URL` for the run) |
| `--project`, `--environment`, `--cluster`, `--namespace`, `--tag key=value` | | Deployment labels, as on [scan](/cli/commands/scan/#deployment-context-and-bom-identity) |

## Rules

- The format is read from the content, not the name: Checkov and KICS both write `results.sarif`.
- A report written by a Vulnetix scanner is refused: the command that wrote it already published it.
- A file that is not SARIF, CycloneDX or SPDX is refused, naming the tool's own SARIF option where there is one.
- `upload` needs a real credential. With none it fails: `authentication required: ... Run 'vulnetix auth login' to authenticate`.
- Any file that fails to publish makes the command exit `1`.
