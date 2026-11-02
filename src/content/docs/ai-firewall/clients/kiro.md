---
title: Belai and Kiro
description: Route Belai's model traffic through the gateway, and provision the Kiro sign-in the gateway uses in place of an API key with `vulnetix ai-firewall kiro login`.
order: 9
sources: [cli/cmd/ai_firewall_kiro.go, cli/pkg/aifirewall/provider.go, ai-firewall/internal/api/kiro.go, ai-firewall/internal/api/codec.go, ai-firewall/internal/api/handlers.go, ai-firewall/internal/api/server.go, ai-firewall/README.md, belai/internal/firewall/vulnetix.go, belai/internal/config/firewall.go]
checked: [ai-firewall@339de55, cli@4c8c3b7, belai@2b15d69]
updated: 02 Nov 2026
---

[Belai](/software-factory/belai/install-and-sign-in/), the Vulnetix agent harness, has the AI Firewall built in as its `vulnetix` firewall adapter. It is the only client that reaches the gateway's `kiro` provider.

## Belai

Turn the firewall on in Belai's global settings file:

```json
"firewall": { "enabled": true }
```

With no `active` instance Belai uses `vulnetix`, whose URL is `https://guardrails.vulnetix.com`. Belai then builds the same base URLs as the CLI: `https://guardrails.vulnetix.com/anthropic/<uuid>` for Anthropic and `https://guardrails.vulnetix.com/<slug>/<uuid>/v1` for the rest. It routes these Belai providers: `anthropic`, `openai`, `openrouter`, `groq`, `mistral`, `deepseek`, `xai`, `together`, `fireworks`, `alibaba`, `moonshot`, `minimax` and `kiro`. Others go direct.

`/firewall` in the TUI opens the settings screen, `F10` toggles the firewall for the current project, and `belai -firewall` routes one run. A project settings file may only set `firewall.enabled` to `false`. The full settings, the other adapters and the hold-for-review permission cards are in [Package and AI firewalls on factory work](/software-factory/evidence/firewalls/).

Belai reads the gateway's `X-Vulnetix-Firewall-Decision`, `-Rules`, `-Redactions`, `-Stripped`, `-Request-Id` and `-Nonce` response headers and shows what the firewall did. See [Response headers](/ai-firewall/reference/headers/).

> [!CAREFUL] Decision models are never routed
> Belai's classifiers and goal evaluator use decision backends, not chat models, and do not go through any AI Firewall. Sign-in providers such as Copilot are not routed either.

## Kiro

Kiro has no API key. The vault holds a **Kiro sign-in** for the `kiro` provider (an AWS SSO-OIDC refresh token and its client registration), and for each request the gateway trades it for a short-lived access token, sets the sign-in's profile ARN on the request, and calls `q.<api-region>.amazonaws.com`. Tokens are only sent to pinned `oidc`, `q` and `codewhisperer` hosts under `amazonaws.com`. Clients send only their Vulnetix API key.

```bash
vulnetix ai-firewall kiro login                                  # AWS Builder ID
vulnetix ai-firewall kiro login --start-url https://my-org.awsapps.com/start --region eu-central-1
vulnetix ai-firewall kiro login --import                          # reuse the Kiro IDE or kiro-cli sign-in
```

| Flag | Default | Meaning |
|---|---|---|
| `--start-url` | AWS Builder ID | IAM Identity Center start URL |
| `--region` | `us-east-1` | AWS region of the sign-in |
| `--api-region` | the profile's region, else `--region` | Kiro API region |
| `--profile-arn` | prompt when there are several | CodeWhisperer profile ARN (Identity Center) |
| `--import` | `false` | Reuse the Kiro IDE or kiro-cli sign-in. The gateway and that tool then share one refresh token. |
| `--name` | `kiro` | Vault entry name when one is created |
| `--owner` | every owner | Principal UUIDs allowed to use the entry. Repeatable. |
| `--expires-in-days` | `0` (never) | Expire the vault entry |
| `--no-browser` | `false` | Print the sign-in URL instead of opening a browser |

Without `--import` the command runs a device sign-in: it opens (or prints) a URL and a code, then waits for approval. The sign-in registers its own AWS client, separate from the Kiro IDE's. Running it again replaces the value of the vault entry that already serves the firewall, so grants and history are kept. It needs an API-key sign-in to the CLI (`vulnetix auth login` with an API key).

GitHub and Google Kiro sign-ins have no SSO-OIDC refresh path and cannot be used.

### Kiro routes

| Route | Use |
|---|---|
| `POST https://guardrails.vulnetix.com/kiro/<uuid>/v1/generateAssistantResponse` | Inference. Guardrails run over `conversationState`, including tool results and tool definitions. The AWS event-stream response is relayed unchanged. |
| `GET https://guardrails.vulnetix.com/kiro/<uuid>/v1/ListAvailableModels` | Kiro's models, filtered by your model policy |

Refusals use the AWS error shape (`__type`, `message`, and the `x-amzn-ErrorType` header) with the gateway's `{"error": {...}}` envelope alongside it.

| Status | `code` | Cause | Fix |
|---|---|---|---|
| `403` | `provider_key_missing` | No Kiro sign-in in the vault | `vulnetix ai-firewall kiro login` |
| `403` | `vault_kiro_relogin` | AWS no longer accepts the stored sign-in | Run `kiro login` again |
| `502` | none | The token exchange with AWS failed | Retry; check AWS status |

If AWS rotates the refresh token, each gateway replica keeps the new one in memory only; the vault's verify action writes it back.

## Gaps

The console's setup guide also lists the Kiro IDE and kiro-cli. Nothing in the CLI or the gateway configures them, and no base-URL setting for them is documented here. Belai is the supported Kiro client.
