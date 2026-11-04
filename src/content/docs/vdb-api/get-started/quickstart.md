---
title: VDB API quickstart
nav: Quickstart
description: Get an organisation id and API key, store them for the CLI, check they authenticate, and run your first vulnerability, package and exploit lookups with the CLI and with curl.
order: 2
sources: [cli/pkg/auth/credentials.go, cli/pkg/auth/auth.go, cli/cmd/vdb.go, vdb-site/api/internal/handler/account.go, vdb-site/api/internal/handler/tierconfig.go, website/src/pages/resolve/account.vue]
checked: [cli@4c8c3b71c, vdb-site@1a06d67, website@ad775f37, vdb-api@4145f0a]
updated: 02 Nov 2026
---

## 1. Get credentials

Register for a free Community account at [vulnetix.com/resolve/register](https://www.vulnetix.com/resolve/register). Its daily quota is 50 requests. Paid plans and higher limits are on [vulnetix.com/pricing](https://www.vulnetix.com/pricing).

Your credentials are on the console's [Account page](https://www.vulnetix.com/resolve/account):

| Value | Looks like | Used for |
|---|---|---|
| Org ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Every credential method |
| API Key | `<orgId>:<64 hex characters>` | The `ApiKey` header. The console shows it with the org id already in front |
| Secret | A random string | SigV4 signing. The API key is HMAC-SHA256 of the org id, keyed with this secret |

> [!CAREFUL] The API key already contains your org id
> The console shows the key as `<orgId>:<hex>`, which is exactly what goes after `ApiKey ` in the header. If you build the header yourself as `ApiKey $ORG:$KEY` from that value, the org id appears twice and the API answers `401 {"error":"Invalid API key"}`. Use only the hex part in `VULNETIX_API_KEY`. The CLI strips a duplicated `<orgId>:` prefix itself; curl and your own code do not.

## 2. Store them for the CLI

The quickest way is the browser sign-in:

```bash
vulnetix auth login
```

With a key you already have, and no browser:

```bash
vulnetix auth login --org-id "$VULNETIX_ORG_ID" --api-key "$VULNETIX_API_KEY" --noninteractive
```

This writes `~/.vulnetix/credentials.json` (mode `0600`). `--store project` writes `.vulnetix/credentials.json` in the current directory instead, and `--store keyring` keeps the secret in the OS keychain and only metadata on disk.

In CI, set environment variables instead:

```bash
export VULNETIX_ORG_ID="your-org-uuid"
export VULNETIX_API_KEY="your-api-key-hex"
```

The full list of credential sources, and the order the CLI tries them in, is in [CLI flags, output and cache](/vdb-api/cli/flags-and-output/#credentials).

## 3. Check they work

```bash
vulnetix auth status    # which credential source wins, and every source found
vulnetix auth verify    # makes an authenticated call
vulnetix vdb status     # CLI version, API health, auth method and result
```

With curl, an authenticated route that returns quickly is a good probe. `401` means the key is wrong; `200` means it is accepted:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}" \
  https://api.vdb.vulnetix.com/v2/ecosystems
```

## 4. First queries

Look up a vulnerability by any advisory id. CVE, GHSA, PYSEC, RUSTSEC, GO, RHSA, DSA, USN and many more are accepted:

```bash
vulnetix vdb vuln CVE-2021-44228
vulnetix vdb vuln GHSA-jfh8-c2jp-5v3q
vulnetix vdb vuln RHSA-2025:1730
```

Find what affects a package, or a specific version of it:

```bash
vulnetix vdb vulns express
vulnetix vdb purl pkg:npm/express@4.17.1
vulnetix vdb advisories pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1
```

Exploits, fixes and KEV status for one CVE:

```bash
vulnetix vdb exploits CVE-2021-44228
vulnetix vdb fixes CVE-2021-44228
vulnetix vdb kev get CVE-2021-44228
```

The same three calls with curl:

```bash
AUTH="Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}"
curl -s -H "$AUTH" "https://api.vdb.vulnetix.com/v2/exploits/CVE-2021-44228?limit=10"
curl -s -H "$AUTH" "https://api.vdb.vulnetix.com/v2/vuln/CVE-2021-44228/fixes/registry"
curl -s -H "$AUTH" "https://api.vdb.vulnetix.com/v2/vuln/CVE-2021-44228/kev"
```

## Next

- [Authentication](/vdb-api/api/authentication/): the header forms, SigV4 and JWTs.
- [Rate limits](/vdb-api/api/rate-limits/): how the daily quota is counted.
- [Recipes](/vdb-api/cli/recipes/): CI gates, bulk lookups and jq filters.
