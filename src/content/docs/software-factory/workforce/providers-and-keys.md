---
title: Providers, keys and secrets
nav: Providers and keys
description: The model providers Belai can use, custom providers and decision backends, how keys reach a host without being written to settings, vault environment variables for commands, and MCP secrets.
order: 15
sources: [belai/docs/settings.md, belai/docs/vault-env.md, belai/docs/kiro.md, vdb-site/api/internal/handler/belai_provider_keys.go, vdb-site/api/internal/handler/belai_mcp_secrets.go, vdb-site/api/internal/handler/belai_items_validate_provider.go]
checked: [belai@35506b9, vdb-site@284f1d6]
updated: 28 Oct 2026
---

## Built-in providers

Belai knows these providers by name: `anthropic`, `openai`, `openrouter`, `google-gemini`, `mistral`, `deepseek`, `xai`, `groq`, `together`, `fireworks`, `huggingface`, `moonshot`, `minimax`, `alibaba`, `github-copilot`, `kiro`, `cloudflare-workers-ai`, `cloudflare-ai-gateway`, `ollama`, `llama-server`, and the decision backends `typesafe` and `strands-decider`. `/providers` in the TUI manages providers, credentials and local models.

Two sign in instead of taking a key:

- **GitHub Copilot** signs in with your GitHub account.
- **Kiro** signs in through AWS, with an AWS Builder ID or an IAM Identity Center start URL: `belai login kiro`, `belai login kiro -start-url URL -region REGION`, or `-import` to reuse Kiro's own sign-in. `-profile-arn` and `-api-region` select the profile and endpoint. Credentials go to the keychain when one is available; `-backend keychain` or `-backend user-file` chooses where.

## Custom providers

A custom provider is a named entry in your settings:

| Field | Meaning |
|---|---|
| `kind` | `openai-compatible` (or empty), `ollama`, `llama-server`, or `systemone` for a decision backend (`jev` is still read as its old name) |
| `base_url` | Where it is |
| `api` | Its API style: `openai-chat`, `openai-responses` or `anthropic-messages` |
| `auth` | How the key is sent: `bearer`, `x-api-key` or `cf-aig` (Cloudflare AI Gateway) |
| `api_key_env` | The environment variable holding the key. The key itself is never in settings. |
| `models` | Its models, each with `id`, `name`, `context_window`, `max_tokens` and whether it takes `images` |
| `protocol`, `host`, `port`, `decision_path` | The endpoint's parts, kept beside `base_url`; `decision_path` is for decision backends only |

A **provider set** (the custom providers, plus the `firewall` block) can be kept in your library and installed on another host. It has a `name`, its `providers` and its `firewall` settings, and never holds a key. Its firewall headers may not set `accept`, `accept-encoding`, `connection`, `content-encoding`, `content-length`, `content-type`, `cookie`, `host`, `keep-alive`, `proxy-authorization`, `proxy-connection`, `te`, `trailer`, `transfer-encoding`, `traceparent`, `upgrade` or `user-agent`, because Belai sets them or they change how a request is framed.

## Keys

Provider keys never go into a settings file:

- **On your own machine**, Belai keeps them in the keychain, or the user credentials file.
- **From the website**, installing a provider key on a host sends it through Belai's credentials resolver, never into settings, and removing it clears it again.
- **For the factory**, a provider key comes from the Secrets Vault with a grant to the `pix_sandbox` surface. See [Model routing](/software-factory/cost/model-routing/).

| Setting | Effect |
|---|---|
| `vault.grant` | Which vault entries the `pix_sandbox` surface may use: `specific` entries, `all`, or `all_except` some. Default `all`. |
| `vault.on_error` | If a vault key fails: `pause_affected_workflows` (the default) or `fall_back_to_pix` |

## Vault environment variables

A Pix Sandbox can have environment variables from your Secrets Vault, for the commands agents run, such as a registry token. They are held so that **neither the agent nor the model ever sees a value**:

- Each session asks the vault for its host's variables every minute, and holds them in memory only, for a lease of up to 15 minutes.
- A variable is set only on the child process of a tool call.
- The output of every command is scrubbed: a value that appears is replaced with `[vault:NAME]` before the model, the transcript or any log sees it.

## MCP secrets

An MCP server in your library can need secrets, such as an API token. They come from the vault the same way: the Resolve Platform asks the host to install them, the host fetches them into its credentials store, and the server's definition holds only their names.

## API

| Method | Path |
|---|---|
| GET | `/v1/belai/hosts/{hostId}/library/provider-keys` (a host fetching its keys) |
| GET | `/v1/belai/hosts/{hostId}/library/mcp-secrets` |
| GET, POST | `/v1/belai/hosts/{hostId}/vault/env`, `/vault/scrub` |
