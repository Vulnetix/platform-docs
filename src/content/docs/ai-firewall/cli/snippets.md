---
title: Code snippets
description: Generate a runnable program wired to the gateway with vulnetix ai-firewall snippet, for SDKs and providers that no environment variable can redirect.
order: 4
sources:
  - cli/cmd/ai_firewall_apply.go
  - cli/pkg/aifirewall/snippet.go
  - cli/pkg/aifirewall/templates/python-openai.tmpl
  - cli/pkg/aifirewall/templates/sh-curl.tmpl
  - cli/pkg/aifirewall/templates/ts-vercel-ai.tmpl
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`vulnetix ai-firewall snippet` prints a short program that calls the gateway, with this org's gateway URL, provider and an allowed model already filled in. It writes to stdout, so it pipes.

```bash
vulnetix ai-firewall snippet > hello.py
VULNETIX_API_KEY=... python hello.py
```

For some clients this is the only way through the firewall: the Vercel AI SDK ignores `OPENAI_BASE_URL`, and Mistral, xAI, OpenRouter, Together, Fireworks and DeepSeek have no base-URL variable any SDK reads. For them the base URL is set in code.

## Templates

| `--lang` | `--sdk` | Provider | Program |
|---|---|---|---|
| `python` | `openai` | any `chat` provider | `openai.OpenAI(base_url=...)`, one chat completion |
| `python` | `anthropic` | `anthropic` only | `anthropic.Anthropic(base_url=...)`, one message |
| `python` | `langchain` | any `chat` provider | `ChatOpenAI(base_url=...)` |
| `python` | `llamaindex` | any `chat` provider | LlamaIndex OpenAI LLM with `api_base` |
| `ts` | `openai` | any `chat` provider | `new OpenAI({ baseURL })` |
| `ts` | `anthropic` | `anthropic` only | `new Anthropic({ baseURL })` |
| `ts` | `vercel-ai` | any `chat` provider | `createOpenAI({ baseURL })` with `generateText` |
| `go` | `openai` | any `chat` provider | `openai-go` client with `option.WithBaseURL` |
| `sh` | `curl` | any `chat` provider | One `curl` to `/chat/completions` |

Any other pair fails with `no snippet for --lang X --sdk Y` and the list of pairs. An OpenAI-shaped template aimed at `anthropic`, or the reverse, is refused: it would be built on the wrong base URL and `404` on its first call.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--lang` | `python` | `go`, `python`, `sh`, `ts` |
| `--sdk` | `openai` | `anthropic`, `curl`, `langchain`, `llamaindex`, `openai`, `vercel-ai` |
| `--provider <slug>` | the first provider with a stored key; `anthropic` for the Anthropic templates | Provider in the URL |
| `--model <id>` | the first model the org allows for that provider, else `claude-sonnet-4-5` for `anthropic` and `gpt-4o` for the rest | Model in the request. Refused when policy would reject it. |
| `--output-file <path>` | stdout | Write to a file; parent directories are created |
| `--force` | `false` | Overwrite an existing output file |
| `--base-url`, `--gateway-url`, `-o` | | As on [every command](/ai-firewall/cli/commands/#flags-shared-by-many-subcommands). `-o json` prints `{"content": "..."}`. |

The command fails with `no provider has a stored key` when the org has no keys yet.

## Example output

`vulnetix ai-firewall snippet --provider openrouter --model openai/gpt-4o-mini` prints:

```python
import os

from openai import OpenAI

# Every request goes through the Vulnetix AI Firewall, which applies this org's
# provider, model, and guardrail policy before forwarding it to openrouter.
# The openrouter key is held server-side: the only credential here is the
# Vulnetix API key.
client = OpenAI(
    base_url="https://guardrails.vulnetix.com/openrouter/<org-uuid>/v1",
    api_key=os.environ["VULNETIX_API_KEY"],
)

response = client.chat.completions.create(
    model="openai/gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)
```

`--lang sh --sdk curl` prints a smoke test that should return `200` for a request the policy allows:

```sh
#!/bin/sh
set -eu

curl -s https://guardrails.vulnetix.com/openai/<org-uuid>/v1/chat/completions \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}]}'
```

A request the policy refuses returns `403` with an OpenAI-shaped `error` object whose `code` is `request_blocked`, `provider_denied`, `model_denied`, `model_not_allowed` or `provider_key_missing`. All codes are on [Error reference](/ai-firewall/reference/errors/).

## Related

- [Clients](/ai-firewall/clients/overview/) has hand-written setups for more languages and frameworks.
- [Wiring clients](/ai-firewall/cli/wiring-clients/)
