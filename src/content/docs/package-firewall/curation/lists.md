---
title: Allow and deny lists
description: How Package Firewall allow and deny entries match packages and versions, namespace entries for your own packages, and what an allow entry waives.
order: 1
sources: [package-firewall/internal/types/types.go, package-firewall/internal/policy/checker.go, package-firewall/internal/handler/curation_gate.go, package-firewall/internal/handler/proxy.go, vdb-site/api/internal/handler/package_firewall_namespaces.go, vdb-site/api/internal/handler/package_firewall_lists.go, saas/prisma/models/package-firewall.prisma]
checked: [package-firewall@77cd1a5, vdb-site@1a06d67, saas@50cedf37]
updated: 02 Nov 2026
---

Each organization has one allow list and one deny list, curated on the console's **Curation** tab at [www.vulnetix.com/resolve/package-firewall](https://www.vulnetix.com/resolve/package-firewall#curation). There is no CLI for them yet.

## Entry fields

| Field | Values | Notes |
|---|---|---|
| `listType` | `allow`, `deny` | |
| `ecosystem` | an [ecosystem ID](/package-firewall/#ecosystems) | `go`, `npm`, `maven`, ... |
| `packageName` | the name as the ecosystem's requests carry it | npm `@scope/name`, Maven `groupId:artifactId`, Go module path, Terraform `namespace/name`, Julia package UUID |
| `version` | exact version or `*` | default `*`, every version |
| `scope` | `full`, `bad_actor` | `bad_actor` waives only the bad-actor block; it exists for entries migrated from the old exceptions table |
| `reason` | free text | shown in the audit trail |
| `isActive` | bool | an inactive entry is ignored |

One entry per `(list, ecosystem, packageName, version)`.

## Matching

- An exact-version entry wins over a `*` entry for that version.
- Versions match with or without a leading `v`: an entry for `1.2.3` matches a Go request for `v1.2.3`.
- A check with no version in hand (the whole-package gates, such as the bad-actor gate and the allowlist-only gate) matches only a `*` entry, so allowing `evil@1.2.3` does not unblock all of `evil`.
- A package on both lists is blocked. The deny list is checked first, in every mode, including `warn`.

## Namespace entries

An allow entry whose package name ends in `/*` or `:*` covers every package under that prefix, at every version. Use it for packages your organization publishes.

| Ecosystem | Entry | Covers | Does not cover |
|---|---|---|---|
| Go | `github.com/acme/*` | `github.com/acme/tool`, `github.com/acme/tool/v2` | `github.com/acme-evil/tool` |
| npm | `@acme/*` | `@acme/widget` | `@acme-evil/widget` |
| Maven | `com.acme:*` | `com.acme:core` | `com.acme.evil:core` |

| Rule | Error when broken |
|---|---|
| `*` only as a final `/*` or `:*` | `packageName may contain * only as a final "/*" or ":*", for example github.com/acme/* or @acme/*` |
| Allow list only | `a namespace entry (ending in /* or :*) can only be on the allow list` |
| Version must be `*` | `a namespace entry covers every version of every package under it; leave version as *` |
| A Go namespace needs a host and an owner | `a Go namespace needs a host and an owner, for example github.com/acme/*` |

- The prefix ends at a `/` or `:`, so a look-alike namespace never matches.
- An entry for the package itself wins over a namespace entry, and a longer namespace wins over a shorter one (`github.com/acme/tool/*` before `github.com/acme/*`).
- Deny entries are exact names only, because the deny paths look packages up by exact name.

## What an allow entry waives

| Block | Waived by a `full` allow entry |
|---|---|
| CVSS, EPSS and CESS thresholds | yes |
| KEV, weaponized, active, PoC | yes |
| Bad actor | yes, if the entry's version is `*` |
| End of life | yes |
| Version lag | yes |
| Cooldown on Go | yes |
| Cooldown on other ecosystems | yes, if the entry covers every version: the package's own `*` entry or a namespace entry. An entry for one exact version still waits out the window, because the metadata filter drops versions without reading per-version entries. |
| `allowlist_only` refusal | yes, that is its purpose |
| Exact-version malware record | no |
| Known-bad artifact digest | no |
| Inline malware scan verdict | no |
| Deny entry | no |

> [!WHY] Why an allow entry never overrides malware
> Allowing a package because a CVSS score was a false positive is a different claim from vouching for a release the VDB says is malicious. Only the first was made. The community malware false-positive consensus is the override for the second.

> [!CAREFUL] Namespace entries and the cooldown
> A namespace entry such as `github.com/acme/*` lets a release you cut an hour ago through the cooldown on Go. On npm (`@acme/*`) and the other filtered ecosystems it does not today: the version is still removed from the metadata until the cooldown passes. Maven has no cooldown, so `com.acme:*` only matters for the other rules.

## Usage tracking

The proxy stamps `lastUsedAt` on an entry when live traffic matches it, at most once every 5 minutes per entry, and not during maintenance windows. Matched requests also carry `X-Vulnetix-Firewall-List-Entry` (the entry ID) and `X-Vulnetix-Firewall-List-Version` (the version the entry matched). The console uses `lastUsedAt` for the **Flag an entry unused after** review.
