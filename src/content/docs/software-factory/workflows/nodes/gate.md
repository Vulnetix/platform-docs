---
title: Gate node
description: A deterministic step with no model that reads the crew's check runs, applies the quality gate and release jail, and decides whether the work passes.
order: 14
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_engine_node_gate.go]
checked: [vdb-site@597344c]
updated: 28 Oct 2026
---

A gate decides pass or fail from facts, never from a model. It usually sits after a crew: did the change the crew made pass its checks, and is it clean of malware and blocked findings?

## What it checks

- **Check runs.** The gate reads the GitHub check runs of the crew's change from the factory's mirror: the pull request's head commit if there is one, otherwise the newest check suite on the card's branch. While checks are still running the step waits, and the `check_run`, `check_suite` and `pull_request` webhooks wake it.
- **Quality gate.** Your organisation's quality gate, for example blocking malware, applied to findings from a scan that ran after the crew.
- **Release jail.** Your release jail policy, applied to the same findings.

Without a scan after the crew, the quality gate and release jail are recorded as `not_evaluated`.

## Config

| Key | Values | Default |
|---|---|---|
| `profile` | `org_default`, `strict`, `custom` | `org_default` |
| `releaseJail` | `enforce`, `warn` | `enforce` |
| `onFail` | `return_to_crew`, `end_run`, `human_approval` | required on publish; the engine falls back to `return_to_crew` |
| `checkSource` | `mirror`, `posture`, `live_if_stale` | `mirror` |
| `liveIfOlderThanMs` | milliseconds, 0 to 86,400,000 | `forge.stale.checks` (2 minutes) |
| `maxGithubCalls` | 0 to 100 | |
| `onQuotaLow` | `use_cached`, `defer`, `escalate` | |

`releaseJail: warn` records a jail hit without failing the gate. A jail policy in warn mode does the same. The `strict` profile also fails a commit that has no check runs at all.

## When it fails

| `onFail` | Effect |
|---|---|
| `return_to_crew` | The run follows the loop edge back to the crew, which tries again. After `stopTheLineAttempts` loops (3 by default) the run fails with `stopped_line:<node>`. With no loop edge, the run fails with `gate_failed:<node>`. |
| `end_run` | The run fails. |
| `human_approval` | A person decides. Approving passes the gate; rejecting fails the run. |

> [!WHY] Why gates never ask a model
> A gate is the last check before something reaches your repository. Its answer has to be the same every time for the same facts, and you have to be able to see why it said no.

## Live reads

A gate normally reads only the mirror, which costs nothing. With `checkSource: live_if_stale` it may read GitHub live, but only when the newest signal is older than `liveIfOlderThanMs` and checks are still pending, and only through the quota guard as a deferrable call. `onQuotaLow` says what to do if the factory's GitHub share is running out: use the cached answer, defer the step, or escalate to a person.

## Related

- [Scan node](/software-factory/workflows/nodes/scan/)
- [GitHub quota](/software-factory/cost/github-quota/)
