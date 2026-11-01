---
title: Choosing providers and models
nav: Models
description: Pick the model for each role, switch models mid-session, use local models, and test what a model can do.
order: 7
sources: [belai/docs/session-controls.md, belai/README.md, belai/internal/models, belai/internal/modelselect, belai/internal/localinfer]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Belai uses more than one model. The **main model** does the work. The **fast tier** handles quick jobs: picking the mode, naming the session, the goal and plan evaluators' verdicts, tidying dictated text. Code mode can have its own model.

## Picking models

`/model` opens the picker: a provider and model for each role. Typed, it switches this session:

```
/model anthropic claude-sonnet-5 high
/model code smart
/model code openrouter deepseek/deepseek-v4
```

`ctrl+q` swaps between the main model and the fast tier. `f6` or `/effort` sets the reasoning effort. A model must be one you have credentials for. Add providers and keys in `/providers`. See [Providers and keys](/software-factory/workforce/providers-and-keys/).

From the command line: `belai -provider P -model M -effort E`.

## Local models

`ollama` and `llama-server` run models on your own machine, and any OpenAI-compatible server works as a custom provider. `/providers report` probes your local model servers and lists what they offer.

## Built-in models in a Pix Sandbox

In a Pix Sandbox, Pix Smart and Pix Fast are available as providers with no key. See [Built-in models](/software-factory/workforce/built-in-models/).

## Decision models

Classification and decisions (the security classifier, the mode classifier, the goal evaluator) use decision backends, not chat models: the embedded classifier, Jev, Clef on Workers AI, or the local `strands-decider`. They are never routed through an AI Firewall. See [Guardrails](/software-factory/belai/guardrails/).

## Related

- [Token budgets](/software-factory/belai/token-budgets/)
