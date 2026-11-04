---
title: "vulnetix api"
nav: api
description: Find the OpenAPI and Swagger descriptions in a repository and upload them, so the Resolve Platform can inventory your API surface and match its routes to findings.
order: 11
sources: [cli/cmd/api.go, cli/internal/apispecs]
checked: [cli@v4.13.1]
updated: 04 Nov 2026
---

`vulnetix api` finds the OpenAPI and Swagger descriptions in a working tree and uploads them to your organisation. The uploaded specs appear in the Resolve Platform under API specs, and their routes are matched to findings, so a finding on a handler names the route that reaches it.

Finding specs reads files only. The command sends nothing to the hosts a spec describes.

```bash
vulnetix api discover [path] [flags]
vulnetix api upload <file>
```

Uploading needs a signed-in organisation. Community credentials can run `discover --no-upload` but cannot upload. See [Authentication](/cli/authentication/overview/).

## api discover

Walks `path` (the current directory by default) and prints one line per spec found, then uploads them.

| Flag | Type | Default | Description |
|---|---|---|---|
| `[path]` | string | `.` | Directory to search |
| `--no-upload` | bool | `false` | Find and print the specs without uploading them |

A file whose name looks like a spec is always read. Any other `.json` or `.yaml` file under the size limit is inspected first, so a spec with an unusual name is still found without every manifest being parsed. Vendored and generated directories are skipped.

## api upload

Uploads one file as it is. Use it for a spec that `discover` does not reach, such as one produced by a build step.

## What is sent

Each spec's path relative to the scanned directory, its contents unchanged, and the HEAD commit when the directory is a git repository. The server reads each document again itself, so a spec that fails to parse is counted as rejected rather than stored.

The command prints how many specs were accepted and how many were rejected.

## Examples

```bash
# See what would be uploaded
vulnetix api discover --no-upload

# Find and upload every spec in a monorepo
vulnetix api discover ./services

# Upload a spec generated during the build
vulnetix api upload build/openapi.json
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Specs were found and uploaded, or none were found |
| `1` | No signed-in organisation, a file could not be read, or the upload failed |
