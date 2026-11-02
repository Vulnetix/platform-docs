---
title: Troubleshooting
description: Symptom-first fixes for CLI sign-in failures, 401 and 403 responses, traffic that never reaches the gateway, rules that do or do not fire, policy file errors and 5xx responses.
order: 7
sources:
  - cli/cmd/package_firewall.go
  - cli/pkg/auth/credentials.go
  - cli/cmd/ai_firewall.go
  - cli/cmd/ai_firewall_apply.go
  - cli/pkg/aifirewall/checks.go
  - cli/pkg/aifirewall/provider.go
  - cli/pkg/aifirewall/detect.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/openai/usage.go
checked: [cli@4c8c3b7, ai-firewall@339de55]
updated: 02 Nov 2026
---

Start with:

```bash
vulnetix ai-firewall status
```

It shows the providers with their policy and key state, the guardrails, every AI client on this machine with its state (`wired`, `points elsewhere`, `not wired`, `manual`), and each conflict as a check with the `403` it would cause. The checks are on [Status and checks](/ai-firewall/cli/status-and-checks/).

## The CLI cannot sign in

| Error | Cause | Fix |
|---|---|---|
| `unsupported authentication method: token` | You are signed in with `VULNETIX_API_TOKEN`. `status`, `install`, `snippet`, `apply` and `export` need the Vulnetix API key itself, to write it into configs or check `metadata.org`, and only API-key and SigV4 credentials provide one. | Unset `VULNETIX_API_TOKEN` and use `VULNETIX_API_KEY` with `VULNETIX_ORG_ID`, or run `vulnetix auth login` with an API key. |
| `no credentials found` | Neither a stored login nor environment credentials | `vulnetix auth login`, or export both `VULNETIX_API_KEY` and `VULNETIX_ORG_ID` |
| Signed in as the wrong org in CI | `VULNETIX_API_KEY` without `VULNETIX_ORG_ID` is ignored, and the CLI falls through to SigV4 variables or a credentials file | Set both variables |
| `saving to the secrets vault needs an API key sign-in` | `kiro login` with a non-API-key credential | `vulnetix auth login` with an API key |
| `AI firewall configuration requires an authenticated Vulnetix org` (403) | The CLI is using the shared community org | Sign in to your own organisation |

## 401 invalid_api_key

| Message | Fix |
|---|---|
| `invalid Vulnetix API key` | The client is sending a provider key (`sk-…`, `sk-ant-…`). Point its key variable at `$VULNETIX_API_KEY`. Or the key belongs to a different principal than the UUID in the URL: a Teams member must use its own principal UUID. |
| `missing Vulnetix API key` | The variable is not exported in the process the client runs in. For Anthropic SDKs, `ANTHROPIC_API_KEY` sends `x-api-key` and `ANTHROPIC_AUTH_TOKEN` sends `Authorization: Bearer`; both work, but only if set. |
| `unknown organisation` | The org segment is wrong or not a UUID |
| `missing organisation` | The base URL has no org segment |

## 403 with a code

You authenticated; policy refused the request. Look the code up in the [error reference](/ai-firewall/reference/errors/). The two that surprise people:

- **`model_not_allowed` on a model nobody denied.** Someone allowed a different model on that provider, which put it into allowlist mode. Allow this one too, or remove the allow entries. `status` reports this for a model pinned in a client config.
- **`provider_key_missing` after `install`.** The key was removed after wiring, or you wired with `--provider` for a provider without one. `vulnetix ai-firewall key set <slug>`.

## 404

| Code | Fix |
|---|---|
| `unsupported_api` | Wrong base URL for the client. Anthropic clients use `…/anthropic/{org}` with no `/v1`; OpenAI clients use `…/{provider}/{org}/v1`. Codex needs `openai` (Responses). A path with `/v1/v1/` is the giveaway. |
| `unknown_provider` | Misspelt slug, or another organisation's custom provider |

## Traffic is not reaching the gateway

Nothing errors and nothing is screened. In `status`:

- **`points elsewhere`** (`bypasses_firewall`): the client's base URL is not the gateway. Run `vulnetix ai-firewall install <client>`.
- **The shell block was written but not loaded.** `status` reads the process environment, which is what an SDK sees. Open a new shell or source the rc file.
- **`key_env_unset`**: the base URL points at the gateway and the key variable is empty. Export `VULNETIX_API_KEY`.
- **The SDK does not read a base-URL variable for this provider.** Only `OPENAI_BASE_URL`, `OPENAI_API_BASE`, `ANTHROPIC_BASE_URL` and (unverified) `GROQ_BASE_URL` are read by SDKs. For Mistral, DeepSeek, xAI, OpenRouter, Together and Fireworks, set `base_url` in code: `vulnetix ai-firewall snippet --provider mistral`.
- **Vercel AI SDK** ignores `OPENAI_BASE_URL`: `vulnetix ai-firewall snippet --lang ts --sdk vercel-ai`.
- **`.env` with `${VULNETIX_API_KEY}`** expands under python-dotenv and direnv but not plain Node `dotenv`. Export the variable instead.
- **Cursor and Windsurf** keep the base URL in application settings; `install` prints what to paste. See [Cursor](/ai-firewall/clients/cursor/) for the traffic Cursor never routes through a custom key.

Prove the path end to end with a canary rule: [Verify](/ai-firewall/get-started/verify/).

## A rule does not fire

- **The pattern does not compile.** The gateway skips it while it shows as enabled. `status` warns with `guardrail_pattern_invalid`; `apply` refuses the file. RE2 has no lookahead or lookbehind: `orgUuid=\S+` blocks the same requests as `(?<=orgUuid=)\S+`.
- **The rule is disabled**, or several baseline rules ship disabled.
- **The plan.** Guardrails need Teams, provider and model policy need Pro. Below them the rules are stored and not applied.
- **The cache.** A new or changed rule reaches the gateway within 30 seconds.
- **The client was never wired.** See above.

## A rule fires too often

Switch it to `flag`, turn on [inference logging](/ai-firewall/operations/logs/) and read which rules match before you block again. See [Rolling out a rule](/ai-firewall/policy/rollout/). For a baseline rule, exclude it by id with `spec.baseline.exclude`.

## Policy file and apply

| Message | Fix |
|---|---|
| `declares metadata.org X, but you are authenticated as Y` | You are about to apply one organisation's policy to another, or a Teams member's export to another member. Check, then remove `metadata.org` or pass `--force`. |
| `duplicate name` | Guardrails are matched by name; rename one |
| `applied N of M change(s), then failed: …` | The first failing change stopped the run. Changes before it are live. Fix the cause and run `apply` again. |
| Plan-locked error on the first guardrail | The baseline is composed in by default and guardrails need Teams. On Pro, set `spec.baseline.enabled: false`. |
| `apply` deleted nothing | Unmentioned guardrails and models are drift until you pass `--prune` |
| `--prune` left a provider | Providers are never pruned. Write `action: default`, or run `policy provider <slug> --clear`. |
| `unknown provider` from `key set` | The CLI's provider list has nine slugs. For `alibaba`, `moonshot`, `minimax` and custom providers use the console or `providers[].key` in the file. |

Every field and message is on the [policy file reference](/ai-firewall/reference/policy-file/).

## 413, 503, slow requests

- **`413 request_too_large`**: the body is over 8 MiB. Not configurable.
- **`503`**: the gateway could not verify the key, load policy or read the catalog, and refuses rather than forward unscreened traffic. Retry; if it persists, quote the `X-Vulnetix-Firewall-Request-Id`.
- **Slow turns with Claude Code**: a redaction inside a cached prompt prefix changes the bytes and the provider's cache misses on every turn. Keep redaction rules narrow on agent traffic.

## Start over on one machine

```bash
vulnetix ai-firewall uninstall --all --dry-run
vulnetix ai-firewall uninstall --all
vulnetix ai-firewall install
```

`uninstall` touches local files only and needs no sign-in. Policy and stored keys are unchanged.

## Related

- [Error reference](/ai-firewall/reference/errors/)
- [FAQ](/ai-firewall/reference/faq/)
