---
title: Python
description: The OpenAI and Anthropic Python SDKs, LangChain, LlamaIndex and Pydantic AI pointed at the gateway, with streaming and refusal handling.
order: 13
sources: [cli/pkg/aifirewall/templates/python-openai.tmpl, cli/pkg/aifirewall/templates/python-anthropic.tmpl, cli/pkg/aifirewall/templates/python-langchain.tmpl, cli/pkg/aifirewall/templates/python-llamaindex.tmpl, cli/pkg/aifirewall/snippet.go, cli/pkg/aifirewall/provider.go, ai-firewall/internal/api/codec.go, ai-firewall/website/content/docs/sdks/python.md, ai-firewall/website/content/docs/sdks/anthropic-python.md, ai-firewall/website/content/docs/sdks/langchain.md, ai-firewall/website/content/docs/sdks/llamaindex.md, ai-firewall/website/content/docs/sdks/pydantic-ai.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

Two settings change: the base URL and the API key. Everything else in your code stays the same. Each example reads `VULNETIX_API_KEY` and `VULNETIX_ORG_ID` from the environment.

The CLI prints the OpenAI, Anthropic, LangChain and LlamaIndex examples with your UUID and an allowed model filled in:

```bash
vulnetix ai-firewall snippet --lang python --sdk openai --provider openai
vulnetix ai-firewall snippet --lang python --sdk anthropic
vulnetix ai-firewall snippet --lang python --sdk langchain --output-file llm.py
```

`openai-python` 1.x reads `OPENAI_BASE_URL`, and `langchain-openai` and LlamaIndex read `OPENAI_API_BASE`, so `vulnetix ai-firewall install shell` alone routes them. Setting the base URL in code, as below, keeps the routing explicit.

## OpenAI SDK

```bash
pip install openai
```

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url=f"https://guardrails.vulnetix.com/openai/{os.environ['VULNETIX_ORG_ID']}/v1",
    api_key=os.environ["VULNETIX_API_KEY"],  # the Vulnetix key, not an OpenAI key
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)
```

For another `chat` provider change the slug and the model name, for example `/groq/<uuid>/v1` with `llama-3.3-70b-versatile`, or `/openrouter/<uuid>/v1` with `openai/gpt-4o-mini`. `client.responses.create(...)` works against `openai` only.

Streaming:

```python
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True,
)
for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

A refusal is a `403`, raised as `openai.PermissionDeniedError`:

```python
import openai

try:
    client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello"}],
    )
except openai.PermissionDeniedError as e:
    err = e.response.json().get("error", {})
    print(err.get("code"), err.get("blocked_by"))  # e.g. request_blocked, "No connection strings"
    raise
```

## Anthropic SDK

The base URL stops at the UUID: the SDK adds `/v1`.

```bash
pip install anthropic
```

```python
import os
from anthropic import Anthropic

client = Anthropic(
    base_url=f"https://guardrails.vulnetix.com/anthropic/{os.environ['VULNETIX_ORG_ID']}",  # no /v1
    auth_token=os.environ["VULNETIX_API_KEY"],
)

message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
print(message.content[0].text)
```

`auth_token` sends `Authorization: Bearer`; `api_key` sends `x-api-key`. The gateway accepts both. The CLI snippet uses `auth_token`.

```python
with client.messages.stream(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

Refusals raise `anthropic.PermissionDeniedError`; `e.response.json()["error"]` carries `code`, `blocked_by` and `violations`.

## LangChain

```bash
pip install langchain-openai
```

```python
import os
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url=f"https://guardrails.vulnetix.com/openai/{os.environ['VULNETIX_ORG_ID']}/v1",
    api_key=os.environ["VULNETIX_API_KEY"],
    model="gpt-4o-mini",
)
print(llm.invoke("Hello").content)
```

`llm.stream("Hello")` streams. Refusals surface as `openai.PermissionDeniedError` from inside the chain. The gateway names this client `langchain` when its user agent says so.

## LlamaIndex

```bash
pip install llama-index-llms-openai
```

```python
import os
from llama_index.core import Settings
from llama_index.llms.openai import OpenAI

llm = OpenAI(
    api_base=f"https://guardrails.vulnetix.com/openai/{os.environ['VULNETIX_ORG_ID']}/v1",
    api_key=os.environ["VULNETIX_API_KEY"],
    model="gpt-4o-mini",
)
Settings.llm = llm  # query engines and agents now use the gateway
print(llm.complete("Hello"))
```

> [!CAREFUL] Embeddings do not go through the gateway
> The gateway has no `/v1/embeddings` route. Point `Settings.embed_model` at the provider directly or at a local model; an embedding model with the gateway base URL fails with `404`.

## Pydantic AI

```bash
pip install pydantic-ai
```

```python
import os
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

model = OpenAIChatModel(
    "gpt-4o-mini",
    provider=OpenAIProvider(
        base_url=f"https://guardrails.vulnetix.com/openai/{os.environ['VULNETIX_ORG_ID']}/v1",
        api_key=os.environ["VULNETIX_API_KEY"],
    ),
)
agent = Agent(model, system_prompt="Be concise.")
print(agent.run_sync("Hello").output)
```

A refusal raises `pydantic_ai.exceptions.ModelHTTPError` with `status_code == 403`; `e.body` is the parsed error body when it is JSON.

## Codes to handle

| `code` | Meaning |
|---|---|
| `request_blocked` | A content guardrail matched. `blocked_by` names it. |
| `tool_denied`, `mcp_denied`, `skill_denied`, `client_denied` | A capability rule refused the request |
| `held_for_review` | A capability nobody has reviewed is held |
| `provider_denied`, `model_denied`, `model_not_allowed` | Provider or model policy |
| `provider_key_missing` | No key in the vault for this provider |

All codes and statuses: [Errors](/ai-firewall/reference/errors/).
