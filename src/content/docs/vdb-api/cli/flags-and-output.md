---
title: CLI flags, output and cache
nav: Flags, output and cache
description: The flags every vulnetix vdb command takes, the order credentials are looked up in, output formats and JSON formatting, the local response cache, and retries.
order: 2
sources: [cli/cmd/vdb.go, cli/cmd/root.go, cli/pkg/auth/credentials.go, cli/pkg/auth/auth.go, cli/pkg/vdb/client.go, cli/pkg/vdb/api.go, cli/pkg/vdb/api_v2.go, cli/pkg/cache/cache.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

## Global flags

Every `vulnetix vdb` command takes these.

| Flag | Default | What it does |
|---|---|---|
| `--org-id <uuid>` | | Organisation id. Overrides the environment |
| `--api-key <hex>` | | API key. Overrides `VULNETIX_API_KEY` |
| `--secret <secret>` | | SigV4 secret. Overrides `VVD_SECRET` |
| `--method apikey\|sigv4` | from the flags given | Auth method |
| `--base-url <url>` | `https://api.vdb.vulnetix.com` | API host |
| `-V, --api-version v2\|v1` | `v2` | `v1` is deprecated and prints a notice |
| `-o, --output json\|yaml\|pretty` | `pretty` | Output format. On commands that write files, any other value is a file path |
| `--compact`, `--comfortable`, `--sparse` | `--comfortable` | JSON indent of 2, 4 or 8 spaces. Only with `-o json`, and only one of them |
| `--highlight dark\|light\|none` | `none` | Colour JSON output (monokai or github theme). Only with `-o json`. Ignored when stdout is not a terminal |
| `--no-cache` | | Skip the local cache entirely |
| `--refresh-cache` | | Fetch fresh from the API and rewrite the cache |
| `--no-community` | | Never fall back to the built-in Community key |
| `--reachability both\|direct\|transitive\|off` | `both` | Tree-sitter reachability mode for vulnerability commands. See [Reachability](/vdb-api/cli/commands/#reachability) |
| `-v`, `-vv` | | `-v` adds rate-limit, cache and auth diagnostics on stderr; `-vv` adds raw evidence |
| `--silent` | | Only the final result, no logs |

`vdb` also takes the memory-context flags used by the Vulnetix coding-agent plugins (`--git-branch`, `--github-repo`, `--package-manager`, `--context` and others, and `--disable-memory` to turn them off). They do not change what the API returns.

## Credentials

The CLI uses the first source that has a complete credential:

| Order | Source | Method |
|---|---|---|
| 1 | `--org-id` with `--api-key` or `--secret` | API key or SigV4 |
| 2 | `VULNETIX_API_TOKEN` (with optional `VULNETIX_ORG_ID`) | Bearer API token |
| 3 | `VULNETIX_API_KEY` with `VULNETIX_ORG_ID` | API key |
| 4 | `VVD_ORG` with `VVD_SECRET` | SigV4 |
| 5 | `.vulnetix/credentials.json` in the current directory | Whatever it holds |
| 6 | `~/.vulnetix/credentials.json` | Whatever it holds |
| 7 | netrc entry `machine packages.vulnetix.com` (`~/.netrc`, `%USERPROFILE%\_netrc` on Windows) | API key: `login` is the org id, `password` the key |
| 8 | The built-in Community key | Shared Community quota. `--no-community` disables it |

The credentials file:

```json
{
  "org_id": "your-org-uuid",
  "api_key": "your-api-key-hex",
  "method": "apikey"
}
```

`vulnetix auth login` writes it with mode `0600`. With `--store keyring`, the secret goes into the OS keychain and the file keeps only metadata. A netrc file that is readable by other users is rejected; `chmod 600 ~/.netrc`.

`vulnetix auth status` shows which source wins and every source it found.

## Output

Data goes to stdout; progress, warnings and rate-limit notes go to stderr. Redirect them separately:

```bash
vulnetix vdb vuln CVE-2021-44228 -o json > vuln.json                # data to a file, logs on screen
vulnetix vdb vuln CVE-2021-44228 -o json > vuln.json 2> vdb.log     # both to files
vulnetix vdb vuln CVE-2021-44228 -o json --silent | jq '.[0].cveMetadata'
```

| `-o` | Output |
|---|---|
| `pretty` | Human-readable summary (default) |
| `json` | The API's JSON, re-indented. Takes the indent and highlight flags |
| `yaml` | The same data as YAML |
| A path | On commands with `-o <file>` in [their flags](/vdb-api/cli/commands/), writes the response body to that file |

Several list commands also have `--format`, which selects the content, not the encoding: `rules` for raw Snort or YARA rule text, `csv` or `stix` for IOCs, `csv` for KEV and triage, and per-tool formats for virtual patches and countermeasures.

## Local cache

Responses are cached on disk under `~/.vulnetix/cache/vdb/v<major>.<minor>/`, one directory per CLI minor version.

| What | Kept for |
|---|---|
| Enumerations: `/sources`, `/metric-types`, `/exploit-sources`, `/exploit-types`, `/fix-distributions`, `/summary`, `/ecosystems` | 1 hour |
| Paginated lists | 5 minutes |
| Affected-version records for an advisory | 10 minutes |

A cached answer costs no API quota. `--refresh-cache` ignores what is cached and stores the new answer; `--no-cache` neither reads nor writes. `vulnetix vdb cache clear` deletes everything.

## Retries and timeouts

| Condition | Behaviour |
|---|---|
| `429`, `502`, `503`, `504` | Retried at most twice. Waits for `Retry-After`, else `RateLimit-Reset` (which for a `429` can be hours) |
| Connection timeout, refused or reset | Retried at most twice |
| `429` on your own key | Retried once at once with the built-in Community key, unless `--no-community` |
| SigV4 JWT expired | A new JWT is fetched; the 15-minute token is cached until its `exp` |
| Other `4xx` | Not retried |

## Exit codes

| Code | Meaning |
|---|---|
| `0` | The command completed |
| `1` | Any error: bad flags, no credential, an API error after retries |
