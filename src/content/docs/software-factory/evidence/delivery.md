---
title: Delivery
description: What the factory delivered in a period, the agent time and spend behind it, the decisions it scored, the people it needed, and what the same work would take a team by hand. Every figure is marked measured, derived or assumed.
order: 8
sources: [vdb-site/docs/factory-delivery-api.md, vdb-site/docs/factory-delivery-capture.md, website/.repo/factory-delivery.md, vdb-site/api/internal/handler/factory_delivery_settings.go, vdb-site/api/internal/handler/factory_delivery_estimate.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

Delivery answers "what did the factory get done, and what did it take?". It is a section of the [cockpit](/software-factory/evidence/cockpit/) with five pages behind it. Nothing in it reads GitHub: every figure is a rollup the factory already holds.

![The Delivery section with outcomes, agent time, spend and people](/img/sf-delivery-dark.webp)

## Ranges

Today, 7 days, 30 days, this month, and the quarter (the last 90 days, `90d`). Today starts at midnight and this month on the 1st, in your timezone. You can compare a range with the one before it.

## Measured, derived, assumed

Every figure is marked:

| Mark | Means |
|---|---|
| Measured | Counted from records |
| Derived | Worked out from measured figures |
| Assumed | Built on a rate or time from the `delivery.*` settings |

A figure the factory has not recorded yet is shown as **Not recorded yet**, never as zero.

## The pages

| Page | Console path | Shows |
|---|---|---|
| Delivery | the cockpit's Delivery section | Outcomes, agent time, spend by model, decisions, people, value by role, the comparison with a team by hand, and the outcomes ledger |
| Outcome | `/resolve/factory-outcome` | One outcome traced back to its runs, sessions, decisions and people |
| Decisions | `/resolve/factory-delivery-decisions` | The decisions System One scored, and the time they saved |
| People | `/resolve/factory-people` | The hours people spent in the factory, by what they did |
| Contributors | `/resolve/factory-contributors` | Everyone who started, decided, reviewed or signed something, internal or external |
| Contributor | `/resolve/factory-contributor` | One person's part |

The outcomes ledger can be exported as CSV.

## People are never bots

A person is counted only where a record names a human. Bots, the GitHub App, service accounts and `Pix [bot]` commits are listed under **Seen, and left out**, and never counted. `delivery.companyDomain` (an email domain such as `acme.example`) marks who is internal.

People's time is built from **sittings**: actions close together count as one sitting, and a gap of `delivery.idleGapMin` minutes (5 by default) ends it. The sources of people's actions can each be switched off: `delivery.sources.checkpoint`, `commit`, `comment`, `review`, `chat`, `notification`, `admin` and `pixcall`.

## The by-hand comparison

The comparison asks what the same work would take a team. Agent work is priced by **role**, each with an hourly rate and a multiplier:

| Role | Rate (USD/h) | Multiplier |
|---|---|---|
| `sse` (senior engineer) | 95 | 2.4 |
| `security` | 110 | 2.0 |
| `qa` | 70 | 2.2 |
| `devops` | 90 | 2.0 |
| `reviewer` | 95 | 1.5 |
| `planner` | 120 | 1.6 |
| `writer` | 60 | 1.8 |

Each role's keys are `delivery.roles.<role>.enabled`, `.rate` and `.mult`.

Decisions are priced by **kind**, with the minutes a person would take:

| Kind | On | Minutes |
|---|---|---|
| `toolcall` | off | 0 |
| `mode` | on | 0.5 |
| `goal` | on | 3 |
| `plan` | on | 4 |
| `triage` | on | 6 |
| `merge` | on | 8 |
| `other` | on | 2 |

Each kind's keys are `delivery.kinds.<kind>.enabled` and `.minutes`.

> [!WHY] Why every assumption is a setting
> A comparison is only as honest as its rates. Putting each rate and time in Settings, and marking every figure that uses one, lets you check the arithmetic and set it to your own team's numbers.

## Settings

Settings › Delivery estimates. The page previews the result as you change them.

| Setting | Default | Meaning |
|---|---|---|
| `delivery.enabled` | on | The master switch. Off, nothing is computed. |
| `delivery.value` | on | Price agent work by role |
| `delivery.decisions` | on | Price the decisions System One scored |
| `delivery.compare` | on | The by-hand comparison, with refinement and hand-off overhead |
| `delivery.people` | on | The People and Contributors pages |
| `delivery.multiplier` | 2.4 | Multiplier for agent work no role covers (0.5 to 10) |
| `delivery.rate` | 95 | USD per hour for agent work no role covers |
| `delivery.peopleRate` | 110 | USD per hour for the hours people spent in the factory |
| `delivery.overheadPct` | 20 | Refinement and hand-off overhead, as a percentage of build and decision hours |
| `delivery.overheadRate` | 105 | USD per hour for that overhead |
| `delivery.hoursPerMonth` | 150 | Productive hours in a person-month |
| `delivery.manualDecisionWait` | 6 | Hours a team waits for a decision |
| `delivery.manualCycleDays` | 4.5 | Days a team takes per pull request |
| `delivery.manualIssueDays` | 3 | Days a team takes per issue |
| `delivery.manualCardDays` | 5 | Days a team takes per card |
| `delivery.reviewMinPer100` | 4 | Minutes of reading per 100 changed lines of a review |
| `delivery.idleGapMin` | 5 | Minutes without an action that end a sitting |
| `delivery.companyDomain` | none | Your email domain, to tell internal people from external |

> [!PIX] Delivery by phone
> "What did the factory deliver this week?" uses `delivery_value`; "who worked on it?" uses `delivery_people`; "what did System One decide?" uses `delivery_decisions`; and `outcomes_trend` compares periods.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/delivery?range=&tz=&compare=prior` |
| GET | `/v1/factory/delivery/outcomes?range=&q=&person=&format=csv` |
| GET | `/v1/factory/delivery/outcomes/{key}` |
| GET | `/v1/factory/delivery/decisions` |
| GET | `/v1/factory/delivery/people` |
| GET | `/v1/factory/delivery/contributors?scope=internal` |
| GET | `/v1/factory/delivery/contributors/{key}` |

Every member of your organisation can read these pages, including the per-person ones.
