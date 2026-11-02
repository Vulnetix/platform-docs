---
title: vulnetix defend
description: Read the virtual patches and countermeasures for an advisory, save them as the file your tool loads, and record a compensating control.
order: 1
nav: defend
sources: [cli/cmd/defend.go, cli/internal/defences/defences.go, cli/internal/defences/stack.go, cli/internal/defences/vdbsource.go, cli/internal/defences/control.go, cli/internal/scanopts/surface.go, cli/cmd/exit_codes.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

```bash
vulnetix defend <advisory-id> [flags]
```

`<advisory-id>` is any advisory identifier the database knows (CVE, GHSA and other families, widened through aliases). Exactly one is required.

## Flags

| Flag | Default | Description |
|---|---|---|
| `--path` | `.` | Project directory whose last scan and repository are read |
| `--for` | none | Save rules. A comma-separated list of formats (table below), `fits` for every format the repository suggests, or `all` |
| `-O`, `--output-dir` | `defences` | Directory the rule files are written to |
| `--record` | none | Record that a control is in place, in your own words, e.g. `"ModSecurity, prod-eu ingress"` |
| `--until` | 90 days from now | Date the recorded control expires, `YYYY-MM-DD`. The control lasts through that day. Must be in the future. |
| `--mode` | the rule's own `deployMode` | Mode the recorded rule runs in: `block` or `log` |
| `--lane` | none | `block` or `detect`, when recording without `--for` |
| `--package` | from the last scan | Package the control covers. Required when the last scan does not list the advisory on any package. |

Display flags, the same as `vulnetix report`: `--view`, `--filter`, `--min-severity`, `--sort`, `--show`, `--hide`, `-q`/`--quiet`, `--explain`, `--color`, `--ascii`, `--width`. Global flags (`--org-id`, `-v`, `--silent` and the rest) apply too.

### `--for` values

| Value | Lane | Saved as |
|---|---|---|
| `cloudflare` | block | `<id>-cloudflare-expression.txt` |
| `aws-waf` | block | `<id>-wafv2-rule.json` |
| `snort` | block | `<id>-local.rules` |
| `suricata` | block | `<id>-suricata.rules` |
| `modsecurity` | block | `<id>-modsecurity.conf` |
| `nginx` | block | `<id>-nginx-waf.conf` |
| `regex` | block | `<id>-pattern.txt` |
| `sigma` | detect | `<id>-sigma.yml` |
| `yara` | detect | `<id>-rule.yar` |
| `stix` | detect | `<id>-bundle.json` |
| `openioc` | detect | `<id>-ioc.xml` |
| `fits` | both | every format the repository suggests |
| `all` | both | every rule found |

The upper-case kind names (`MODSECURITY`, `AWS_WAF` and so on) are accepted too.

## What it prints

```text
 legacy-xml 3.1.4 · CVE-2025-12345 · no fix

 BLOCK · 2 virtual patches · they stop the request
 ──────────────────────────────────────────────────────────────────
 ModSecurity      confidence HIGH   start in log only   false positives low
                  ▸ fits your repo  docker/modsec/rules.conf:1 · inferred, not verified as deployed
                  coverage  Matches the public proof of concept. Does not match encoded variants.

 DETECT · 1 countermeasure · it tells you it happened
 Detection is not prevention. It does not stop the exploit.
```

On Pro, each rule also shows a `console` link to its catalogue entry.

### Fits your repo

Formats are marked *fits your repo* from literal markers in the project. Up to 4,000 files of at most 512 KiB are read; `.git`, `node_modules`, `vendor`, `.vulnetix`, `.terraform`, `dist`, `target`, `.venv` and `__pycache__` are skipped.

| Format | Marker |
|---|---|
| AWS WAF | `aws_wafv2_web_acl` or `AWS::WAFv2::WebACL` in a `.tf`, `.json`, `.yaml`, `.yml` or `.template` file |
| Cloudflare | `cloudflare_ruleset`, `cloudflare_filter` or `cloudflare_firewall_rule` in a `.tf` file |
| ModSecurity | `SecRuleEngine` or `SecRule ` in a `.conf` file |
| nginx | A file named `nginx.conf`; `FROM nginx` or `image: nginx` in a Dockerfile or compose file; `nginx.ingress.kubernetes.io` in YAML |
| Suricata | A file named `suricata.yaml` or `suricata.yml` |
| Snort | A file named `snort.conf` or `snort.lua` |

## States

Each lookup ends in one of these, and they are never merged: "we did not ask" is not "there is nothing".

| State | Shown as | `--for` then fails with |
|---|---|---|
| available | The rules, with bodies (Pro) | |
| gated | Counts and formats only | `rule bodies and downloads need a Pro plan (https://www.vulnetix.com/pricing)` |
| none | `nothing published for this yet` | `nothing is published for <id> yet` |
| not indexed | `not indexed: … is not an advisory identifier the database can look up` | `<id> is not an advisory identifier the database can look up` |
| not checked, failed | `not checked (…)`, `lookup failed (…)` | `that format is not among the rules found` |
| unavailable | | `defence lookup is not available in this version yet` |

When rules exist but none is in the format you asked for, `--for` also fails with `no rule to save: that format is not among the rules found`.

## Saving

```bash
vulnetix defend CVE-2025-12345 --for modsecurity,aws-waf -O defences/
```

Each body is downloaded and its SHA-256 compared with the hash the database sent. On a mismatch the file is not written and the command fails with `<format> rule failed its checksum (expected …, got …); not written`.

## Recording

See [Recording a control](/virtual-patching/defend/recording-controls/).

## Exit codes

| Code | When |
|---|---|
| `0` | Printed, saved and recorded as asked |
| `1` | Any error: a bad flag value, no rule to save, a checksum mismatch, a missing `--package`, a lookup that failed while saving |

## API calls

`defend` calls the Vulnetix API (`api.vdb.vulnetix.com`) with your CLI credentials:

| Call | Plan |
|---|---|
| `POST /v2/defences/counts` | any |
| `GET /v2/vuln/{id}/virtual-patches`, `GET /v2/vuln/{id}/countermeasures` | Pro |
| `GET /v2/virtual-patches/{uuid}/archive`, `GET /v2/countermeasures/{uuid}/archive` | Pro |

See the [VDB API reference](/vdb-api/) for those routes.
