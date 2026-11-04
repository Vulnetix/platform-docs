---
title: Policy settings
description: Every Package Firewall policy setting, its CLI flag, API field and default, plus enforcement modes, cooldown coverage and version lag.
order: 1
sources: [saas/prisma/models/package-firewall.prisma, cli/cmd/config.go, vdb-site/api/internal/handler/package_firewall.go, vdb-site/api/internal/handler/package_firewall_lists.go, package-firewall/internal/types/types.go, package-firewall/internal/policy/checker.go, package-firewall/internal/handler/ecosystem_handler.go, package-firewall/internal/handler/proxy.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [package-firewall@77cd1a5, cli@4c8c3b7, vdb-site@1a06d67, saas@50cedf37]
updated: 03 Nov 2026
---

One policy per organization applies to every ecosystem your organization can use (the free ones and, with the Package Firewall add-on, the rest). Set it in the Resolve Platform at [www.vulnetix.com/resolve/package-firewall](https://www.vulnetix.com/resolve/package-firewall) on the **Policies** tab, or with `vulnetix config set package-firewall`. The proxy picks up a change within 60 seconds.

## Settings

| Setting | CLI flag | API field | Type | Default | Blocks a version when |
|---|---|---|---|---|---|
| CVSS threshold | `--cvss-threshold` | `cvssThreshold` | `0` to `10` | `0` (off) | the highest CVSS base score of a matching CVE is at or above the value |
| EPSS threshold | `--epss-threshold` | `epssThreshold` | `0` to `1` | `0` (off) | the highest EPSS probability is at or above the value |
| CESS threshold | `--cess-threshold` | `cessThreshold` | `0` to `10` | `0` (off) | the highest Coalition ESS score is at or above the value |
| Block malware | `--block-malware` | `blockMalware` | bool | `false` | the version is a known malicious package (exact-version match) |
| Block KEV | `--block-kev` | `blockKev` | bool | `false` | a CVE is in CISA KEV or VulnCheck KEV |
| Block weaponized | `--block-weaponized-exploits` | `blockWeaponized` | bool | `false` | VulnCheck canaries report weaponized exploitation |
| Block active | `--block-active-exploits` | `blockActive` | bool | `false` | CrowdSec reports active exploitation sightings |
| Block PoC | `--block-poc-exploits` | `blockPoc` | bool | `false` | a public proof of concept or exploit record exists |
| Block bad actors | `--block-bad-actors` | `blockBadActors` | bool | `false` | the maintainer, a maintainer key or a CVE is linked to a known threat actor |
| Block EOL | `--block-eol` | `blockEol` | bool | `false` | the version is end of life |
| Cooldown (days) | `--cooldown-days` | `cooldownDays` | int `>= 0` | `0` (off) | the version was published fewer than N days ago |
| Version lag | `--version-lag` | `versionLag` | int `>= 0` | `0` (off) | the version is more than N releases behind the newest |
| Enforcement mode | console only | `enforcementMode` | `enforce`, `warn`, `allowlist_only` | `enforce` | see below |
| Re-review a decision after | console only | `staleDecisionDays` | int | `90` | console flags an allow or deny entry for review |
| Flag an entry unused after | console only | `staleUsageDays` | int | `90` | console flags an entry with no matching traffic |

The order these are checked in, and what an allow entry waives, is on [Evaluation order](/package-firewall/policy/evaluation-order/). The two review settings are read by the console only; see [Review and audit](/package-firewall/curation/review/).

## Enforcement modes

| Mode | Behaviour |
|---|---|
| `enforce` | Block what the rules say to block. |
| `warn` | Every block is downgraded to an advisory: the request is served, logged as `WARN` with `(warn mode: reported, not blocked)`, and the `X-Vulnetix-Firewall-*` headers still name the reason. A deny-list hit still blocks. Version lag is not applied. |
| `allowlist_only` | A package with no allow entry at any version returns `403 not_allowlisted`. A package with some allow entries is served with only the allowed versions surviving. |

- Any value the proxy does not recognise is read as `enforce`.
- `allowlist_only` with an empty allow list is read as `enforce`, because it would refuse every package.
- Any mode other than `enforce` adds `X-Vulnetix-Firewall-Mode: <mode>` to every response, so `curl -v` shows whether an org is enforcing.

### Per-ecosystem mode

An ecosystem can override the org mode, for example `npm` in `allowlist_only` while `go` stays in `warn`. Set it in the console. The console calls `PUT package-firewall/ecosystem-policy` on the Vulnetix API with `{"ecosystem": "npm", "enforcementMode": "allowlist_only"}`; `"enforcementMode": null` clears the override and the ecosystem inherits the org mode.

## Cooldown

Cooldown holds back new releases for N days, as a quarantine against compromised or mistaken publishes. Where it applies depends on how the ecosystem is served:

| Ecosystems | How cooldown works |
|---|---|
| Go | `@v/<version>.info` returns `425 Too Early` with `Retry-After` (seconds left) and `X-Vulnetix-Firewall-Published-At`. An allow entry for the module or its namespace waives it. |
| npm, PyPI, Cargo, RubyGems, pub.dev, NuGet, Composer, Helm, Chef, AUR | Versions inside the window are removed from the metadata and logged as `BLOCK` with `within cooldown window`. The resolver picks an older version. |
| Every other ecosystem | Not enforced: either the registry has no publish time (Maven, CRAN, Conan, Julia, Terraform, Homebrew, OS and container ecosystems) or the ecosystem is gated rather than filtered (Hex, Conda). |

> [!CAREFUL] Cooldown and pinned versions outside Go
> In filtered ecosystems the cooldown only edits metadata. A lockfile that already pins a version inside the window downloads it, because artifact requests are not checked against the cooldown. An allow entry that covers every version of a package (its own `*` entry or a namespace entry) turns the metadata cooldown off for that package; an entry for one exact version does not.

## Version lag

Version lag keeps a package close to its newest release. With `versionLag = 2`, the newest version and the two before it are allowed and everything older is removed from the metadata, with reason `version is more than 2 releases behind the latest` (status `422`, reason `eol`, on a direct request).

- Enforced only by adapters that can list a package's versions: npm, Maven, Homebrew and the pkg.go.dev API. For other ecosystems the proxy logs that the rule was not enforced.
- Not applied in `warn` mode.
- A version already blocked for another reason keeps that reason. An allow entry for the version waives the lag.

The Quality Gate has a setting with the same name and the opposite meaning; see [Quality Gate settings](/quality-gates/gate/settings/).

## CLI

```bash
vulnetix config set package-firewall \
  --cvss-threshold 8.0 \
  --block-malware true \
  --block-kev true \
  --cooldown-days 7
vulnetix config get package-firewall
vulnetix config get package-firewall -o json
```

Each call is a partial update: only the flags you pass change. Boolean flags take an explicit value (`--block-malware=false`). The organization comes from your session; see [CLI commands](/package-firewall/reference/commands/) for every flag.
