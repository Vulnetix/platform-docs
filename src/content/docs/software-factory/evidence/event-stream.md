---
title: The event stream
description: The live feed of everything the factory does. The event kinds and their types, the filters, how to read the stream from your own code, unanswered deliveries, and what an event never contains.
order: 5
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-events.md, vdb-site/api/internal/handler/factory_events.go, vdb-site/api/internal/handler/factory_events_store.go, vdb-site/api/internal/handler/factory_events_unanswered.go, vdb-site/api/internal/handler/factory_sources_siem.go]
checked: [vdb-site@fe1ff17]
updated: 03 Nov 2026
---

Every change in the factory writes an event in the same transaction. The console reads one stream per tab, and every live panel updates from it. No console page polls the factory on a timer. The Events page (`/resolve/factory-events`) shows the stream with filters, a chart and an inspector.

![The Events page with the live list, filters and an open event](/img/sf-events-dark.webp)

## An event

```json
{
  "eventSeq": 48113,
  "ts": 1792661531000,
  "kind": "decision",
  "src": "factory",
  "subject": { "wf": "patch-train", "run": "run_8812", "repo": "acme-platform/payments-api", "card": "K-7f21", "node": "n3" },
  "msg": "node=worth_patching out=patch_now conf=0.93",
  "payload": { "type": "decided", "outcome": "patch_now", "confidence": 0.93, "threshold": 0.8, "action": "proceed" }
}
```

- `eventSeq` rises for every event in your tenant.
- `ts` is when it happened, not when it was delivered.
- `src` is where the fact came from: `factory`, `webhook`, `mirror`, `posture`, `s3`, `api`, `package-firewall`, `ai-firewall`, `egress` or `siem` (a [Guardian](/siem/) trigger fire).
- `payload` is at most 8 KiB and always has a `type`.

> [!CAREFUL] What an event never contains
> No prompts, completions, file contents, tokens or secret values. A decision carries a hash of its input, never the input. Settings that can hold secrets never have their values in an event. Events are kept 30 days.

## Kinds

| Kind | Types |
|---|---|
| `run` | `queued`, `started`, `step.started`, `step.finished`, `step.failed`, `step.deferred`, `held`, `paused`, `resumed`, `cancelled`, `passed`, `failed`, `stopped_line` |
| `decision` | `decided`, `abstained`, `error`, `overridden` |
| `gate` | `held`, `passed`, `failed`, `released` |
| `approval` | `requested`, `approved`, `rejected`, `expired`, `renotified` |
| `handoff` | `handoff` |
| `card` | `created`, `moved`, `claimed`, `released`, `lapsed` |
| `session` | `started`, `prompt`, `asked`, `answered`, `ended`, `finished` |
| `worker` | `started`, `stopped`, `paused`, `failed` |
| `host` | `online`, `late`, `offline`, `slots` |
| `scan` | `started`, `finished` |
| `evidence` | `attested`, `verified`, `failed` |
| `tea` | `publish` |
| `github` | `issues`, `issue_comment`, `pull_request`, `pull_request_review`, `push`, `repository`, `release`, `check_run`, `check_suite`, `workflow_run`, `alert`, `installation`, `sync_conflict` |
| `cron` | `scheduled`, `fired`, `held`, `skipped`, `released`, `schedule_error` |
| `budget` | `threshold`, `exceeded`, `action_taken`, `changed` |
| `quota` | `observed`, `share_threshold`, `exhausted`, `limited`, `reset` |
| `provider` | `switch`, `error`, `key_revoked`, `key_expired` |
| `setting` | `changed` |
| `egress` | `allow`, `deny` |
| `pkg-fw` | `allow`, `block`, `warn` |
| `ai-fw` | `allow`, `redact`, `flag`, `block` |
| `a2a` | `broadcast`, `broadcast_end`, `message`, `reply`, `ack` |
| `memory` | `created`, `edited`, `deleted`, `cleared` |
| `lifecycle` | `entered`, `exited` |
| `siem` | A Guardian trigger fired. The payload's `type` is `siem.fired`; see [Source events](/software-factory/workflows/source-events/#guardian-fires). |

Some types are defined but not written yet, because the [lifecycle ledger](/software-factory/evidence/lifecycle-and-flow/) records those transitions instead: session types other than `finished`, the `host` and `worker` types, `scan.started` and `evidence.attested`. `budget.action_taken`, `quota.reset` and the `provider` types other than `switch` are not written either.

An event that waits on a person carries `needsHuman: true`: a requested approval, a run that stopped the line, a lapsed card, and a crew's card moved into review. The filter `needs=human` selects them. Failure types (`failed`, `error`, `deny`, `block`, `exhausted`) are drawn as failures in the chart.

## Filters

All filters combine with AND, and a comma list inside one filter means OR.

| Filter | Matches |
|---|---|
| `kind` | event kinds, such as `egress,pkg-fw,ai-fw` |
| `src` | where it came from |
| `run`, `card`, `agent`, `crew`, `repo`, `host`, `wf` | the subject |
| `fact` | `kind:value`, repeatable. See [Facts](/software-factory/evidence/facts/). |
| `needs` | `human` |

The subject keys `node`, `step`, `budget`, `model`, `setting`, `installation` and `fw` travel in the payload and can be filtered on too.

## Reading the stream from your own code

`GET /v1/factory/events` is a server-sent event stream. It needs a signed-in console session. Browsers cannot put an `Authorization` header on `EventSource`, so read it with `fetch` and a streaming reader.

| Frame | When | Do |
|---|---|---|
| `event` | One per matching event. Its `id` is the `eventSeq`. | Apply it and remember the id. |
| `ping` | Every 15 seconds of silence. Carries the tenant's newest `eventSeq`. | Reset your idle timer. |
| `reconnect` | The server is about to close: after 5 minutes (`reason: max_duration`), or because your resume point is older than 30 days (`reason: gap`) | Reconnect at once with `Last-Event-ID` set to its `after`. |

Send `Last-Event-ID` (or `?after=`) to resume: you get every matching event since, in order, then the live feed. Treat 20 seconds without any frame as a dead connection. A tenant may hold 20 streams at once and a person 5.

To read pages instead, use `GET /v1/factory/events/list?after=`.

## Unanswered deliveries

Every run and event records the GitHub delivery that caused it. The Events page's **unanswered** view lists deliveries that started no run, so you can see what the factory could have acted on and did not. The [templates](/software-factory/workflows/templates/) ranking uses the same counts.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/events` (the stream) |
| GET | `/v1/factory/events/list?after=&around=` |
| GET | `/v1/factory/events/stats` (counts for the chart) |
| GET | `/v1/factory/events/unanswered` |
