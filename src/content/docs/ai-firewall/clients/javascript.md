---
title: JavaScript and TypeScript
nav: JavaScript
description: The OpenAI and Anthropic Node SDKs, LangChain.js and the Vercel AI SDK pointed at the gateway, with streaming and refusal handling.
order: 14
sources: [cli/pkg/aifirewall/templates/ts-openai.tmpl, cli/pkg/aifirewall/templates/ts-anthropic.tmpl, cli/pkg/aifirewall/templates/ts-vercel-ai.tmpl, cli/pkg/aifirewall/snippet.go, ai-firewall/internal/api/codec.go, ai-firewall/internal/policy/engine.go, ai-firewall/website/content/docs/sdks/nodejs-typescript.md, ai-firewall/website/content/docs/sdks/anthropic-typescript.md, ai-firewall/website/content/docs/sdks/vercel-ai-sdk.md, ai-firewall/website/content/docs/sdks/langchain.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

The examples are ES modules (top-level `await`): save them as `.mjs` or `.ts` and run with Node 20 or later. Each reads `VULNETIX_API_KEY` and `VULNETIX_ORG_ID`.

```bash
vulnetix ai-firewall snippet --lang ts --sdk openai --provider openai
vulnetix ai-firewall snippet --lang ts --sdk anthropic
vulnetix ai-firewall snippet --lang ts --sdk vercel-ai --provider openai
```

`openai-node` reads `OPENAI_BASE_URL`, so `install shell` routes it without code changes. The Vercel AI SDK does not read it.

## OpenAI SDK

```bash
npm install openai
```

```ts
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: `https://guardrails.vulnetix.com/openai/${process.env.VULNETIX_ORG_ID}/v1`,
  apiKey: process.env.VULNETIX_API_KEY, // the Vulnetix key, not an OpenAI key
})

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
})
console.log(response.choices[0].message.content)
```

Streaming:

```ts
const stream = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
})
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '')
}
```

Refusals:

```ts
try {
  await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Hello' }],
  })
} catch (err) {
  if (err instanceof OpenAI.PermissionDeniedError) {
    // err.error is the body's `error` object: code, blocked_by (a string), violations
    const detail = err.error as { code?: string; blocked_by?: string } | undefined
    console.error(`refused: ${detail?.code} (rule: ${detail?.blocked_by ?? 'n/a'})`)
  }
  throw err
}
```

## Anthropic SDK

```bash
npm install @anthropic-ai/sdk
```

```ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  baseURL: `https://guardrails.vulnetix.com/anthropic/${process.env.VULNETIX_ORG_ID}`, // no /v1
  authToken: process.env.VULNETIX_API_KEY,
})

const message = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }],
})
console.log(message.content)
```

`authToken` sends `Authorization: Bearer` and `apiKey` sends `x-api-key`; the gateway accepts either. Stream with `client.messages.stream({...}).on('text', t => process.stdout.write(t))`. Refusals throw `Anthropic.PermissionDeniedError`.

## Vercel AI SDK

```bash
npm install ai @ai-sdk/openai
```

```ts
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText, APICallError } from 'ai'

const vulnetix = createOpenAI({
  baseURL: `https://guardrails.vulnetix.com/openai/${process.env.VULNETIX_ORG_ID}/v1`,
  apiKey: process.env.VULNETIX_API_KEY!,
})

try {
  const { text } = await generateText({ model: vulnetix('gpt-4o-mini'), prompt: 'Hello' })
  console.log(text)
} catch (err) {
  if (APICallError.isInstance(err) && err.statusCode === 403) {
    const body = JSON.parse(err.responseBody ?? '{}')
    console.error(`refused: ${body.error?.code} (rule: ${body.error?.blocked_by ?? 'n/a'})`)
  }
  throw err
}

const result = streamText({ model: vulnetix('gpt-4o-mini'), prompt: 'Hello' })
for await (const delta of result.textStream) process.stdout.write(delta)
```

> [!CAREFUL] The Vercel AI SDK ignores `OPENAI_BASE_URL`
> Without `createOpenAI({ baseURL })` the SDK calls the provider directly and the gateway never sees the request, whatever your shell exports.

Recent versions of `@ai-sdk/openai` call the Responses API by default. That works against `openai`, which serves `responses`. For any other provider use `vulnetix.chat('model')` so the request goes to `/v1/chat/completions`.

## LangChain.js

```bash
npm install @langchain/openai
```

```ts
import { ChatOpenAI } from '@langchain/openai'

const llm = new ChatOpenAI({
  apiKey: process.env.VULNETIX_API_KEY,
  model: 'gpt-4o-mini',
  configuration: {
    baseURL: `https://guardrails.vulnetix.com/openai/${process.env.VULNETIX_ORG_ID}/v1`,
  },
})
console.log((await llm.invoke('Hello')).content)
```

Error codes: see [Python, Codes to handle](/ai-firewall/clients/python/#codes-to-handle) and [Errors](/ai-firewall/reference/errors/).
