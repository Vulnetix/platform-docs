---
title: Limitations and roadmap
nav: Limitations
description: What the AI Firewall does not do today, the known gaps in coverage and tooling, clients it cannot front, and the work that is planned but not built.
order: 9
sources:
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/proxy.go
  - ai-firewall/internal/openai/usage.go
  - ai-firewall/internal/kiroauth/refresh.go
  - ai-firewall/internal/client/client.go
  - cli/pkg/aifirewall/provider.go
  - cli/cmd/package_firewall.go
  - vdb-site/api/internal/handler/ai_firewall_logs.go
checked: [ai-firewall@339de55, cli@4c8c3b7, vdb-site@1a06d67]
updated: 02 Nov 2026
---

## Not provided

| Area | Detail |
|---|---|
| Cost controls | No rate limits, budgets, quotas, spend caps or cost tracking. Token counts are reported, not limited. |
| Response inspection | Guardrails read requests only. Model output is relayed unscreened. |
| Routing | No fallback between providers, no retries, no load balancing, no caching |
| Semantic guardrails | Rules are RE2 regex, integer caps and name globs. No classifier models. |
| Guardrail exceptions | No allowlist phrase that exempts text from a rule while the rest is still scanned |
| Cross-surface translation | A Messages client cannot reach a Chat-only provider through the gateway, or the reverse |
| Per-team policy | One policy per organisation. Vault bundles scope keys to principals, not rules. |
| Region pinning | See [Jurisdictional control](/ai-firewall/security/jurisdictional-control/) |
| Log retention control | Inference log rows are not deleted automatically, and there is no retention setting |
| Public admin API | Policy is written through the console, the CLI API (`/v2/cli.ai-firewall-*`) and the [policy file](/ai-firewall/reference/policy-file/). The gateway has no policy routes, and the console API takes session cookies only. |

## Known gaps

- **Tool calls cannot be undone.** A coding agent runs a tool locally before its result reaches the gateway. A tool rule removes or refuses the tool on later requests.
- **Tool call arguments the model generates are in the response**, so they are not scanned. Tool results the agent sends back are.
- **Client identity is self-reported.** `client_*` rules read headers.
- **A pattern that does not compile is skipped** while showing as enabled. The CLI's `status` warns and `apply` refuses it; the console and API accept partial updates without a rule type.
- **Redaction breaks prompt caching** when it rewrites text in a cached prefix.
- **Streamed Chat Completions without `stream_options.include_usage` log no tokens.**
- **The CLI knows nine providers.** `key set` and `install` do not cover `alibaba`, `moonshot`, `minimax`, `kiro` or custom providers; use the console or a policy file.
- **CLI token credentials.** `status`, `install`, `snippet`, `apply` and `export` reject `VULNETIX_API_TOKEN` sign-ins with `unsupported authentication method: token`.
- **`GET /v1/models` responses carry no `X-Vulnetix-Firewall-Request-Id`.**
- **Cursor.** Some Cursor features (tab completion, Auto mode) never use a custom key or base URL, so they never reach the gateway. See [Cursor](/ai-firewall/clients/cursor/).
- **Kiro refresh tokens.** When AWS rotates a Kiro refresh token during use, each gateway replica keeps the new token in memory only; only the vault's verify action saves it. GitHub and Google Kiro sign-ins cannot be used.

## Clients that cannot be fronted

- **JetBrains Junie** offers no base-URL override.
- Clients not listed under [Clients](/ai-firewall/clients/overview/) may work if they accept a custom OpenAI-compatible or Anthropic base URL, but have not been tested. See [Other clients](/ai-firewall/clients/other-clients/).

## Planned

None of these exist today. Do not plan around them.

- A guardrail allowlist that masks a phrase before detection.
- Response inspection.
- More built-in providers, such as Bedrock and Vertex.
- The gateway writing a rotated Kiro refresh token back to the vault.
- Config-as-code beyond the AI Firewall policy file; see [Platform IaC](/platform-iac/).

## Related

- [Threat model](/ai-firewall/security/threat-model/)
- [FAQ](/ai-firewall/reference/faq/)
