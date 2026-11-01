---
title: Model routing and the Pix allowance
nav: Model routing
description: Which model each kind of factory work uses, how to send a route to your own key in the Secrets Vault, what happens when the allowance runs out, and the reserve for interactive sessions.
order: 2
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/tenantmodel/tenantmodel.go, website/.repo/tenant-model-labels.md, website/sandbox-worker/src/model-routing.ts]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

Factory work is split into five **routes**. Each route sends its calls to one **provider**.

| Route | Used for | Default |
|---|---|---|
| `systemone_decisions` | Decision steps | `clef-flash` |
| `code_smart` | Agents writing code, the smart tier | `pix-smart` |
| `code_fast` | Agents writing code, the fast tier | `pix-fast` |
| `planner_reviewer` | Planning and review agents | `pix-smart` |
| `images` | Image input | `pix-smart` |

A crew step chooses `smart`, `fast` or a vault key with its `codeTier`.

## Providers

| Provider | What it is | Billed to |
|---|---|---|
| Pix Fast, Pix Smart | The models included with your plan | Your Pix allowance |
| System One, Clef Flash | The decision classifier | The daily decision cap |
| `vault:<entry>` | A key you keep in the Secrets Vault, such as your own Anthropic or OpenRouter key | Your provider account |
| Cloudflare AI Gateway | Calls routed through Cloudflare's gateway (off for the factory by default) | |

The factory can use a provider only when it is switched on for the factory on the Budgets page. A vault key also needs a grant to the `pix_sandbox` surface in the Secrets Vault, or it is refused with `grant_missing`. Grants are edited in the vault, not here. A route can only point at a provider that is on for the factory.

Two settings in Settings › Providers and secrets:

| Setting | Effect |
|---|---|
| `providers.code` | The provider for code: `pix-smart`, `pix-fast` or `vault:<entryId>` |
| `providers.ai_gateway` | Send calls through Cloudflare AI Gateway |

## When the allowance runs out

`onAllowanceExhausted` decides:

| Value | Effect |
|---|---|
| `fall_back_to_vault` | Continue on your vault keys. The default. |
| `pause_factory` | Pause the factory |
| `buy_topup` | Buy a top-up |

## The interactive reserve

`reserveInteractivePct` keeps part of the allowance for your own sessions (20% by default). It is the same value as the `pix.reservePercent` setting.

> [!WHY] Why routes, not one model choice
> A decision needs a fast, calibrated classifier, a planner benefits from a large model, and a lint fix does not. Routing by kind of work lets you put your own key behind the work that needs it and keep the rest on your allowance.

## Model labels

Wherever the console shows a model, it uses one label per model across pages. Spend is grouped by those labels, so "Pix Smart" in Usage is the same thing as "Pix Smart" in routing. A Pix model is never shown as a bare "Pix".

## API

| Method | Path |
|---|---|
| PUT | `/v1/factory/budgets/routing` with `{routes, onAllowanceExhausted, reserveInteractivePct}` |
| PUT | `/v1/factory/budgets/providers/{id}` with `{factory: true}` |

Both are owner or admin.
