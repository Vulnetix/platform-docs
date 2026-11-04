---
title: Artifact manifest
nav: Artifact manifest
description: The JSON Lines file that lists every file a Vulnetix command wrote, set with --artifact-manifest or VULNETIX_ARTIFACT_MANIFEST, and how the GitHub Actions use it to upload, attest and attach exactly those files.
order: 6
sources: [cli/internal/artifacts/manifest.go, cli/cmd/root.go, cli/action-lib/run.sh, cli/action-lib/release-assets.sh, cli/docs/github-publishing.md]
checked: [cli@3e6fd831d]
updated: 03 Nov 2026
---

A CI step that uploads, attests or attaches what a scan wrote should not guess at paths. The artifact manifest lists them. Added in CLI v3.162.0.

| Setting | Value |
|---|---|
| Flag | `--artifact-manifest <file>`, on every command |
| Environment variable | `VULNETIX_ARTIFACT_MANIFEST` |
| Without either | Nothing is recorded |

The flag wins over the variable. The file is JSON Lines: one object per write, appended with `O_APPEND`, so several commands in one job (`sca`, then `sast`, then `cdx`) add to the same file without coordinating.

```sh
export VULNETIX_ARTIFACT_MANIFEST="$RUNNER_TEMP/vx.jsonl"
vulnetix sca
vulnetix sast
jq -r .path "$VULNETIX_ARTIFACT_MANIFEST"
```

## Entry

| Field | Meaning |
|---|---|
| `path` | Absolute path of the file |
| `kind` | `sarif`, `cyclonedx`, `spdx`, `vex`, `signature`, `certificate`, `attestation` or `report` |
| `sha256` | SHA-256 of the file as written; absent when it was not computed |
| `bytes` | Size in bytes |
| `command` | The command that wrote it |
| `written` | UTC time, RFC 3339 |

## What is recorded

Every SARIF the CLI writes, including `sca.sarif`, `license.sarif` and the per-kind files under `.vulnetix/code-scanning/`; the scan SBOM; and the output of `cdx`, `cbom`, `aibom`, `malscan`, `jail`, `vex` and `analyze`. The signature (`.sig`), certificate (`.pem`) and in-toto (`.intoto.jsonl`) sidecars that `cdx --sign` writes are recorded too.

A file written twice appears twice. Readers keep the last entry per path and drop files that no longer exist. An unwritable manifest never fails the write it records: it costs the manifest, not the scan.

## In the GitHub Actions

Each action sets its own manifest per step, so its outputs list only what that step wrote:

| Output | From the manifest |
|---|---|
| `files` | Every file, one per line |
| `sarif` | Entries of kind `sarif` |
| `sbom` | The CycloneDX SBOM named `sbom.cdx.json` (for the sbom action, the CycloneDX file) |
| `manifest` | The manifest's path |

`artifact-name`, `attest` and `release-tag` act on `files`. `release-tag` runs [`gha publish release-assets`](/cli/commands/gha-publish/#release-assets) with `--manifest`, which attaches the same list to the release.

See [GitHub Actions](/cli/ci-cd/github-actions/) and [Files](/cli/reference/files/).
