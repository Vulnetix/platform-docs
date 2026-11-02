---
title: Choosing a client setup
nav: Overview
description: Which request surface each AI client speaks, whether `vulnetix ai-firewall install` can wire it, and which of its traffic never reaches the gateway.
order: 1
sources: [cli/pkg/aifirewall/clients.go, cli/pkg/aifirewall/provider.go, cli/pkg/aifirewall/config.go, cli/pkg/aifirewall/detect.go, cli/cmd/ai_firewall.go, ai-firewall/internal/api/server.go, ai-firewall/internal/api/handlers.go, ai-firewall/internal/client/client.go, ai-firewall/internal/wire/wire.go, website/src/components/ai-firewall/setup-guide-content.ts]
checked: [ai-firewall@339de55, cli@4c8c3b7, website@ad775f3]
updated: 02 Nov 2026
---

Every client is wired the same way: its base URL points at the gateway, and its API key is your **Vulnetix API key**, not a provider key. The provider key stays in the vault and the gateway adds it on the way upstream. See [Keys and base URLs](/ai-firewall/get-started/keys-and-base-urls/) for the two keys and the URL shapes.

A client is only wired when **both** halves are right. A base URL that points at the gateway with a provider key in the key field fails with `401 invalid_api_key`. A Vulnetix key with the provider's own base URL sends your Vulnetix key to the provider.

## Clients

| Client | Surface | `install` id | What `install` writes | Traffic that skips the gateway |
|---|---|---|---|---|
| [Claude Code](/ai-firewall/clients/claude-code/) | `messages` | `claude-code` | `env` in `.claude/settings.json` | None once wired |
| [Claude Desktop](/ai-firewall/clients/claude-desktop/) | `messages` | none | Nothing. Set in the app. | A user who signs in to Anthropic instead |
| [Codex CLI](/ai-firewall/clients/codex-cli/) | `responses` | `codex` | `[model_providers.vulnetix-openai]` in `~/.codex/config.toml` | None once wired |
| [Continue](/ai-firewall/clients/continue/) | `chat` | `continue` | A `models` entry in `~/.continue/config.yaml`, and `~/.continue/.env` | Roles the entry does not cover, such as autocomplete |
| [aider](/ai-firewall/clients/aider/) | `chat` | `aider` | `openai-api-base` and `model` in `.aider.conf.yml` | None once wired |
| [Cursor](/ai-firewall/clients/cursor/) | `chat` | `cursor` (prints steps) | Nothing. Set in the app. | Tab completions, Auto mode |
| [Windsurf](/ai-firewall/clients/windsurf/) | `chat` | `windsurf` (prints steps) | Nothing. Set in the app. | The editor's built-in models |
| [Belai and Kiro](/ai-firewall/clients/kiro/) | any, plus `kiro` | none | Nothing. Set in Belai. | Decision models, Copilot |
| Any SDK or script | `chat`, `responses`, `messages` | `shell`, `env` | Base-URL and key variables | SDKs that ignore the variables |
| [Other clients](/ai-firewall/clients/other-clients/) | `chat` | none | Nothing | Depends on the client |

The SDK pages: [curl](/ai-firewall/clients/curl/), [Python](/ai-firewall/clients/python/), [JavaScript and TypeScript](/ai-firewall/clients/javascript/), [Java, Kotlin and Spring AI](/ai-firewall/clients/jvm/), [Go](/ai-firewall/clients/go/), [Rust, .NET, Ruby, PHP, Elixir, Swift and Dart](/ai-firewall/clients/more-languages/). Unattended agents: [CI/CD](/ai-firewall/clients/ci-cd/).

## Surfaces

The route decides the surface. A provider serves only the surfaces listed for it in the provider catalogue; a request on any other surface is refused with `404 unsupported_api`, and the message names the route to use instead.

| Surface | Route under `https://guardrails.vulnetix.com/{provider}/{uuid}` | Spoken by | Served by |
|---|---|---|---|
| `chat` | `POST /v1/chat/completions` | OpenAI SDKs, LangChain, LlamaIndex, Continue, aider, Cursor, curl | Every provider except `anthropic` and `kiro` |
| `responses` | `POST /v1/responses` | Codex CLI | `openai` |
| `messages` | `POST /v1/messages`, `POST /v1/messages/count_tokens` | Anthropic SDKs, Claude Code, Claude Desktop | `anthropic` |
| `kiro` | `POST /v1/generateAssistantResponse`, `GET /v1/ListAvailableModels` | Belai's `kiro` provider | `kiro` |

`GET /v1/models` on any provider lists the models your policy lets you call. See [The models endpoint](/ai-firewall/policy/models-endpoint/).

## Base URL shape

| Client family | Base URL |
|---|---|
| OpenAI-shaped (OpenAI SDKs, Codex, Continue, aider, Cursor, Windsurf, LangChain, LlamaIndex) | `https://guardrails.vulnetix.com/{provider}/{uuid}/v1` |
| Anthropic-shaped (Anthropic SDKs, Claude Code, Claude Desktop) | `https://guardrails.vulnetix.com/anthropic/{uuid}`, no `/v1` |
| Spring AI | `https://guardrails.vulnetix.com/{provider}/{uuid}`, no `/v1` (Spring AI appends `/v1/chat/completions`) |

`{uuid}` is the UUID your Vulnetix API key belongs to: your own principal UUID, or the organisation UUID for a single-user organisation. Policy always comes from the organisation. `vulnetix ai-firewall status` prints it as the gateway `org`.

> [!CAREFUL] `/v1/v1` is the most common mistake
> The OpenAI SDKs expect the version in the base URL. The Anthropic SDKs add `/v1` themselves. Putting `/v1` on an Anthropic base URL produces `/v1/v1/messages`, which is a `404`.

## Environment variables the CLI sets

`vulnetix ai-firewall install shell` writes a managed block, fenced by `# Vulnetix AI Firewall` and `# End Vulnetix AI Firewall`, into your shell rc (or the Windows user environment). `install env` writes the same variables into an existing `.env`, `.envrc` or `Makefile` at the git root. Only providers with a stored key, and not denied by policy, are written.

| Provider | Base-URL variables | Key variable | Value of the key variable |
|---|---|---|---|
| `openai` | `OPENAI_BASE_URL`, `OPENAI_API_BASE` | `OPENAI_API_KEY` | `$VULNETIX_API_KEY` |
| `anthropic` | `ANTHROPIC_BASE_URL` | `ANTHROPIC_AUTH_TOKEN` | `$VULNETIX_API_KEY` |
| `groq` | `GROQ_BASE_URL` | `GROQ_API_KEY` | `$VULNETIX_API_KEY` |
| `mistral`, `deepseek`, `xai`, `openrouter`, `together`, `fireworks` | none | none | none |

`OPENAI_BASE_URL` is read by `openai-python` 1.x and `openai-node`; `OPENAI_API_BASE` by `langchain-openai` and LlamaIndex. No SDK reads a base-URL variable for the providers in the last row, so the CLI writes only an informational `VULNETIX_AIFW_<PROVIDER>_BASE_URL` (for example `VULNETIX_AIFW_MISTRAL_BASE_URL`). Nothing reads it: set `base_url` in code for those providers.

> [!CAREFUL] The block does not set `VULNETIX_API_KEY`
> The managed block references `$VULNETIX_API_KEY`; it never contains the key. Export `VULNETIX_API_KEY` earlier in the rc file than the block, or the variables it sets expand to an empty string and every request fails with `401`. `status` reports this as `key_env_unset`.

## Install and uninstall

```bash
vulnetix ai-firewall install                      # every client detected on this machine
vulnetix ai-firewall install claude-code codex    # only these
vulnetix ai-firewall install aider --dry-run      # print the plan, write nothing
vulnetix ai-firewall uninstall --all --except codex
```

Client ids: `aider`, `claude-code`, `codex`, `continue`, `cursor`, `env`, `shell`, `windsurf`. The flags (`--provider`, `--model`, `--scope`, `--embed-key`, `--create-env`, `--dry-run`, `--gateway-url`) are in [Wiring clients](/ai-firewall/cli/wiring-clients/).

Before writing, `install`:

- skips a provider with no stored key, or one denied by policy, and says which;
- skips a client whose surface the gateway does not serve for its provider (`wire_unsupported`), rather than writing a config that would `404`;
- refuses a `--model` the policy would refuse at request time;
- refuses `--embed-key` when the target file is inside a git repository and not git-ignored.

## Checking a machine

`vulnetix ai-firewall status` reports each client as one of:

| State | Meaning |
|---|---|
| `wired` | The configured base URL is on the gateway host |
| `points elsewhere` | A base URL is configured and it is not the gateway. Raises `bypasses_firewall`. |
| `not wired` | Installed, with no base URL configured |
| `manual` | Cursor or Windsurf: the setting lives in application state, which the CLI cannot read |
| `not installed` | No config directory or binary found |

`manual` does not mean wired. Claude Desktop, Belai and SDK code in your own programs are not in the CLI's client list at all, so `status` says nothing about them. For those, the proof is a request: send one that a guardrail blocks and look for the `403`, or read the `X-Vulnetix-Firewall-Decision` response header (`allow`, `redact`, `flag` or `block`).

## What the gateway sees from an agent

Guardrails run over every text segment of the request on every surface, including tool results: a file an agent read or the output of a command it ran is screened on the next turn. The arguments a model writes for a tool call are opaque tool input and are not scanned. A tool runs on the developer's machine before its result reaches the gateway, so a [tool rule](/ai-firewall/policy/tools/) stops the tool being offered again; it cannot undo a command.

The gateway names the client from its request headers (`claude-code`, `claude-desktop`, `codex-cli`, `cursor`, `kiro`, `copilot`, `continue`, `aider`, `anthropic-sdk`, `openai-sdk`, `langchain`, `curl`, or `unknown`). Any caller can set those headers, so the name is attribution, not authentication. See [Client identity](/ai-firewall/policy/client-identity/).
