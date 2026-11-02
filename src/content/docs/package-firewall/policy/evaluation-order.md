---
title: Evaluation order
description: The order the Package Firewall checks a package version, what each step returns, and which steps an allow entry waives.
order: 2
sources: [package-firewall/internal/policy/checker.go, package-firewall/internal/handler/curation_gate.go, package-firewall/internal/handler/ecosystem_handler.go, package-firewall/internal/fw/fw.go]
checked: [package-firewall@333285f]
updated: 02 Nov 2026
---

The first matching step decides. Each blocked step returns the status for its reason; see [Block responses](/package-firewall/reference/responses/).

| # | Step | Reason | Status | Allow entry waives it |
|---|---|---|---|---|
| 1 | Deny list entry for the package or version | `denylisted` | `403` | no, deny wins over allow |
| 2 | `allowlist_only` and no allow entry | `not_allowlisted` | `403` | an allow entry is the fix |
| 3 | Known-bad artifact digest (artifact path or metadata) | `malware` | `423` | no |
| 4 | Inline malware scan verdict on metadata | `malware` | `423` | no |
| 5 | Exact-version malware record | `malware` | `423` | no |
| 6 | KEV | `vuln` | `426` | yes |
| 7 | Weaponized exploitation | `vuln` | `426` | yes |
| 8 | Active exploitation | `vuln` | `426` | yes |
| 9 | Public PoC or exploit | `vuln` | `426` | yes |
| 10 | Bad actor | `bad_actor` | `428` | yes, but only an entry with version `*` |
| 11 | CVSS, then EPSS, then CESS threshold | `vuln` | `426` | yes |
| 12 | End of life | `eol` | `422` | yes |
| 13 | Version lag (filtered metadata only) | `eol` | `422` | yes |
| 14 | Cooldown | `cooldown` | `425` (Go) or removed from metadata | yes on Go only |

Then the mode applies: in `warn`, any block from steps 3 to 14 is served as an advisory and logged `WARN`.

## Malware details

- **Wildcard records.** A malware record that covers every version (`*`) is prone to false positives on current, legitimate releases. It never blocks: the request is served with `X-Vulnetix-Firewall: advisory` and an `X-Vulnetix-Firewall-Advisory` header, and logged `WARN`. Later steps still apply.
- **Fail closed.** If the split between exact and wildcard records cannot be computed, the version is blocked as malware.
- **Block malware off.** With `blockMalware = false`, the known-bad digest gate on metadata and the inline scan record a `WARN` with `(not blocked: org policy blockMalware=false)` instead of blocking. The digest gate on artifact paths (OCI blobs, Homebrew bottles) blocks regardless.
- **Community false-positive consensus.** When at least one organization has marked a package version as a malware false positive, every malware gate passes it, for every organization.
- **Whole-catalogue documents.** A malware hit inside a repository-wide index (Homebrew `formula.json`, Helm `index.yaml`, Conda repodata, `APKINDEX`, CRAN `PACKAGES`) is recorded as `WARN` and filtered per entry, so one bad entry does not refuse the whole index.
- **Attributed digests.** When a known-bad digest appears in one package's metadata and the adapter can say which releases carry it, only those releases are blocked.

## Bad actors

When `blockBadActors` is on and the package's maintainer (or a maintainer SSH or GPG key) matches a high or medium confidence threat actor, the whole metadata response returns `428`, not just one version. The headers carry `X-Vulnetix-Firewall-Threat-Actor`, `-Threat-Actor-Url` and `-Linked-Malware`. An allow entry with version `*` suppresses it and the proxy logs `WARN bad-actor block suppressed by org allowlist`. An allow entry for one version does not unblock the whole package.

## Allow-entry scope

Entries carried over from the old bad-actor exceptions table have scope `bad_actor`. They waive step 10 and nothing else. Entries made on the curation lists have scope `full`. See [Allow and deny lists](/package-firewall/curation/lists/).
