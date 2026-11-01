---
title: Usage and spend
nav: Usage
description: Where to see what the factory and your agents used, by model, host, workflow and agent, and how Pix answers spend questions on a call.
order: 3
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_summary_usage.go, website/src/worker/call/tools.ts]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

Usage shows what was spent today, over 7, 30 or 90 days, or for the month so far. It is on the Budgets page, and the cockpit shows the headline figures.

| View | Shows |
|---|---|
| By model | Tokens per model label |
| By host | Each host's budget gauge and 7 day spend per model |
| By agent role and project | Tokens per agent role and per project, the most used tools, and the estimated cost. The Workforce page's **Used by workflows** filter shows which published workflows use each crew and agent. |

Token and tool usage per host also comes from Belai's analytics for the same ranges. See [Analytics](/software-factory/evidence/analytics/).

> [!PIX] Spend by phone
> Ask "what did I spend this month?". Pix answers with `factory_spend` for today, the last 7 or 30 days, or the month so far, including the budget pace and cost by model. "What did the factory save us?" uses `delivery_value`. Pix only reads these figures from your records; it never adds them up itself.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/budgets/usage?range=7d` (`today`, `7d`, `30d`, `90d`, `mtd`; `tz` for `today` and `mtd`) |
| GET | `/v1/factory/budgets/hosts` |
| GET | `/v1/factory/workforce/usage` |

## Related

- [Budgets](/software-factory/cost/budgets/)
- [Delivery](/software-factory/evidence/delivery/) for what the spend produced.
