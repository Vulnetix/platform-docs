---
title: Cursor
description: Cursor's OpenAI base-URL override routes its chat traffic through the gateway. Tab completions and Auto mode do not use it.
order: 7
sources: [cli/cmd/ai_firewall.go, cli/pkg/aifirewall/clients.go, cli/pkg/aifirewall/detect.go, ai-firewall/internal/client/client.go, ai-firewall/website/content/docs/coding-agents/cursor.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

Cursor keeps its model settings in application state, not a file, so the CLI never writes them. `vulnetix ai-firewall install cursor` prints the values to paste, with your UUID filled in (abridged):

```bash
vulnetix ai-firewall install cursor
```

```text
Cursor: Settings > Models > Override OpenAI Base URL
    Base URL: https://guardrails.vulnetix.com/openai/<uuid>/v1
    API key:  your $VULNETIX_API_KEY
```

## Set it up

1. Store the provider key once: `vulnetix ai-firewall key set openai --from-env OPENAI_KEY`.
2. In **Settings > Models > API Keys**, turn on **OpenAI API Key** and paste your Vulnetix API key.
3. Turn on **Override OpenAI Base URL** and set `https://guardrails.vulnetix.com/openai/<uuid>/v1`.
4. Add the model ids you will use, such as `gpt-4o-mini`. Cursor does not read the list from the gateway, and the gateway refuses models your policy does not allow.
5. Select a model explicitly in the chat picker. Do not leave it on **Auto**.

Menu names are Cursor's and change between releases.

> [!CAREFUL] Cursor cannot be fully routed through the gateway
> Tab completions always use Cursor's own models on Cursor's servers, with the code around your cursor. Auto mode may also use Cursor's models. Neither reaches the gateway, and no setting changes that. If your control statement says every prompt is screened, Cursor contradicts it.

## Verify

`vulnetix ai-firewall status` reports Cursor as `manual`, because the CLI cannot read application state. `manual` does not mean wired.

Inside Cursor, the key's **Verify** button sends a request to the base URL. Then send a chat message that one of your guardrails blocks: a `403` naming the rule in the chat pane proves that request went through. Requests that do arrive appear in the [inventory](/ai-firewall/operations/inventory/) under the client `cursor`.

Cursor's integrated terminal inherits your shell, so aider or Codex run there use the shell block from `install shell`.

## Limits

- Tab completions and Auto mode bypass the gateway, as above.
- Agent-mode tool calls from Cursor are not always spec-compliant OpenAI tool calls and can fail against the gateway. Chat works.
- Cursor names MCP tools `mcp_<server>_<tool>`. Those appear in the inventory and can be matched by [tool rules](/ai-firewall/policy/tools/), but only for traffic that reaches the gateway.
- For an editor agent whose traffic all goes through the gateway, use [Continue](/ai-firewall/clients/continue/).
