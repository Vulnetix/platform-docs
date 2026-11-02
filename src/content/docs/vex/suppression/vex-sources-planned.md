---
title: VEX as suppression rules (planned)
nav: VEX sources (planned)
description: Planned, not shipped. A VexSource kind that pulls VEX documents from a TEA server, S3, git, a local path or URLs and keeps suppression rules in step with them.
order: 4
sources: [cli/cmd/vex_ingest.go, vdb-api/internal/handler/v2_cli_vex_ingest.go]
checked: [cli@4c8c3b71c, vdb-api@4145f0a]
updated: 02 Nov 2026
---

> [!CAREFUL] Planned, not available
> Nothing on this page exists yet. There is no `VexSource` kind, no `vulnetix_vex_source` Terraform resource, and no server-side fetching of VEX. The design below can change before it ships.

## What works today

VEX already becomes suppression rules, but only when the CLI pushes it: a scan with `--vex-file`, `vex apply --upload`, `bom enrich --vex`, `upload`, `triage`, `defend` and `jail` send their documents to `/v2/cli.vex-ingest`, and the server turns false-positive and won't-fix statements into rules. See [VEX sent to Vulnetix](/vex/suppression/sent-to-vulnetix/). The server never fetches a document itself, and a rule stays until a newer statement replaces it.

## What is planned

A `VexSource` document (`apiVersion: vulnetix.com/v1`) names one place VEX documents live. Vulnetix would fetch it on a schedule, record each fetch, and keep the rules that source created in step with its current statements.

### Source types

Each `VexSource` has exactly one source.

| Type | Fields | Notes |
|---|---|---|
| `tea` | `product`, `productRelease` or `collection` (a TEI or UUID), and `server` (a TEA root or a domain for `.well-known/tea` discovery) | Pulls the VEX artifacts from a TEA collection. Works with the Vulnetix [TEA](/tea/) publisher and third-party TEA servers. |
| `s3` | `bucket`, `prefix` or `key`, `region`, `roleArn`, `externalId` | A cross-account role, using the same trust pattern as cloud onboarding (the external ID is the tenant UUID), or an S3-compatible `endpoint` such as R2 or MinIO |
| `git` | `url`, `ref`, `paths` (globs), `credentialRef` (a vault entry) | Any git server over HTTPS: GitHub, GitHub Enterprise, GitLab, Gitea, Forgejo, plain git. Reuses a forge connection when one matches. |
| `path` | `path`, absolute or relative to the config or repository root | Resolved by the CLI only. At scan time it is applied locally, as `--vex-file` is today. On `config apply` the CLI would upload a snapshot so server-side views match. |
| `urls` | a list of HTTPS URLs, each with an optional `sha256` and an optional auth header from a vault entry | Fetched with `ETag` and `If-Modified-Since` |

### Other fields

| Field | Planned meaning |
|---|---|
| `format` | `openvex`, `cyclonedx` or `auto` |
| `scope` | The organisation, a set of repositories, or a set of products |
| `trust` | Require a signature; restrict allowed authors |
| `refresh` | An interval, or on webhook |
| `onError` | `keep-last` keeps the last good snapshot's rules; `clear` removes them |

### Planned behaviour

- Each fetch writes a snapshot recording the content hash, fetch time, statement count and errors, shown in the source's status.
- Rules created from a source are owned by it. They disappear when the statement leaves the document, and deleting one by hand is refused with a pointer to the source.
- `vulnetix scan` would read every `VexSource` for the organisation, so CI gates honour them. The quality gate and jail would evaluate after VEX.
- The console's Suppression Policies page would mark source-owned rules as read-only, with a link to the document and statement.

## Platform IaC

`VexSource` is one of the planned kinds on [Platform IaC](/platform-iac/). Until it ships, commit vendor VEX to the repository and pass it with `--vex-file`.

```bash
vulnetix scan --vex-file .vulnetix/vendor-vex/
```
