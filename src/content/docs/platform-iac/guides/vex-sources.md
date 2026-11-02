---
title: VEX documents as suppression rules
nav: VEX sources
description: How a VexSource reads OpenVEX and CycloneDX VEX documents from TEA, S3, git, a path or URLs, how each statement becomes a suppression, remediation, triage context or annotation, how often it is fetched, and what plan refuses.
order: 1
sources: ["config-schemas/schemas/VexSource.schema.json", "vdb-site/api/internal/config/vexsource.go", "vdb-site/api/internal/vexsource/spec.go", "vdb-site/api/internal/vexsource/mapping.go", "vdb-site/api/internal/vexsource/reconcile.go", "vdb-site/api/internal/vexsource/refresh.go", "vdb-site/api/internal/vexsource/fetch.go", "vdb-site/api/internal/vexsource/fetch_urls.go", "vdb-site/api/internal/vexsource/fetch_s3.go", "vdb-site/api/internal/vexsource/fetch_git.go", "vdb-site/api/internal/vexsource/fetch_tea.go"]
checked: ["config-schemas@v1.7.0", "vdb-site@b09e595"]
updated: 03 Nov 2026
---

A [`VexSource`](/platform-iac/kinds/vex-source/) names one place VEX documents live. Vulnetix fetches it on a schedule, records each fetch, and keeps the suppression rules that source created in step with the statements it currently holds. The kind page has the fields and the Minimal and Advanced samples in YAML, HCL and CLI; this page is how it behaves.

Before this kind, VEX became suppression rules only when the CLI pushed it: `vulnetix scan --vex-file`, `vex apply --upload` and the commands listed on [VEX sent to Vulnetix](/vex/suppression/sent-to-vulnetix/). The server never fetched a document itself. A `VexSource` is the standing alternative: the tenant chooses to trust a source, and the server reads it.

## What a statement does

The formats are OpenVEX 0.2.0 and CycloneDX VEX 1.4 to 1.7 (`vulnerabilities[].analysis`). `spec.format` is `openvex`, `cyclonedx` or `auto`, which decides per document. A `VexSource` takes `not_affected` statements as suppressions, which is wider than the ingest route, where only a false positive or a won't fix becomes a rule: nobody chose to trust the author of an uploaded document, and a `VexSource` is that choice, narrowed by `trust.allowedAuthors`.

| Statement | Effect |
|---|---|
| OpenVEX `not_affected`; CycloneDX `not_affected` or `false_positive` | A suppression, with the statement's justification, timestamp and author. The suppression type is `false_positive` when the statement says the vulnerable component or code is not there, and `mitigated` when it is there but cannot be reached or exploited. |
| `fixed`; CycloneDX `resolved` or `resolved_with_pedigree` | The finding is marked remediated, with the triage state `resolved` as evidence. |
| `affected`; CycloneDX `exploitable` or `in_triage` | Recorded as triage context. It never suppresses. |
| `under_investigation` | An annotation only. |

A status the formats do not define is skipped and counted.

Statements are matched to findings by **purl**. A statement whose products have no purl, such as a CPE or an unresolved CycloneDX `bom-ref`, is skipped and reported in the fetch's errors. A suppression is anchored on the vulnerability, the purl without its version, and the repository, and carries the product's explicit versions when it names them. A later statement for the same key replaces an earlier one, whichever document it came from. When two carry the same timestamp, the later one in document order wins.

A suppression a source creates is **owned by it**. It goes when the statement leaves the document, and it cannot be changed or deleted through the engine or by hand. [`Suppression`](/platform-iac/kinds/suppression/) documents are for rules you write yourself.

## Where documents come from

Name exactly one of these in `spec`.

| Source | Reads | Notes |
|---|---|---|
| `tea` | VEX artifacts of a TEA `product`, `productRelease` or `collection`, by TEI or uuid, from `server` (the API root, or a host whose `/.well-known/tea` names it) | Works with the Vulnetix [TEA](/tea/) publisher and any TEA server. |
| `s3` | A `bucket` with a `prefix` (every object under it) or a `key` (one object) | Read through `roleArn`, a cross-account role whose external id is the tenant uuid unless `externalId` says otherwise, the same trust pattern as cloud onboarding. A change is detected by each object's ETag. |
| `git` | `paths` (globs) in a repository at `url` and `ref` (default: the default branch) | HTTPS to any git server. A matching [`ForgeConnection`](/platform-iac/kinds/forge-connection/) is used when there is one; otherwise `credentialRef` names a [`VaultEntry`](/platform-iac/kinds/vault-entry/). |
| `urls` | A list of HTTPS URLs | Each is fetched with `ETag` and `If-Modified-Since`. An entry can pin a `sha256` (the document is refused if it differs) and name a request header whose value comes from a vault entry. |
| `path` | A file or directory, absolute or relative to the config or repository root | Read by the CLI only. The server never fetches it. See [Path sources](#path-sources). |

A fetch reads at most 200 documents, each at most 8 MiB. A source with more reports the rest as errors in its status.

## When it is fetched

`spec.refresh` is an `interval` (a whole number of minutes, hours or days: `30m`, `6h`, `1d`) or `webhook: true`. Left out, the source is fetched every 24 hours. Apply schedules a fetch straight away. A background job ticks every few minutes, so an interval shorter than that is rounded up to the tick. A `webhook` source is fetched when told its documents changed:

```bash
curl -X POST https://www.vulnetix.com/api/site/v1/config/vex-sources/vex-bucket/refresh \
  -H "Authorization: Bearer $VULNETIX_CONFIG_TOKEN"
```

When a fetch fails, `onError` decides: `keep-last` (the default) keeps the suppressions from the last good fetch, and `clear` removes them.

## Scope and trust

- `scope` limits which findings the statements may suppress: `org: true` (the whole tenant, which is also what leaving it out means) or `repos`.
- `trust.allowedAuthors` uses only statements by those authors (the VEX `author` field).

## What plan refuses

The schema accepts these, and plan blocks them with the condition `unsupported`, because applying them would claim an assurance or a scope that is not there:

| Field | Why |
|---|---|
| `trust.requireSignature: true` | The server does not verify signatures on fetched VEX documents. Narrow trust with `trust.allowedAuthors` instead. |
| `scope.products` | Findings do not record the TEA product they belong to, so the scope could not be enforced. Use `scope.repos`. |
| `s3.endpoint` | An S3-compatible store is not supported yet. Use `roleArn` on AWS. |

The Advanced sample on the kind page is the schema's, and it uses `trust.requireSignature` and `scope.products`, so plan blocks it as written. Remove those fields to apply it.

## Path sources

A `path` source plans with the warning `cli_only`: the server shows only the snapshot that is uploaded for it. `POST /config/vex-sources/{name}/snapshot` uploads the documents a path source names, each base64 with the hex SHA-256 of its bytes, and replaces the source's last snapshot, removing the rules for statements that are gone as a fetch would. The CLI does not call it yet: `vulnetix config apply` does not upload a snapshot, and `vulnetix scan` has no flag that reads a `VexSource`. For CI today, commit the VEX to the repository and pass it with [`--vex-file`](/vex/scans/vex-file/).

## Status

A `VexSource` object reports its latest fetch:

| Field | Meaning |
|---|---|
| `status` | `ok`, `partial` (some documents could not be read) or `error` |
| `fetchedAt`, `contentHash` | When it was fetched and a hash of what was read |
| `documentCount`, `statementCount` | What was read |
| `suppressionCount`, `remediatedCount`, `triageCount`, `annotationCount` | What the statements became |
| `skippedCount`, `errors` | Statements and documents passed over, each with the document and a message |

Deleting a `VexSource` removes every rule the source made, then the source.

## Reading the statements

Every VEX statement the tenant holds, in every status including `under_investigation` and `affected`, which never become suppressions, is readable with `GET /v1/vex/statements` (filters `status`, `vulnerabilityId`, `purl`, `repository`). In Terraform it is the `vulnetix_vex_statements` data source. A token needs the `VexSource` or `Suppression` kind. See [Terraform and OpenTofu](/platform-iac/terraform/#data-sources).
