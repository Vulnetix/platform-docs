---
title: Feed formats
description: What each published feed file contains, how a disabled rule appears in it, and which formats Vulnetix does not emit.
order: 2
nav: Formats
sources: [vdb-site/api/internal/handler/detection_rule_feeds_publish.go, vdb-site/api/internal/handler/detection_rule_feeds_sensor.go, vdb-site/api/internal/handler/defence_formats.go, vdb-manager/scripts/go-processors/internal/defence/defence.go, vdb-manager/scripts/go-processors/internal/defence/validate/network.go, vdb-manager/scripts/go-processors/internal/defence/validate/schema.go]
checked: [vdb-site@1a06d67, vdb-manager@1cb0079]
updated: 02 Nov 2026
---

Every file is built the same way: the feed's rules are sorted by type, name and id, rules with identical bodies are kept once, and the result is deterministic. An unchanged feed republishes byte for byte.

## Block lane

| File | Content | `Content-Type` | A disabled rule |
|---|---|---|---|
| `local.rules` (Snort), `suricata.rules` (Suricata) | One rule per line, concatenated | `text/plain; charset=utf-8` | Every line prefixed `# `. An enabled rule is published uncommented even if the upstream catalogue has it commented out. |
| `modsecurity.conf` | `SecRule`/`SecAction` directives, concatenated | `text/plain; charset=utf-8` | Every line prefixed `# ` |
| `nginx-waf.conf` | A snippet for inside an existing `server` or `location` block, with its ModSecurity rule inline | `text/plain; charset=utf-8` | Every line prefixed `# ` |
| `wafv2-rules.json` | A JSON array of AWS WAFv2 `Rule` objects | `application/json` | `Action` forced to `{"Count": {}}`. JSON has no comments, so the rule stays visible and observe-only. |
| `cloudflare-expressions.txt` | One Cloudflare Rules language expression per line, each after a `# <rule name> (<CVE>)` line | `text/plain; charset=utf-8` | The expression line prefixed `# ` |
| `patterns.txt` | One RE2 regular expression per line, each after a `# <rule name> (<CVE>)` line | `text/plain; charset=utf-8` | The pattern line prefixed `# ` |

What generated block rules always carry, because the generator refuses them otherwise:

| Format | Guarantees |
|---|---|
| Snort, Suricata | `msg`, `rev`, and a `sid` in **3000000 to 3999999** |
| ModSecurity | `id` in **30000000 to 39999999** (clear of the OWASP Core Rule Set), `phase`, `msg`, `rev`. Only `SecRule` and `SecAction` directives: no rule sets `SecRuleEngine` or `SecDefaultAction` or removes another rule, so the engine's posture stays yours. |
| nginx | No `http`, `server`, `events`, `stream` or `upstream` block of its own; balanced braces |
| AWS WAF | `Name`, `Priority`, `Statement`, `VisibilityConfig`, and an `Action` or `OverrideAction`. `Priority` is renumbered 0, 1, 2 across the file so the set loads as one rule group. |
| Cloudflare | Only fields from a vetted list (`http.*`, `ip.*`, `ssl.*`, `cf.*`, `tcp.*`, `udp.*`) |
| Layer 7 regex | Valid RE2: no lookaround, no backreferences |

## Detect lane

| File | Content | `Content-Type` | A disabled rule |
|---|---|---|---|
| `sigma.yml` | A multi-document YAML stream, one rule per `---` document. pySigma's `SigmaCollection` reads it directly. | `application/yaml` | Every line prefixed `# ` |
| `rules.yar` | YARA rules, concatenated | `text/plain; charset=utf-8` | Wrapped in `/* disabled via detection rule feed curation ... */` |
| `bundle.json` | One STIX 2.1 bundle merging every rule's objects, deduplicated by `id`. The bundle id is derived from its contents, so an unchanged feed keeps its id. | `application/json` | Its objects carry `"revoked": true`, so a platform that imported them retracts them |
| `openioc/<rule-uuid>.ioc` and `openioc/index.txt` | One OpenIOC 1.1 document per rule (an `<ioc>` must be the document root), and a tab-separated index of path and name | `application/xml`, `text/plain` | Left out |

Generated Sigma rules always have `title`, a UUID `id`, `status`, a `logsource` with at least one of `category`, `product` or `service`, and a `detection` with a `condition`. YARA rules always have a `condition` and a `meta` description, and import any module they use.

## `rules.json`

Every feed also publishes `rules.json`, which the [Vulnetix sensor](/virtual-patching/runtime/sensor/) reads instead of the native file, because it needs to know which rule each body is and what mode it may start in:

```json
{
  "schemaVersion": 1,
  "feedUuid": "…",
  "feedType": "MODSECURITY",
  "rules": [
    {
      "ruleTable": "virtual_patch",
      "ruleUuid": "…",
      "ruleType": "MODSECURITY",
      "name": "…",
      "cve": "CVE-2025-12345",
      "deployMode": "log",
      "disabled": false,
      "body": "SecRule REQUEST_URI \"@rx …\" \"id:30000123,phase:1,…\""
    }
  ]
}
```

`deployMode` is `block` only when the rule's own record says so. A catalogue rule with no recommendation is `log`. `ruleTable` is one of `virtual_patch`, `countermeasure`, `snort_rule`, `yara_rule`.

## Not emitted

| Format | Status |
|---|---|
| Nuclei templates | Not a feed type. The schema leaves room for it; nothing publishes it. |
| Tetragon `TracingPolicy` | Not a feed file. The sensor renders one locally from a feed's Sigma rules: [Tetragon](/virtual-patching/runtime/tetragon/). |
| Cloudflare ruleset JSON | Not emitted. The feed is expressions, one per line; [Cloudflare WAF](/virtual-patching/runtime/cloudflare/) shows how to turn them into rules. |
| AWS WAF rule group or Web ACL | Not emitted. The feed is the `Rules` array; [AWS WAF](/virtual-patching/runtime/aws-waf/) shows the group around it. |

## Single-rule downloads

`vulnetix defend --for <format>` saves one rule at a time, named `<rule-id>-<suffix>`. The suffixes differ slightly from the feed files because each holds one rule:

| `--for` | Suffix |
|---|---|
| `cloudflare` | `cloudflare-expression.txt` |
| `aws-waf` | `wafv2-rule.json` (one `Rule` object, not an array) |
| `snort` | `local.rules` |
| `suricata` | `suricata.rules` |
| `modsecurity` | `modsecurity.conf` |
| `nginx` | `nginx-waf.conf` |
| `regex` | `pattern.txt` |
| `sigma` | `sigma.yml` |
| `yara` | `rule.yar` |
| `stix` | `bundle.json` |
| `openioc` | `ioc.xml` |
