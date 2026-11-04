---
title: Quickstart
description: Store a provider key, send one request through the gateway, and prove a guardrail fires, with the CLI or with curl.
order: 2
sources:
  - cli/cmd/ai_firewall_policy.go
  - cli/cmd/config_ai_firewall.go
  - cli/pkg/aifirewall/templates/sh-curl.tmpl
  - cli/pkg/auth/credentials.go
  - ai-firewall/internal/api/handlers.go
checked: [cli@4c8c3b7, ai-firewall@339de55]
updated: 02 Nov 2026
---

You need the [Vulnetix CLI](/cli/get-started/install/), your org UUID and your Vulnetix API key. Both are on [Resolve > AI Firewall](https://www.vulnetix.com/resolve/ai-firewall) when you are signed in. Which key is which is on [Keys and base URLs](/ai-firewall/get-started/keys-and-base-urls/).

## 1. Sign the CLI in

```bash
export VULNETIX_ORG_ID=<org-uuid>
export VULNETIX_API_KEY=<vulnetix-api-key>
vulnetix auth status
```

With both variables set the CLI needs no stored login. `vulnetix auth login` works too, if it stores an API key.

## 2. Store a provider key

```bash
export OPENAI_PROVIDER_KEY=sk-proj-...
vulnetix ai-firewall key set openai --from-env OPENAI_PROVIDER_KEY
```

The key is encrypted with KMS and cannot be read back. From now on your applications carry only the Vulnetix key. See [Provider keys](/ai-firewall/get-started/provider-keys/).

## 3. Send a request

```bash
curl -s "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/chat/completions" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello"}]}'
```

A completion means the request went through the gateway. The same call from Python:

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url=f"https://guardrails.vulnetix.com/openai/{os.environ['VULNETIX_ORG_ID']}/v1",
    api_key=os.environ["VULNETIX_API_KEY"],
)
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Say hello"}],
)
print(resp.choices[0].message.content)
```

## 4. Prove a guardrail fires

Guardrails need the Business plan. Add a rule that blocks the word `hunter2`, then send it:

```bash
vulnetix ai-firewall policy guardrail canary \
  --rule-type blocked_pattern --action block --pattern 'hunter2' --priority 1

curl -s -i "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/chat/completions" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"my password is hunter2"}]}'
```

The response is `403` with an OpenAI-shaped error and `X-Vulnetix-Firewall-*` headers:

```json
{
  "error": {
    "message": "request blocked by AI firewall policy: content matched pattern for policy \"canary\"",
    "type": "policy_violation",
    "code": "request_blocked",
    "blocked_by": "canary",
    "violations": [
      {
        "policy_uuid": "<guardrail-uuid>",
        "policy_name": "canary",
        "rule_type": "blocked_pattern",
        "action": "block",
        "detail": "content matched pattern for policy \"canary\""
      }
    ]
  }
}
```

A completion here means the request did not go through the gateway, or the org is below Business and guardrails are not loaded. Remove the rule when you are done: find its UUID with `vulnetix ai-firewall get -o json`, then run `vulnetix ai-firewall policy guardrail canary --uuid <uuid> --delete`.

## 5. Wire your tools

```bash
vulnetix ai-firewall install --dry-run
vulnetix ai-firewall install
vulnetix ai-firewall status
```

`install` writes the gateway into the shell, Claude Code, Codex, Continue and aider configs it finds; `status` confirms each one is `wired`. See [Wiring clients](/ai-firewall/cli/wiring-clients/), or [Clients](/ai-firewall/clients/overview/) to set one up by hand.

## Next

- [Recommended baseline](/ai-firewall/policy/recommended-baseline/) is the rule set to start from.
- [Policy as code](/ai-firewall/cli/policy-file-workflow/) keeps the policy in a reviewed file.
- [Verify the gateway](/ai-firewall/get-started/verify/) lists every way to check a client is really going through it.
