---
title: Block responses and status codes
nav: Block responses
description: Every HTTP status the Package Firewall returns, the block reasons behind them, the JSON body, and the X-Vulnetix-Firewall response headers.
order: 1
sources: [package-firewall/internal/fw/fw.go, package-firewall/internal/handler/ecosystem_handler.go, package-firewall/internal/handler/proxy.go, package-firewall/internal/policy/checker.go, package-firewall/.repo/maintenance_mode.md]
checked: [package-firewall@333285f]
updated: 02 Nov 2026
---

A block returns the same status, body and headers for every ecosystem. Most package managers show only the status code; the headers carry the reason.

## Block statuses

| Status | Reason | Meaning | What to do |
|---|---|---|---|
| `423 Locked` | `malware` | The version is flagged malicious, or an artifact digest is known bad. | Do not use it. |
| `426 Upgrade Required` | `vuln` | KEV, weaponized, active, PoC, or a CVSS, EPSS or CESS threshold. | Move to a fixed version. |
| `428 Precondition Required` | `bad_actor` | The maintainer, a maintainer key or a CVE is linked to a threat actor. | Review; an allow entry with version `*` lifts it. |
| `425 Too Early` | `cooldown` | Published inside the cooldown window (Go only). `Retry-After` gives the seconds left. | Wait, or pin an older version. |
| `422 Unprocessable Content` | `eol` | End of life, or more than the version lag behind the newest. Also any unmapped reason. | Move to a supported version. |
| `403 Forbidden` | `denylisted` | The package or version is on your deny list. | Ask whoever owns curation. |
| `403 Forbidden` | `not_allowlisted` | The ecosystem is in `allowlist_only` and the package has no allow entry. | Request an allow entry. |
| `402 Payment Required` | `plan` | The ecosystem is not in your plan. | Upgrade; see [pricing](https://www.vulnetix.com/pricing). |

In filtered ecosystems a blocked version is usually removed from the metadata, so a normal resolve never sees an error. You get the status when you request that exact version, for example from a lockfile.

### malware

Exact-version malware records, known-bad artifact digests and inline malware-scan verdicts. A record that covers every version (`*`) does not block; it is served as an advisory and logged `WARN`.

### vuln

The message names the signal, for example `package CVE is in CISA KEV or VulnCheck KEV` or `CVSS score 9.8 meets or exceeds threshold 8.0`.

### bad_actor

For a maintainer match the whole package's metadata is refused, with `X-Vulnetix-Firewall-Threat-Actor`, `-Threat-Actor-Url` and `-Linked-Malware`.

### cooldown

Message: `Package published <RFC 3339 time> is within <N> days cooldown period`. Headers include `-Published-At`, `-Cooldown-Days` and `-Retry-After`.

### eol

`package version is end-of-life`, or `version is more than <N> releases behind the latest` for version lag.

### denylisted

`package is on the organization denylist`. Applies in every enforcement mode.

### not_allowlisted

`package is not on the organization allowlist (allowlist-only mode)`.

### plan

`<Ecosystem> firewall requires a <tier> plan`. The body adds `"upgrade": "/pricing"`.

## JSON body

```json
{
  "error": "blocked by policy",
  "reason": "CVSS score 9.8 meets or exceeds threshold 8.0",
  "details": { "module": "example", "version": "2.0.0", "cvss": 9.8, "epss": 0.00452, "cess": 0 }
}
```

A plan block has `"error": "upgrade required"` and `"upgrade": "/pricing"`.

## Other statuses

| Status | Meaning |
|---|---|
| `401 Unauthorized` | No `Authorization` header, an unparseable one, or wrong or inactive credentials. Carries `WWW-Authenticate: Basic realm="Vulnetix Package Firewall"`. |
| `404 Not Found` | The adapter does not recognise the path, or the upstream said `404`. |
| `410 Gone` | Passed through from upstream. |
| `500 Internal Server Error` | The organization config could not be loaded, or an upstream body could not be read. |
| `502 Bad Gateway` | No active mirror answered. Body `{"error": "upstream fetch failed", "reason": "..."}`. |
| `503 Service Unavailable` | `Authentication backend unavailable`. Retry. |

## Response headers

Set on every block and every advisory. Values are single-line ASCII, at most 1024 characters.

| Header | Example | Present |
|---|---|---|
| `X-Vulnetix-Firewall` | `blocked` or `advisory` | always |
| `X-Vulnetix-Firewall-Reason` | `malware` | always |
| `X-Vulnetix-Firewall-Status` | `423` | always |
| `X-Vulnetix-Firewall-Message` | `package is flagged as malicious` | always |
| `X-Vulnetix-Firewall-Docs` | link to the reason's explanation | always |
| `X-Vulnetix-Firewall-Package` | `node` | when known |
| `X-Vulnetix-Firewall-Version` | `26.3.1` | when known |
| `X-Vulnetix-Firewall-Ecosystem` | `homebrew-bottle` | when known |
| `X-Vulnetix-Firewall-Cvss`, `-Epss`, `-Cess` | `9.8` | score-based decisions |
| `X-Vulnetix-Firewall-Digest` | `sha256:...` | known-bad digest |
| `X-Vulnetix-Firewall-Required-Tier`, `-Plan` | `enterprise`, `pro` | `402` |
| `X-Vulnetix-Firewall-Published-At`, `-Cooldown-Days` | `2026-10-30T09:12:00Z`, `7` | `425` |
| `X-Vulnetix-Firewall-Retry-After` | `86400` | `425`, alongside `Retry-After` |
| `X-Vulnetix-Firewall-List-Entry`, `-List-Version` | entry ID, `*` | a curation entry matched |
| `X-Vulnetix-Firewall-Threat-Actor`, `-Threat-Actor-Url`, `-Linked-Malware` | | bad-actor block |
| `X-Vulnetix-Firewall-Advisory` | `wildcard malware advisory (informational, not blocked)` | advisories only |

On every response, blocked or not:

| Header | Present |
|---|---|
| `X-Vulnetix-Firewall-Mode` | the effective mode is `warn` or `allowlist_only` |
| `X-Maintenance-Mode`, `X-Vulnetix-Maintenance`, `X-Vulnetix-Maintenance-Impact`, `X-Vulnetix-Maintenance-Message` | during a maintenance window |

## CLI exit codes

`vulnetix package-firewall <ecosystem>` and `uninstall` exit `0` when the config was written, was already current, or `--dry-run` finished. They exit `1` on any error; see [CLI commands](/package-firewall/reference/commands/#exit-codes).
