---
title: VEX sent to Vulnetix
description: Which commands send VEX documents to /v2/cli.vex-ingest, how the server turns false-positive and won't-fix statements into suppression rules, and the limits, response fields and identity that go with each request.
order: 3
sources: [cli/cmd/vex_ingest.go, cli/pkg/vdb/api_cli_vex_ingest.go, cli/cmd/suppress_report.go, cli/pkg/vdb/identity_header.go, cli/internal/ghactx/oidc.go, vdb-api/internal/handler/v2_cli_vex_ingest.go, vdb-sca-match/suppression/ingest.go, vdb-cyclonedx/vexrules/classify.go]
checked: [cli@v4.2.0, vdb-api@4145f0a, vdb-sca-match@ec6757e, vdb-cyclonedx@eaf787c]
updated: 02 Nov 2026
---

When a command is authenticated, the VEX documents it read or wrote are sent, unchanged, to `POST /v2/cli.vex-ingest`. The server stores each one and classifies every statement. The CLI does not classify anything; it reports what the server did.

Sending is best effort. An unauthenticated run sends nothing, and a failed send prints a warning; it never fails the command.

```text
  VEX sent to Vulnetix: 2 document(s), 3 rule(s) created, 1 waiting for review, 0 linked, 7 finding(s) suppressed
```

## What is sent, and by which command

| Origin | Sent by | Documents |
|---|---|---|
| `scan_vex_file` | `scan`, `sca` and the other scan commands with `--vex-file`, `--vex` or a declared `VexSource`; `vex apply --upload` | The VEX documents the scan applied, including ones fetched from a URL |
| `reconcile` | A scan's reconciliation | The VEX files the scan wrote under `.vulnetix/` |
| `bom_enrich` | `bom enrich --vex` | The VEX files you passed |
| `upload` | `vulnetix upload` of an OpenVEX or CSAF file | The uploaded file |
| `bom_analysis` | `vulnetix gha upload` | A third-party CycloneDX document among the workflow artifacts that carries vulnerability analysis |
| `triage` | `vulnetix triage` | The VEX file triage wrote |
| `defend` | `vulnetix defend` | `.vulnetix/vex-compensating-controls.json` |
| `jail` | `vulnetix jail` | The jail verdict VEX |

Before sending, the CLI drops a document that is not OpenVEX, CycloneDX or CSAF, drops one over 8 MiB, and drops exact duplicates by SHA-256. It sends at most 10 documents per request and splits larger sets. Each request has a 60 second timeout. A document's path is sent relative to the repository root when it is inside the repository, otherwise as its base name.

## How the server classifies a statement

| Format | Statement | Result |
|---|---|---|
| CycloneDX | `analysis.state: false_positive` | False-positive rule, active |
| CycloneDX | state `exploitable` or none, `response` includes `will_not_fix` | Won't-fix rule, active |
| CycloneDX | state `exploitable` or none, `response` includes `can_not_fix` and not `workaround_available` | Won't-fix rule, active |
| CycloneDX | `will_not_fix` or `can_not_fix` together with `update` or `rollback` | Conflict: no rule |
| CycloneDX | `not_affected`, `resolved`, `resolved_with_pedigree`, `exploitable` | Evidence on the finding's triage, no rule |
| CycloneDX | `in_triage`, or no state and no deciding response | Undecided, no rule |
| OpenVEX | `not_affected` with justification `component_not_present` | False-positive rule, active |
| OpenVEX | `not_affected` with any other justification, or `fixed` | Evidence, no rule |
| OpenVEX | `affected` whose `action_statement` says it will not be fixed ("will not fix", "won't fix", "no fix planned", "risk accepted" and similar) | Won't-fix rule, pending review |
| OpenVEX | `affected` otherwise | Evidence, no rule |
| OpenVEX | `under_investigation` | Undecided, no rule |
| CSAF | `known_not_affected` with flag `component_not_present` | False-positive rule, active |
| CSAF | `known_affected` with remediation `no_fix_planned` | Won't-fix rule, active |
| CSAF | `known_affected` with remediation `none_available` and no `vendor_fix`, `workaround` or `mitigation` | Won't-fix rule, active |
| CSAF | `known_affected` with both `no_fix_planned` and `vendor_fix` | Conflict: no rule |
| CSAF | `known_not_affected` otherwise, `known_affected` otherwise, `fixed`, `first_fixed` | Evidence, no rule |
| CSAF | `under_investigation` | Undecided, no rule |

A rule is scoped to the statement's vulnerability and package, and to the repository the document came from. A won't-fix that only prose expressed waits on the Suppression Policies page until someone approves it.

Also:

- A statement that carries one of your organisation's own rule markers links to that rule instead of creating another.
- A newer statement replaces an older VEX-created rule for the same vulnerability, product and repository.
- VEX never changes a rule a person made in the console or with `vulnetix ignore`.
- The community tier stores nothing: each document comes back with the error `VEX is not stored for the community tier`.

## Response

One result per document:

| Field | Meaning |
|---|---|
| `path`, `format` | The document, and the format the server detected |
| `openVexUuid`, `artifactUuid` | The stored record and file |
| `grounded` | The document was tied to one of your scanner runs |
| `statements` | Statements read |
| `created` | Rules written |
| `pending` | Rules waiting for review |
| `linked` | Statements that named one of your rules |
| `superseded` | Older VEX rules this document replaced |
| `triaged` | Findings whose triage took a VEX state as evidence |
| `applied` | Findings the new rules now cover |
| `error` | Why this document was not ingested |

A bad document is reported in its own `error`, and the others in the request are still ingested. Errors the server returns for one document include `sha256 does not match content`, `not an OpenVEX, CycloneDX or CSAF VEX document`, and `format says X but the document is Y`.

### Whole-request errors

| HTTP status | When |
|---|---|
| `400` | `origin` not one of the eight above, no documents, more than 10 documents, or an unreadable body |
| `401` | No authenticated organisation |
| `403` | The organisation is not provisioned |
| `503` | Persistence is not configured on the server |

## Who ran it

Every `/v2/cli.*` request carries what the CLI can tell about the person or job: git `user.name` and `user.email`, the HEAD commit author, the OS account and host, the GitHub Actions actor, and, in a workflow with `permissions: id-token: write`, a GitHub Actions OIDC token for audience `vulnetix` in the `X-Vulnetix-GHA-OIDC` header. The server verifies the token and the API key and records each identity on the rule, with the strongest one it could verify as the actor. The token is never put in a body or a log.

```yaml
permissions:
  contents: read
  id-token: write
```

A triage decision the CLI records, in `.vulnetix/memory.yaml` and as the OpenVEX `author`, follows the same order. Signed in, it names your account as `vulnetix:<account id>`, including the defaults the Vulnetix provider picks for you. Only an unauthenticated run falls back to your git `user.email`, or `user@host` when git has none. The embedded community key names no account.

## Local suppressions

Findings an ignore rule or nosec comment hid are not VEX. They are reported in `localSuppressions` on the run's `cli.finalize` call. See [nosec comments and test code](/vex/suppression/nosec-and-test-code/).
