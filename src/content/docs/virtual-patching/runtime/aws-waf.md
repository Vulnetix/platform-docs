---
title: AWS WAF
description: Load an AWS_WAF feed into a WAFv2 rule group, attach it to a Web ACL in count mode, and update it when the feed changes.
order: 10
sources: [vdb-site/api/internal/handler/detection_rule_feeds_publish.go, vdb-manager/scripts/go-processors/internal/defence/validate/schema.go, vdb-manager/scripts/go-processors/internal/defence/validate/schemas/aws-waf-rule.json, cli/internal/defences/defences.go]
checked: [vdb-site@1a06d67, vdb-manager@1cb0079, cli@4c8c3b7]
updated: 02 Nov 2026
---

An `AWS_WAF` feed publishes `wafv2-rules.json`: a JSON array of WAFv2 `Rule` objects with `Priority` already numbered 0, 1, 2 and every disabled rule set to `Count`. That is exactly the `--rules` input of a rule group.

`vulnetix defend --for aws-waf` saves one rule as `<id>-wafv2-rule.json`, a single `Rule` object. Wrap it in `[` `]` to use it the same way.

## 1. Fetch and check

```bash
FEED="https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>"
curl -fsSLO "$FEED/wafv2-rules.json"
[ "$(curl -fsSL "$FEED/wafv2-rules.json.sha256")" = "$(sha256sum wafv2-rules.json | cut -d' ' -f1)" ]
```

## 2. Size the group

```bash
aws wafv2 check-capacity --scope REGIONAL --rules file://wafv2-rules.json
```

Give the rule group at least that capacity, with headroom: a rule group's capacity cannot change after it is created. Use `--scope CLOUDFRONT --region us-east-1` for a CloudFront distribution.

## 3. Create the rule group

```bash
aws wafv2 create-rule-group \
  --name vulnetix-virtual-patches \
  --scope REGIONAL \
  --capacity 500 \
  --rules file://wafv2-rules.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=vulnetix-virtual-patches
```

Note the `Id` and `ARN` it returns.

## 4. Attach it in count mode

Add the group to your Web ACL with `OverrideAction: Count`. Every rule then counts instead of blocking, whatever its own `Action`. This is how you run a feed in log-only mode first.

```json
{
  "Name": "vulnetix-virtual-patches",
  "Priority": 5,
  "Statement": {
    "RuleGroupReferenceStatement": {
      "ARN": "arn:aws:wafv2:<region>:<account>:regional/rulegroup/vulnetix-virtual-patches/<id>"
    }
  },
  "OverrideAction": { "Count": {} },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "vulnetix-virtual-patches"
  }
}
```

Add that object to the Web ACL's `Rules` with `aws wafv2 update-web-acl` (which needs the full rule list and the current `--lock-token` from `get-web-acl`), or in Terraform:

```hcl
rule {
  name     = "vulnetix-virtual-patches"
  priority = 5

  override_action {
    count {}
  }

  statement {
    rule_group_reference_statement {
      arn = aws_wafv2_rule_group.vulnetix.arn
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "vulnetix-virtual-patches"
  }
}
```

Check the sampled requests and the CloudWatch metric for matches on legitimate traffic. When they are clean, change `OverrideAction` to `{ "None": {} }` so each rule's own `Action` applies.

## 5. Update when the feed changes

```bash
NAME=vulnetix-virtual-patches SCOPE=REGIONAL
ID="$(aws wafv2 list-rule-groups --scope $SCOPE --query "RuleGroups[?Name=='$NAME'].Id" --output text)"
TOKEN="$(aws wafv2 get-rule-group --name $NAME --scope $SCOPE --id "$ID" --query LockToken --output text)"
aws wafv2 update-rule-group --name $NAME --scope $SCOPE --id "$ID" --lock-token "$TOKEN" \
  --rules file://wafv2-rules.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=$NAME
```

> [!CAREFUL] Rules that name your own resources
> A rule using `RegexPatternSetReferenceStatement` or `IPSetReferenceStatement` carries an `ARN`. Those resources must exist in your account and region, or `create-rule-group` refuses the whole file. Check for them before you load a feed: `jq '.. | .ARN? // empty' wafv2-rules.json`.

## Where to see it in Vulnetix

The **Web App Firewalls** tab of `/resolve/virtual-patching` shows the Web ACLs Vulnetix found in your connected AWS accounts. See [Cloud security](/cloud-security/).
