---
title: Waiting for a machine
description: Why a crew step waits, skips or fails when no host can take it, how long it waits for each reason, and what you can do about each one.
order: 4
sources: [vdb-site/docs/factory-engine.md, vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_engine_nohost.go, vdb-site/api/internal/handler/factory_engine_capacity.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

A crew step needs a host that is online, offers the crew or agent, and has the repository or can clone it. When there is none, the engine works out why and acts on that reason. It does not guess. The reason appears in three places: on the step, as a `crew.waiting` event on the run, and on the card, which shows why it is waiting.

## Reasons

When several machines have the repository, the one closest to working decides.

| Reason | When | What happens | What you can do |
|---|---|---|---|
| `online_no_workers` | A host is online with the repository and the crew, and runs no worker | Not a wait. The dispatch goes out now. | Nothing |
| `draining` | A Pix Sandbox with the repository is updating in its maintenance window | Waits 2 minutes at a time, then runs on the first host that is ready | Wait |
| `launching` | A sandbox launch is in progress | Waits 3 minutes at a time | Wait |
| `repo_not_cloned` | The host has the repository attached but not checked out yet | Waits 5 minutes at a time. After 30 minutes the step is skipped. | Check the sandbox's repositories |
| `failed_relaunching` | The sandbox's launch failed, there is none, or its remote control stopped reporting | Asks the sandbox to relaunch, then waits 3 minutes at a time. At most 6 relaunch requests an hour. | Check the sandbox on Pix Sandboxes |
| `profile_not_offered` | A machine with the repository is online but does not offer the agent or crew | Skipped at once | Update Belai on that machine, or import the profile |
| `stopped_by_user` | Someone stopped the sandbox | Waits 10 minutes at a time. **Never woken.** The step names who stopped it. | Start the sandbox |
| `host_offline` | Your own machine with the repository is not running `belai rc` | Waits 10 minutes at a time. The host can also show in Needs you as `host_offline`. | Start `belai rc` on it |
| `repo_not_attached` | Machines can run work but none has the repository | Skipped, or fails if the step is pinned with `runOnFallback: none` | Add the repository to a sandbox, or check it out on a host |
| `no_machine` | No usable sandbox or host for the step's `runOn` | Skipped, or fails if pinned | Connect a host, or change `runOn` |

A skipped step lets the run carry on. A step that fails because of `runOnFallback: none` ends the run with `no_host:<node>`.

> [!WHY] Why a stopped sandbox is never woken
> If a person stopped a sandbox, they meant it. Waking it for a workflow would undo their decision without asking. The step waits and says who stopped it, so you can decide.

## A full host

When a host is full, it either refuses the dispatch with its worker cap or starts it and leaves the card unclaimed. Neither counts as a failure: the step waits as `deferred:capacity`, asks the host again after 10 minutes, and spends no attempt. Unlike other waits, a capacity wait keeps its concurrency slot. After `autonomy.no_host_ttl_hours` it fails with `capacity_timeout`.

## A dispatch nobody claims

If a crew starts on a host but never opens a session for its card within `autonomy.claim_ttl_minutes` (60 by default), the attempt fails with `card_unclaimed` and is retried. The clock runs from the dispatch, not the step.

## How long a step may wait

| Setting | Default | Effect |
|---|---|---|
| `autonomy.no_host_ttl_hours` | 6 | A step that has waited this long fails with `no_host_timeout` and the run ends. |
| `autonomy.parked_concurrency` | 50 | How many runs may wait for a machine at once. One more ends at once with `no_host_timeout`. |

A run that is only waiting for a machine does not count against `autonomy.concurrency`, so waiting cannot starve other runs.

## Seeing each host's reason

When no host takes a step, the step's event lists up to 12 hosts with why each was passed over. You can ask the same question at any time:

```http
GET /v1/factory/hosts/eligibility?repo=acme/api&profile=belai:builder&kind=profile
```

Each host comes back with a state (`ready`, `can_clone`, `no_repo`, `no_profile`, `offline` or `full`) and a sentence. See [Hosts and placement](/software-factory/workforce/hosts-and-placement/).

## Related

- [Crew node](/software-factory/workflows/nodes/crew/)
- [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/)
- [Remote control](/software-factory/workforce/remote-control/)
