---
title: Windsurf
description: Windsurf's custom OpenAI-compatible provider can point at the gateway. Its built-in models do not use it.
order: 8
sources: [cli/cmd/ai_firewall.go, cli/pkg/aifirewall/clients.go, cli/pkg/aifirewall/detect.go, ai-firewall/website/content/docs/coding-agents/windsurf.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

Windsurf keeps the setting in application state, so the CLI never writes it. `install windsurf` prints what to paste (abridged):

```bash
vulnetix ai-firewall install windsurf
```

```text
Windsurf: Settings > Cascade > Model Provider (custom OpenAI endpoint)
    Base URL: https://guardrails.vulnetix.com/openai/<uuid>/v1
    API key:  your $VULNETIX_API_KEY
```

## Set it up

1. Store the provider key once: `vulnetix ai-firewall key set openai --from-env OPENAI_KEY`.
2. In the model provider settings, add a custom OpenAI-compatible endpoint with the base URL above (with `/v1`) and your Vulnetix API key.
3. Add the model ids you will use. Windsurf does not read them from the gateway.
4. Select one of those models explicitly.

The CLI prints the menu path it knows; Windsurf can move it between releases.

> [!CAREFUL] Windsurf's own models bypass the gateway
> Windsurf ships its own models and built-in completion features, which do not use your custom endpoint. That traffic, including the code context it sends, never reaches the gateway.

## Verify

`status` reports Windsurf as `manual` and cannot read the setting. Send a chat message that a guardrail blocks with your model selected; a `403` naming the rule is the proof.

## Limits

- Built-in models and completions bypass the gateway.
- Tool-call arguments are not scanned.
- For an editor agent whose traffic all goes through the gateway, use [Continue](/ai-firewall/clients/continue/).
