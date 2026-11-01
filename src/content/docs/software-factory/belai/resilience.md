---
title: Retries, resilience and performance
nav: Resilience
description: How Belai survives provider failures and malformed model output, and what it does to keep turns fast.
order: 21
sources: [belai/docs/resilience.md, belai/docs/performance.md, belai/docs/benchmarks.md]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Belai retries in layers, so a flaky provider or a malformed reply does not end your turn:

| Layer | Handles |
|---|---|
| Typed errors | Every provider error carries its status, any retry-after, and a redacted body |
| Transport retry | A failure before the first byte arrives is retried, with exponential backoff |
| Turn retry | The agent loop sends the same turn again |
| Semantic repair | Malformed, cut-off or dangling tool calls become tool results that tell the model what was wrong, so it corrects itself |
| Pass boundary | In goal mode, a context overflow compacts once and runs the pass again |

A crew run adds its own layer: a provider pool that moves workers to another model after repeated outages. See [Crews](/software-factory/workforce/crews/).

`resilience.max_iterations` (40 by default) bounds the tool rounds in a turn.

## Keeping turns fast

- Read-only tool calls run concurrently, up to `resilience.max_agents` at a time (15 by default, held between 4 and 16).
- Large tool output is stored aside, keeping the conversation's start unchanged so the provider's prompt cache keeps working. See [Sessions](/software-factory/belai/sessions/).
- Code mode turns many tool calls into one script. See [Built-in tools](/software-factory/belai/tools/).
