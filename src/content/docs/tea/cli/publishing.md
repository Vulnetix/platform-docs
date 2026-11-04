---
title: Publishing with the CLI
nav: Publishing
description: Create TEA products, releases, collections and artifacts with vulnetix tea publish, declare download links with tea distribution, and set access with tea share.
order: 3
sources: [cli/cmd/tea_publish.go, cli/cmd/tea_distribution.go, cli/pkg/tea/objects.go, vdb-site/api/internal/handler/tea_publisher_handlers.go]
checked: [cli@4c8c3b71c, vdb-site@1a06d67]
updated: 02 Nov 2026
---

Publishing needs your own credentials (`vulnetix auth login`, or `VULNETIX_ORG_ID` and `VULNETIX_API_KEY`), always writes to your own organisation, and always goes to `https://www.vulnetix.com/tea/v1`. It needs the Pro plan or above; on a lower plan the server answers `403 FORBIDDEN`. `--catalogue public` is refused.

For a pipeline, [`tea release`](/tea/cli/release/) does all of this in one command. Use the commands below to publish by hand or to change one object.

## tea publish

A product holds releases, a release has one collection, and a collection holds artifacts. Each command takes the parent it belongs to.

| Command | Flags | Does |
|---|---|---|
| `tea publish product <name>` | `--purl` | Register a product |
| `tea publish release <product-uuid> <version>` | `--date` (RFC 3339, default now), `--pre-release` | Publish a product release |
| `tea publish collection <release-uuid>` | `--reason` (default `INITIAL_RELEASE`), `--comment` | Publish the next collection version |
| `tea publish artifact <collection-uuid> <file>` | `--name`, `--media-type`, `--type` | Register an artifact and upload its bytes |
| `tea publish list` | | Your organisation's published products, visibility and release counts |
| `tea publish delete <kind> <uuid>` | | Withdraw an object and everything beneath it |

`--reason` is one of `INITIAL_RELEASE`, `ARTIFACT_ADDED`, `ARTIFACT_UPDATED`, `VEX_UPDATED`, `ARTIFACT_REMOVED`. The `delete` kinds are `product`, `component`, `product-release`, `component-release`, `artifact` and `distribution`. Deleting a product does not reach the component published beside it; they are separate lineages.

```bash
PRODUCT=$(vulnetix tea publish product acme/widget --purl pkg:github/acme/widget --json | jq -r .uuid)
RELEASE=$(vulnetix tea publish release "$PRODUCT" v1.2.3 --json | jq -r .uuid)
vulnetix tea publish collection "$RELEASE" --reason INITIAL_RELEASE
vulnetix tea publish artifact "$RELEASE" dist/widget.cdx.json
vulnetix tea publish artifact "$RELEASE" dist/widget.openvex.json
vulnetix tea publish list
```

Without `--json`, `publish product` and `publish release` print `<uuid>  <name>`.

The collection must exist before an artifact can join it (otherwise `404 OBJECT_UNKNOWN`, `no such collection`). Its UUID is the release's UUID, so the release UUID is what `tea publish artifact` takes. Adding an artifact does not advance the collection version; run `tea publish collection` again with a reason such as `ARTIFACT_ADDED` when the set changes.

### Upload integrity

The file's SHA-256 is computed locally and sent as `Content-Digest: sha-256=:<base64>:`. The server checks it before storing anything and answers `400 CHECKSUM_MISMATCH` if the bytes differ, so a truncated upload is never published under a checksum that says it arrived intact. The limit is 128 MiB per file (`413 PAYLOAD_TOO_LARGE`).

### Media type and artifact type from the file name

When `--media-type` and `--type` are omitted:

| File name contains | Media type | TEA artifact type |
|---|---|---|
| `.cdx.json`, `.cdx.`, `cyclonedx` | `application/vnd.cyclonedx+json` | `BOM` |
| `.spdx.json`, `spdx` | `application/spdx+json` | `BOM` |
| `sbom`, `cbom`, `aibom` | by extension | `BOM` |
| `vex` | `application/vnd.openvex+json` (unless CycloneDX or SPDX) | `VULNERABILITIES` |
| `.sarif`, `.sarif.json` | `application/sarif+json` | `VULNERABILITIES` |
| `attestation`, `provenance`, `slsa` | by extension | `ATTESTATION` |
| `release-note`, `changelog` | by extension | `RELEASE_NOTES` |
| `license`, `licence` | by extension | `LICENSE` |
| anything else | `application/json` for `.json`, `text/plain` for `.md` and `.txt`, else `application/octet-stream` | `OTHER` |

The TEA artifact types are `ATTESTATION`, `BOM`, `BUILD_META`, `CERTIFICATION`, `FORMULATION`, `LICENSE`, `RELEASE_NOTES`, `SECURITY_TXT`, `THREAT_MODEL`, `VULNERABILITIES`, `OTHER`.

## tea distribution

An artifact is evidence about a release. A distribution is the release as somebody installs it. Distributions belong to a component release.

| Command | Does |
|---|---|
| `tea distribution add <component-release-uuid>` | Add one distribution, or one per line of a checksums manifest |
| `tea distribution list <component-release-uuid>` | List them |
| `tea distribution remove <distribution-uuid>` (alias `rm`) | Withdraw one. The file is untouched and existing links keep working. |

`dist` is an alias for `distribution`.

| `add` flag | Description |
|---|---|
| `--url` | Direct download URL |
| `--description` | What this channel or format is |
| `--purl` | Package URL identifying this distribution |
| `--sha256` | SHA-256 of the downloaded bytes |
| `--signature-url` | URL of a detached signature |
| `--checksums` | A `sha256sum`-format manifest. One distribution per line. |
| `--base-url` | The URL each file in `--checksums` is served from |
| `--exclude` | File name in `--checksums` to skip. Repeatable. |

```bash
# One file
vulnetix tea distribution add "$REL" --url https://example.com/tool-linux-amd64 \
  --description "Linux x86-64 binary" --sha256 b9f62ff7...

# Every asset of a release, from its checksums file
vulnetix tea distribution add "$REL" --checksums checksums.txt \
  --base-url https://github.com/owner/repo/releases/download/v1.2.3 --exclude checksums.txt

# A channel with nothing to fetch
vulnetix tea distribution add "$REL" --description "Homebrew: brew install owner/tap/tool"
```

Taking digests from the checksums file means the checksum a consumer reads through TEA is the string your users already verify against. Each add is idempotent on its URL, or on its description when there is no URL, so re-running a release job updates links instead of duplicating them.

## tea share

```bash
vulnetix tea share <uuid>                                   # report the policy in force
vulnetix tea share <uuid> --visibility public               # anyone, unauthenticated
vulnetix tea share <uuid> --visibility shared --org <uuid>  # named organisations
vulnetix tea share <uuid> --visibility private              # your organisation only
```

| Flag | Description |
|---|---|
| `--visibility` | `private`, `shared` or `public`. Omit to read the current policy. |
| `--org` | Organisation UUID to share with. Repeatable. |

With no flags it reports what the object declares, what is effectively enforced, and where an inherited policy came from. An object may only narrow what it inherits; widening it is refused with `409 ACCESS_WIDENS_PARENT`. See [Access policies](/tea/publisher/access-policies/).

> [!CAREFUL] Public cannot be undone
> Setting an object back to private stops new readers. It does not recall anything already fetched.
