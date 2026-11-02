---
title: vdb_request
description: The read-only escape hatch for vdb-api endpoints no dedicated tool covers, with its full path allowlist, size cap and truncation behaviour.
order: 7
sources:
  - mcp-server/src/tools/raw.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

`vdb_request` sends a `GET` to a vdb-api read endpoint and returns the body unshaped. It exists so an agent can reach a new endpoint the day it ships, without waiting for a server release. Use a dedicated tool when there is one: unshaped bodies can be megabytes.

## Parameters

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `path` | string, required | | Below the version segment, starting with `/`, matching an allowed prefix |
| `query` | object of string to string | none | Query string parameters |
| `version` | `v1` or `v2` | `v2` | |
| `maxBytes` | integer 1024 to 1048576 | 262144 | Above this the body is truncated |

```json
{ "path": "/eol/products/nodejs" }
```

```json
{ "path": "/vuln/CVE-2021-44228/sightings", "query": { "limit": "5" } }
```

## Truncation

When the serialised body is longer than `maxBytes`, the result is:

```json
{ "truncated": true, "bytes": 2606571, "cap": 262144, "preview": "{\"..." }
```

with `_meta["vulnetix/truncated"]: true`. The cache TTL for every `vdb_request` call is 300 seconds.

## Allowed path prefixes

A path must start with one of these:

```text
/vuln/                /exploits             /kev                  /iocs
/sightings            /attack-techniques    /snort-rules          /yara-rules
/nuclei               /vex                  /triage               /advisories
/workarounds          /affected             /cwe-guidance         /scorecard
/cloud-locators       /packages             /search/              /summary
/sources              /ecosystems           /product/             /eol/
/metric-types         /exploit-sources      /exploit-types        /fix-distributions
/fixes/               /identifiers          /gcve                 /msrc/
/timeline             /vendor-trends        /exploit-trends       /malware-campaigns
/malware-trends       /ai-discoveries       /ai-assisted-exploits /ai-in-wild-exploitations
/ai-generated-malware /vulnetix-kev         /raw/                 /purl/
```

Anything else returns an error result that lists the allowed prefixes.

> [!WHY] Why the allowlist
> The caller controls the path, the server attaches a real credential, and the request leaves from inside Cloudflare's network. A free-form path would make the tool a server-side request forgery primitive. The CLI-only `/cli.*` routes (several change organisation state), the `/auth/*` credential routes and every non-GET method are unreachable.

`vdb_request` uses the same credential, quota reporting, size guards and 12-call budget as every other tool.

If you call it often for the same endpoint, that is a missing tool: [open an issue](https://github.com/Vulnetix/mcp-server/issues).
