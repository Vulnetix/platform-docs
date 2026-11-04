---
title: Plans and add-ons
description: The Resolve Platform plans, the Package Firewall and SOC Intelligence add-ons, how a locked feature answers, the Billing page, and invoice recipients.
order: 1
sources: [vdb-site/docs/addons.md, vdb-site/api/internal/handler/addons.go, vdb-site/api/internal/handler/addons_checkout.go, vdb-site/api/internal/handler/billing.go, vdb-site/api/internal/handler/entitlements.go, vdb-site/api/main.go, website/src/pages/resolve/billing.vue, website/src/shared/addons.ts, website/src/shared/plan-feature-addons.json, website/src/shared/plan-feature-tiers.json, website/src/components/account-logs/billing-model.ts, cli/AGENTS.md]
checked: [vdb-site@d2ea72f23, website@7f3b734cd, cli@v4.17.1]
updated: 04 Nov 2026
---

An organisation is on one Resolve Platform plan, and can add the Package Firewall and SOC Intelligence add-ons on top. This page covers what each one unlocks, how a locked feature answers, and where to manage billing. Everything here is on **Billing** in the Resolve Platform ([www.vulnetix.com/resolve/billing](https://www.vulnetix.com/resolve/billing)).

## Plans

| Plan | Slug | Price | Vulnerability Database API quota |
|---|---|---|---|
| Community | `community` | free | 50 requests a day |
| Pro | `pro` | $20 / month | 2,000 requests a day |
| Business | `teams` | $450 / month | 100,000 requests a day per key |
| Enterprise | `enterprise` | quoted | custom |

These are the Resolve Platform's catalogue figures. The price shown at Stripe Checkout is what you pay. Business is still called `teams` in the API, in `requiredPlan` and in Platform IaC.

A first paid plan goes through Stripe Checkout. A change to a plan you already pay for opens the Stripe customer portal.

Which features need which plan is listed with each feature. For the organisation features, see [Plans](/organization/#plans).

## Add-ons

An add-on is its own Stripe subscription, bought on top of the plan. Enterprise includes every add-on with no purchase.

| Add-on | `kind` | Price | Unlocks |
|---|---|---|---|
| Package Firewall | `package_firewall` | $125 / month | Every Package Firewall registry except the pkg.go.dev API (`go-dev`) and the AUR (`aur`), which are free on every plan |
| SOC Intelligence | `soc_intelligence` | $399 / month | Attack surface, detection rule feeds and sensor provisioning |

A SOC Intelligence feature needs its plan floor as well as the add-on:

| Feature | Plan floor | Add-on |
|---|---|---|
| Detection rule feeds | Pro | SOC Intelligence |
| Sensor provisioning | Pro | SOC Intelligence |
| Attack surface | Business | SOC Intelligence |

The countermeasure, virtual patch and detection rule catalogues are not behind an add-on. They keep their Pro floor.

[Guardian](/siem/) is sold separately, as an ingest pack on Business or Enterprise. See [Packs and limits](/siem/reference/packs-and-limits/).

### When an add-on is held

An add-on works while its subscription is `active`, or `past_due` while Stripe retries the payment, for at most 7 days after the end of the paid period. `unpaid` and `canceled` never count. A disputed charge on an add-on's payment moves it to `past_due` until the dispute closes.

### Buying an add-on

Only an owner or admin can buy one. Open the **Add-ons** tab of **Billing** and choose **Add** on the add-on. The Resolve Platform then shows **Confirming your purchase** until the payment arrives, which can take a few minutes. Reload before trying to buy the same add-on again: a second purchase of one you already hold is refused, and if one slips through it is cancelled and refunded in full.

Manage or cancel an add-on with **Manage in Stripe** on its card.

## How a locked feature answers

A plan-gated route answers `200` with `planLocked: true` and `requiredPlan`, and withholds the data. Check the body, not only the status. A missing add-on answers in one of two forms:

| Request | Answer |
|---|---|
| A read (`GET`, `HEAD`, `OPTIONS`) | `200`, `planLocked: true`, `addon: "<kind>"`, the withheld data empty |
| A write, or any call from a sensor or device | `402` |

The `402` body:

```json
{
  "error": "add-on required",
  "planLocked": true,
  "feature": "detection-rule-feeds",
  "requiredPlan": "pro",
  "proOnly": true,
  "addon": "soc_intelligence",
  "_entitlements": {
    "plan": "pro",
    "gated": [{"feature": "detection-rule-feeds", "requiredPlan": "pro", "addon": "soc_intelligence"}],
    "addon": "soc_intelligence"
  }
}
```

`requiredPlan` is the feature's plan floor; the add-on is needed as well. A `DELETE` is never refused for a missing add-on, so an organisation whose add-on has lapsed can still remove what it configured. In [Platform IaC](/platform-iac/), a document whose kind needs an add-on you do not hold (`DetectionRuleFeed`, `RuntimeSensorPolicy`) is listed under `skipped` with code `addon_required`, and the rest of the request still applies.

The CLI never decides entitlement itself. On a `402` or a `planLocked` answer, the Vulnetix sensor keeps its last good configuration and its queued events, retries with backoff, and logs once, naming the add-on. `vulnetix auth status` prints "requires the Package Firewall add-on" only when the API says so.

## Reading entitlement

`GET /v1/billing/addons` answers for any member, with a Resolve Platform session or `Authorization: ApiKey <orgId>:<key>`:

```json
{
  "enforced": true,
  "pending": false,
  "packageFirewall": {"entitled": true, "source": "stripe", "status": "active", "currentPeriodEnd": 1767225600000, "cancelAtPeriodEnd": false},
  "socIntelligence": {"entitled": false, "source": "", "status": "", "currentPeriodEnd": 0, "cancelAtPeriodEnd": false}
}
```

| Field | Meaning |
|---|---|
| `enforced` | Whether add-on rules are applied to your requests. The Resolve Platform locks a page only when `enforced` is true and `entitled` is false. |
| `pending` | A checkout started in the last ten minutes has not produced a subscription yet |
| `entitled` | You hold the add-on |
| `source` | `stripe` (bought), `grant` (granted by Vulnetix) or `enterprise` (included in the plan). Empty when not entitled. |
| `status` | The subscription status. Enterprise reports `active`. |
| `currentPeriodEnd` | Unix milliseconds |

A `503` means the add-on state could not be read. Try again.

## Billing routes

Base URL `https://www.vulnetix.com/api/site/v1/`. Except for `GET /v1/billing/addons`, these take the Resolve Platform session only.

| Method | Path | Who | Does |
|---|---|---|---|
| GET | `/v1/billing/overview` | owner, admin | Every subscription, the payment method, billing details, recent invoices and the next charges |
| POST | `/v1/billing/portal` | owner, admin | A Stripe customer portal session; answers `{url, fallback}` |
| GET | `/v1/billing/addons` | any member, or ApiKey | Your entitlement to each add-on |
| POST | `/v1/billing/addons/checkout` | owner, admin | A Stripe Checkout for one add-on; answers `{checkoutUrl}` |
| GET | `/v1/billing/invoice-recipients` | any member | The members who receive invoices |
| PUT | `/v1/billing/invoice-recipients` | owner, admin | Replace that list |

`POST /v1/billing/portal` takes `{"flow", "subscriptionId", "returnUrl"}`. `flow` is `payment_method_update`, `subscription_update`, `subscription_cancel`, or empty for the portal's home page. The two subscription flows need `subscriptionId`. When Stripe refuses a flow, the portal opens at its home page and `fallback` is true.

`POST /v1/billing/addons/checkout` takes `{"kind": "package_firewall" | "soc_intelligence", "returnUrl"}`. Stripe returns you to `returnUrl` with `?addon=<kind>&checkout=success` or `cancel`.

| Status | Meaning |
|---|---|
| `403` | Not an owner or admin. The body names your `role`. |
| `400` | Another `kind`, or a bad body |
| `409` `already subscribed` | You already hold it, Enterprise included. With `"processing": true`, a purchase has completed and is still being recorded. |
| `503` | The add-on cannot be bought yet, or billing is not set up for the organisation |

A member who is not an owner or admin sees "Only an owner or admin can see payment details and invoices" on **Billing**, and still sees the quota.

## Invoice recipients

An owner or admin can choose members to receive a copy of every invoice, in **People and billing access** on **Billing**. Each recipient gets an email titled `Vulnetix invoice <number>: <amount>` with links to the hosted invoice and its PDF, for every invoice across every subscription of the organisation.

```bash
curl -X PUT https://www.vulnetix.com/api/site/v1/billing/invoice-recipients \
  -H "Authorization: Bearer $SESSION_JWT" \
  -H 'Content-Type: application/json' \
  -d '{"principalUuids": ["<principal uuid>", "<principal uuid>"]}'
```

The list replaces the old one. Up to 50 recipients, each an active member with an email address; anything else is `400` `recipients must be active members with an email address`. The Resolve Platform offers the switch for people only, not for service accounts.

## Usage

The **Quota** section of **Billing** shows today's Vulnerability Database API use against the plan's daily limit. Below Business it counts your own key. On Business each member key has its own quota, and the section shows every key's use. **API log** opens the request log at `/resolve/logs`.
