---
title: aider
description: "`install aider` writes `openai-api-base` and an `openai/` model into `.aider.conf.yml`; aider reads the key from `OPENAI_API_KEY`."
order: 6
sources: [cli/pkg/aifirewall/config.go, cli/pkg/aifirewall/clients.go, cli/pkg/aifirewall/checks.go, cli/cmd/ai_firewall.go, ai-firewall/internal/client/client.go, ai-firewall/website/content/docs/coding-agents/aider.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

aider speaks the `chat` surface through its OpenAI-compatible provider. It reads the base URL from `.aider.conf.yml` (or `--openai-api-base`) and the key from `OPENAI_API_KEY`.

## With the CLI

```bash
vulnetix ai-firewall key set openai --from-env OPENAI_KEY   # once per organisation
vulnetix ai-firewall install aider shell --model gpt-4o-mini
```

`install aider` sets two keys in `.aider.conf.yml` and leaves the rest of the file alone:

```yaml
openai-api-base: https://guardrails.vulnetix.com/openai/<uuid>/v1
model: openai/gpt-4o-mini
```

The file is at the git root (default scope `project`), or `~/.aider.conf.yml` outside a repository. `model` is only written with `--model`, prefixed `openai/` so aider sends it to the OpenAI-compatible base URL. The file never holds the key, so it is safe to commit.

`install shell` exports `OPENAI_API_KEY="$VULNETIX_API_KEY"` (and the base-URL variables) in your shell rc. With `--embed-key` the literal key is written instead, and the CLI refuses if the file is tracked by git.

## By hand

```yaml
# .aider.conf.yml
openai-api-base: https://guardrails.vulnetix.com/openai/<uuid>/v1
model: openai/gpt-4o-mini
```

```bash
export VULNETIX_API_KEY="<your Vulnetix API key>"
export OPENAI_API_KEY="$VULNETIX_API_KEY"
aider
```

For another `chat` provider, change the slug and use that provider's model name after the `openai/` prefix, for example `openai-api-base: https://guardrails.vulnetix.com/openrouter/<uuid>/v1` with `model: openai/openai/gpt-4o-mini`.

## Verify

`vulnetix ai-firewall status` should show `aider` as `wired`. `key_env_unset` means the config is right but `OPENAI_API_KEY` is empty in this shell, and aider will get `401`. The gateway names the client `aider` from its `aider/` user agent.

## Limits

- aider has no built-in models. Its edit loop, commit messages and repo-map summaries all use this base URL.
- `--openai-api-base` on the command line overrides the file for one run.
- Tool-call arguments are not scanned. File contents you `/add` and command output are.
