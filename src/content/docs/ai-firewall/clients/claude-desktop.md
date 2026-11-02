---
title: Claude Desktop
description: Route Claude Desktop through the gateway with its third-party inference setting, which lives in the app and is not written or checked by the CLI.
order: 3
sources: [ai-firewall/internal/api/handlers.go, ai-firewall/internal/api/codec.go, ai-firewall/internal/client/client.go, cli/pkg/aifirewall/clients.go, ai-firewall/website/content/docs/coding-agents/claude-desktop.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

Claude Desktop speaks the Anthropic Messages API and can send it to a gateway of your choosing. It has no config file the CLI can write, and it is not in the CLI's client list: `vulnetix ai-firewall install` does nothing for it and `status` does not report it.

## Set it up

Store the Anthropic key once for the organisation:

```bash
vulnetix ai-firewall key set anthropic --from-env ANTHROPIC_KEY
```

Then, in the app:

1. **Help > Troubleshooting > Enable Developer Mode.**
2. **Developer > Configure Third-Party Inference...**
3. Backend: **Gateway (Anthropic-compatible)**.
4. Base URL: `https://guardrails.vulnetix.com/anthropic/<uuid>`, with no `/v1`.
5. API key: your Vulnetix API key.
6. Auth scheme: `bearer`. The gateway also accepts `x-api-key`, so either scheme works.
7. **Apply locally**, then quit the app fully and reopen it. The setting is read at start-up.
8. On the start screen choose **Continue with Gateway**.

The menu paths are Claude Desktop's and can change between releases.

## Verify

- The start screen offers **Continue with Gateway**. If it does not, the setting was not applied.
- The model picker lists only what the gateway returns from `GET /anthropic/<uuid>/v1/models`, which is filtered by your model policy. A picker that shows your allowed models and not Anthropic's full list is confirmation.
- Send a message that one of your guardrails blocks. The gateway answers `403` in the Anthropic error envelope with `code: request_blocked`, and the app shows the message.
- In the console's [capability inventory](/ai-firewall/operations/inventory/), requests appear under the client `claude-desktop` (from a `claude-desktop/` user agent).

## Errors

| Status | `code` | Cause | Fix |
|---|---|---|---|
| `401` | `invalid_api_key` | The API key field holds an Anthropic key | Use your Vulnetix API key |
| `403` | `provider_key_missing` | No Anthropic key in the vault. The model picker is empty for the same reason. | `vulnetix ai-firewall key set anthropic`, then restart the app |
| `403` | `model_not_allowed` | The provider is in allowlist mode and the model is not listed | Pick an allowed model |
| `404` | `unsupported_api` | The base URL ends in `/v1`, or the slug is not `anthropic` | Use `https://guardrails.vulnetix.com/anthropic/<uuid>` |

## Limits

- The setting is per machine and per user. A user who turns developer mode off, or signs in with an Anthropic account instead of choosing **Continue with Gateway**, talks to Anthropic directly. There is no file to ship to a fleet that prevents it.
- No CLI check covers Claude Desktop. An absent `bypasses_firewall` warning says nothing about it.
- Tool-call arguments the model writes are not scanned. Prompts, attachments and tool results are.
