---
title: Verify the gateway
nav: Verify
description: Prove that a client's traffic goes through the gateway and that your rules fire, with status, response headers, a canary rule and the evaluate endpoint.
order: 5
sources:
  - cli/pkg/aifirewall/checks.go
  - ai-firewall/internal/api/headers.go
  - ai-firewall/internal/api/evaluate.go
  - ai-firewall/internal/api/server.go
  - ai-firewall/internal/api/handlers.go
checked: [cli@4c8c3b7, ai-firewall@339de55]
updated: 02 Nov 2026
---

A client you believe is firewalled and is not is worse than one you know is not. Check four things, from cheapest to most thorough.

## 1. Local configuration

```bash
vulnetix ai-firewall status
```

Every client you use should be `wired`. A `points elsewhere` client has a base URL that is not the gateway and is reported as `bypasses_firewall`. The checks are listed on [Status and checks](/ai-firewall/cli/status-and-checks/).

## 2. Response headers

Every response that passes through the gateway, allowed or refused, carries:

| Header | Value |
|---|---|
| `X-Vulnetix-Firewall-Request-Id` | A UUID for this request. Quote it to support. |
| `X-Vulnetix-Firewall-Decision` | `allow`, `flag`, `redact` or `block` |
| `X-Vulnetix-Firewall-Rules` | Names of the rules that matched, percent-encoded, comma-separated, at most 8 names and 512 bytes |
| `X-Vulnetix-Firewall-Redactions` | Number of redacting matches, when there were any |
| `X-Vulnetix-Firewall-Stripped` | Number of tools or MCP servers removed, when any were |
| `X-Vulnetix-Firewall-Nonce` | Sealed-block verification result, when the request carried sealed blocks |

The request id is set on every inference response, including early refusals; the decision headers appear once the guardrails have run. A response with no `X-Vulnetix-Firewall-Request-Id` did not come from the gateway.

```bash
curl -s -o /dev/null -D - "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/chat/completions" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}' \
  | grep -i '^x-vulnetix-firewall'
```

Full list: [Headers](/ai-firewall/reference/headers/).

## 3. A canary rule, through the real client

curl proves the gateway works. Only the client you care about proves that client is wired. Add a rule that blocks a string nobody types, then ask the agent or app to repeat that string:

```bash
vulnetix ai-firewall policy guardrail canary \
  --rule-type blocked_pattern --action block --pattern 'canary-a1b2c3' --priority 1
```

The client should show a `403` with `code: request_blocked` and `blocked_by: canary`. Errors come back in the client's own dialect, so Claude Code prints the message instead of a bare status. A normal answer means that client is not going through the gateway; go back to `status` and look at its base URL.

Guardrail changes reach the gateway within 30 seconds, the policy cache lifetime. Remove the canary afterwards with `vulnetix ai-firewall policy guardrail canary --uuid <uuid> --delete`, taking the UUID from `vulnetix ai-firewall get -o json`.

## 4. Test rules without calling a provider

`POST /guardrails/{orgUuid}/v1/evaluate` runs the org's guardrails on an OpenAI chat request and returns the decision without forwarding it. It needs no provider key, so you can test rules before any key is stored.

```bash
curl -s "https://guardrails.vulnetix.com/guardrails/$VULNETIX_ORG_ID/v1/evaluate" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"test","messages":[{"role":"user","content":"key AKIAABCDEFGHIJKLMNOP"}]}'
```

```json
{
  "decision": "block",
  "blocked_by": "AWS access key id",
  "code": "request_blocked",
  "reason": "content matched pattern for policy \"AWS access key id\"",
  "violations": [
    {
      "policy_uuid": "<guardrail-uuid>",
      "policy_name": "AWS access key id",
      "rule_type": "blocked_pattern",
      "action": "block",
      "detail": "content matched pattern for policy \"AWS access key id\""
    }
  ],
  "inspected": 1
}
```

| Field | Meaning |
|---|---|
| `decision` | `allow`, `flag`, `redact` or `block` |
| `blocked_by`, `code`, `reason` | Present on a block |
| `violations` | Every rule that matched, `[]` when none did |
| `inspected` | Number of text segments the guardrails read. `0` means nothing in the request was inspected. |
| `body` | The request as it would be forwarded, with redactions applied. Absent on a block. |

The answer is always `200`; the decision is in the body. The example above blocks only if the org has the baseline's AWS rule. Provider and model policy are not checked here, and the provider in the log and inventory is `workers-ai`. Evaluations count like real requests: they are logged when logging is on, recorded in the inventory, and can create held requests.

## What these checks cannot show

- A canary proves the request path reaches the guardrails, not that your real rules catch what you need. See [Rolling out a rule](/ai-firewall/policy/rollout/).
- Responses are never inspected.
- Some client features bypass a custom base URL entirely, such as Cursor's tab completion. See [Cursor](/ai-firewall/clients/cursor/).
- With [inference logging](/ai-firewall/operations/logs/) on, each log row records `inspected`. Watch for requests with `0`: they parsed, and the guardrails had nothing to read.

## Related

- [Status and checks](/ai-firewall/cli/status-and-checks/)
- [Troubleshooting](/ai-firewall/reference/troubleshooting/)
