---
title: Token budgets and session intelligence
nav: Token budgets
description: Belai's own token budgets per provider and model, which inform but never block, and session intelligence on plan limits, pace and runway.
order: 17
sources: [belai/docs/token-budgets.md, belai/internal/budget]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

A Belai token budget caps how many tokens one provider and model may spend in a **session**, a local calendar **day** or a local calendar **month**. Belai counts every model call, shows the current model's budgets in the footer, and can warn when spend is running ahead of the clock.

**Budgets never block a call.** They inform. Factory runs are limited by the factory's own [budgets](/software-factory/cost/budgets/), which do enforce.

## Setting budgets

`/budgets`, or `f1` then `b`, opens the token budgets screen.

```json
"token_budgets": [
  { "provider": "openrouter", "model": "anthropic/claude-sonnet-5", "scope": "session", "tokens": 2000000 },
  { "provider": "openrouter", "model": "anthropic/claude-sonnet-5", "scope": "day", "tokens": 20000000 }
]
```

| Setting | Default | Meaning |
|---|---|---|
| `token_budgets` | none | A list of `{provider, model, scope, tokens}`. Global settings only. |
| `ui.budget_cycle_seconds` | 10 | Seconds the footer shows each budget |
| `ui.budget_warn` | off | Print a warning on each call while a budget is amber or red |

Your budget configuration can be kept in the [library](/software-factory/workforce/library/) and installed on another host. `belai budget list`, `validate`, `import` and `export` do the same by hand.

## Session intelligence

`f12`, `/intel`, or `f1` then `i` shows plan limits with their reset times, pace, trend, runway, and today, week and 30-day roll-ups. Plan limits are read from the provider's rate-limit headers.

| Setting | Default | Meaning |
|---|---|---|
| `ui.intel` | on | The footer slot, the intel tab and `f12` |
| `intel.plan_limits` | on | Read provider rate-limit headers |
