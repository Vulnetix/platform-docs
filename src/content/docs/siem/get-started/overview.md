---
title: Guardian overview
description: What Guardian, the Vulnetix SIEM, collects, where it stores it, how searches, rules, triggers and scheduled sends run over it, and what it costs.
order: 1
nav: Overview
sources: [siem/README.md, siem/worker/src/pipeline.ts, siem/worker/src/billing/packs.ts, siem/worker/src/billing/entitlement.ts, siem/worker/wrangler.jsonc, website/src/router/guardian-routes.test.ts]
checked: [siem@e0f71fa, website@ad775f37]
updated: 02 Nov 2026
---

Guardian is the Vulnetix SIEM. It collects network flow, DNS, WAF, HTTP and audit logs from your AWS accounts and Cloudflare zones, plus decisions from Vulnetix products, and keeps them for 31 days. Over that data you can:

- search with the Guardian search language or Sigma;
- run alert rules on a schedule (your own Sigma, SigmaHQ, Vulnetix countermeasures, indicator matches);
- fire triggers that start a Software Factory workflow, post to a messaging connection or send an email;
- send a saved search as a scheduled report.

## How data flows

| Step | What happens |
|---|---|
| Ship | AWS Firehose, Cloudflare Logpush, or your own HTTP client posts batches to `https://ingest.vulnetix.com/v1/ingest/...` with a Guardian ingest token (`gdn_...`). |
| Normalise | Each record is mapped to one of the [tables](/siem/search/tables/). Fields that are not lifted into a column are kept in `raw`. |
| Store | Rows land in Iceberg tables within about a minute. Your organisation comes from the ingest token, never from the payload. |
| Query | Searches, rules, triggers and sends all compile to the same SQL and run under your organisation's scope only. |
| Act | Alerts go to your messaging routes, named connections or email. Triggers can start a workflow where an agent investigates and proposes a fix. |

Retention is 31 days on every pack. A search covers at most 30 days.

## Resolve Platform pages

Guardian is one menu item in the Vulnetix console.

| Page | Path | Use it for |
|---|---|---|
| Search | `/resolve/guardian` | Ad hoc searches, the help panel, saving a search |
| Rules | `/resolve/guardian/rules` | Alert rules, the SigmaHQ catalogue, uploads, alerts |
| Triggers | `/resolve/guardian/triggers` | Triggers and their fires |
| Sends | `/resolve/guardian/sends` | Scheduled reports |
| Workflows | `/resolve/guardian/workflows` | The built-in investigation workflows |
| Sources | `/resolve/guardian/sources` | Ingest tokens, AWS stacks, Cloudflare jobs, volume |

Cloudflare is connected from the Integrations page (the Cloudflare card). See [Cloudflare](/siem/sources/cloudflare/).

## Who can use it

Guardian is an add-on. Your organisation needs the Business or Enterprise plan **and** an active ingest pack. Without both, the console API answers `402` with `needs: business` or `needs: pack`, ingest answers `402`, and rules pause.

| Pack | Ingest per day | Query budget per day | Enabled rules, triggers, sends |
|---|---|---|---|
| `guardian_5` | 5 GB | 50 GiB | 50, 25, 25 |
| `guardian_25` | 25 GB | 250 GiB | 200, 100, 100 |
| `guardian_100` | 100 GB | 1 TiB | 500, 250, 250 |
| `enterprise` | 500 GB or as quoted | 5 TiB | 2000, 1000, 1000 |

Owners and admins buy the pack (**Start Guardian**), create ingest tokens and connect Cloudflare. Other members can search and manage rules. Prices, the ingest cap and what happens past it are on [Packs and limits](/siem/reference/packs-and-limits/).

## Where to go next

- [Quickstart](/siem/get-started/quickstart/): ship AWS logs and run a first search.
- [AWS](/siem/sources/aws/), [Cloudflare](/siem/sources/cloudflare/), [Events API](/siem/sources/events/): the log sources.
- [Search syntax](/siem/search/syntax/) and [Tables](/siem/search/tables/).
- [Alert rules](/siem/detection/rules/) and [Sigma](/siem/detection/sigma/).
- [Triggers](/siem/alerts/triggers/) and [Scheduled reports](/siem/alerts/scheduled-reports/).
- [API](/siem/reference/api/).

## Platform IaC

Guardian's searches, rules, triggers, reports and log sources are kinds: [`SavedSearch`](/platform-iac/kinds/saved-search/), [`DetectionRule`](/platform-iac/kinds/detection-rule/), [`AlertTrigger`](/platform-iac/kinds/alert-trigger/), [`ScheduledReport`](/platform-iac/kinds/scheduled-report/) and [`LogSource`](/platform-iac/kinds/log-source/). They are written in Guardian, which vdb-site vouches to for the caller, in a second phase after the rest of an apply; see [SIEM kinds](/platform-iac/reference/engine/#siem-kinds-written-in-guardian). The log shipping side can be the CloudFormation stack you deploy yourself ([AWS](/siem/sources/aws/)) or the `aws-siem-shipping` Terraform module (see [Terraform modules](/platform-iac/terraform/modules/)). Searches, rules and triggers are also managed in the console and through the [Guardian API](/siem/reference/api/).

[Drift protection](/platform-iac/guides/drift-protection/) does not cover the SIEM kinds yet. They are written in Guardian, not in the site API, so the console can still change a saved search, detection rule, alert trigger, scheduled report or log source that is managed as code.
