---
title: Cloudflare WAF
description: Turn a CLOUDFLARE_WAF feed's expressions into custom rules, in log mode first, by dashboard, API or Terraform.
order: 11
nav: Cloudflare WAF
sources: [vdb-site/api/internal/handler/detection_rule_feeds_publish.go, vdb-manager/scripts/go-processors/internal/defence/validate/network.go, cli/internal/defences/defences.go]
checked: [vdb-site@1a06d67, vdb-manager@1cb0079, cli@4c8c3b7]
updated: 02 Nov 2026
---

A `CLOUDFLARE_WAF` feed publishes `cloudflare-expressions.txt`: one Cloudflare Rules language expression per line, each after a comment naming the rule and its CVE. A disabled rule's expression is commented out.

```text
# Legacy XML parser XXE via upload endpoint (CVE-2025-12345)
(http.request.uri.path contains "/api/upload" and http.request.method eq "POST")

# Disabled example (CVE-2025-23456)
# (http.request.uri.path eq "/admin/debug")
```

The expressions use only fields from a vetted list, so a typo cannot slip through and silently never match. Each expression becomes the `expression` of a custom rule; Vulnetix does not publish a ruleset JSON.

`vulnetix defend --for cloudflare` saves one expression as `<id>-cloudflare-expression.txt`.

## Dashboard

**Security** > **WAF** > **Custom rules** > **Create rule** > **Edit expression**, paste the expression, choose the action. Use **Log** (Enterprise) or **Managed Challenge** while you watch for false positives, then **Block**.

## API

Custom rules live in the zone's `http_request_firewall_custom` phase entrypoint ruleset. Find it, then add one rule per expression.

```bash
ZONE=<zone-id>
CF="https://api.cloudflare.com/client/v4/zones/$ZONE/rulesets"
AUTH="Authorization: Bearer $CLOUDFLARE_API_TOKEN"   # Zone > WAF > Edit

RULESET="$(curl -fsS -H "$AUTH" "$CF/phases/http_request_firewall_custom/entrypoint" | jq -r .result.id)"
```

If that call answers 404, the zone has no custom rules yet: create the entrypoint with your first rule using `PUT $CF/phases/http_request_firewall_custom/entrypoint` and a body of `{"rules":[...]}`.

Add each enabled expression from the feed, in `log` first:

```bash
awk '/^# /{name=substr($0,3); next} /^[^#]/ && NF {print name "\t" $0}' cloudflare-expressions.txt |
while IFS="$(printf '\t')" read -r name expr; do
  jq -n --arg d "vulnetix: $name" --arg e "$expr" \
    '{description: $d, expression: $e, action: "log"}' |
  curl -fsS -X POST -H "$AUTH" -H 'Content-Type: application/json' \
    "$CF/$RULESET/rules" --data @- | jq -r '.success'
done
```

`log` is an Enterprise action. On other plans use `managed_challenge` while you watch, then `block`. To promote a rule, `PATCH $CF/$RULESET/rules/<rule-id>` with `{"action":"block"}` and the same `expression`.

The `vulnetix:` prefix in the description lets you find and replace these rules when the feed changes.

## Terraform

```hcl
locals {
  vulnetix_expressions = [
    for l in split("\n", file("${path.module}/cloudflare-expressions.txt")) :
    trimspace(l) if trimspace(l) != "" && !startswith(trimspace(l), "#")
  ]
}

resource "cloudflare_ruleset" "custom" {
  zone_id = var.zone_id
  name    = "custom rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules = [
    for i, e in local.vulnetix_expressions : {
      description = "vulnetix ${i}"
      expression  = e
      action      = "log"
    }
  ]
}
```

That is the `cloudflare/cloudflare` provider v5 syntax (`rules` as a list attribute). With v4, write `rules { ... }` as a `dynamic "rules"` block. A zone has one `http_request_firewall_custom` entrypoint, so merge these rules with any you already manage there.

## Where to see matches

Matches appear under **Security** > **Events** in Cloudflare. To search them next to the rest of your logs, send `firewall_events` to Guardian: [Cloudflare log source](/siem/sources/cloudflare/).
