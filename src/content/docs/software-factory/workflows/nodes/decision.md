---
title: Decision node
description: A step where a System One model picks one of the outcomes you listed. Covers every config key, what happens under the threshold or with no answer, and the special edges that let a graph route those cases itself.
order: 12
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/docs/factory-systemone.md, vdb-site/api/internal/handler/factory_engine_node_decision.go, vdb-site/api/internal/systemone/decide.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

A decision step asks a fast classifier a closed question about the run, such as "Is this finding worth an automated patch now?". The model answers with one of the outcomes you listed and a confidence between 0 and 1. The run follows the edge for that outcome only if the confidence clears the threshold. How the models work, and how to choose one, is on [System One decisions](/software-factory/decisions/system-one/).

## Config

```json
{ "id": "n3", "type": "decision", "title": "worth_patching",
  "config": {
    "adapter": "clef-flash",
    "question": "Is this finding worth an automated patch now?",
    "threshold": { "value": 0.8, "adapter": "clef-flash" },
    "belowThreshold": "escalate_human",
    "onAbstain": "escalate_human",
    "fallback": { "adapter": "jev", "threshold": { "value": 0.6, "adapter": "jev" } },
    "dailyCapShare": "25%",
    "rationaleRetention": "full_400d",
    "outcomes": [ { "value": "patch_now" }, { "value": "batch_weekly" }, { "value": "suppress_candidate" } ] } }
```

| Key | Values | Notes |
|---|---|---|
| `adapter` | `clef-flash`, `clef`, `jev`, `jev-<version>`, `tev1`, `pix-fast`, `vault:<entry>` | Required on publish. A draft that leaves it out runs on the tenant's `systemone.model`. |
| `question` | text, at most 500 characters | What the model is asked. |
| `threshold` | `{value 0..1, adapter}` | The minimum confidence, and the adapter it was set for. Required on publish, except for `pix-fast` and `vault:` adapters. |
| `belowThreshold` | `escalate_human`, `route_to_fallback_model`, `take_safest_outcome`, `end_run` | What to do when the confidence is too low. |
| `onAbstain` | `escalate_human`, `retry_once_then_escalate`, `end_run` | What to do when there is no answer. |
| `fallback` | `{adapter, threshold}` | The second model. Required for `route_to_fallback_model`. |
| `dailyCapShare` | `"25%"`, `"unlimited"` | How much of the daily decision cap this step may use. Recorded but not yet enforced per workflow: the tenant cap is the guard. |
| `rationaleRetention` | `full_400d`, `hash_only`, `days_30` | How long the model's reasons are kept. |
| `outcomes` | `[{value, end?}]` | The answers the model may give. `end: true` marks an outcome that ends the run, which needs no edge. |

Each outcome needs an outgoing edge unless it is marked `end`. Otherwise publish fails with `outcome_without_route`.

## What happens to the answer

| Result | The run |
|---|---|
| Confidence at or above the threshold | Follows the edge for the chosen outcome. |
| Under the threshold, and an edge `$below_threshold` exists | Follows that edge. |
| No answer, and an edge `$unknown` exists | Follows that edge. |
| Otherwise, under the threshold | Does what `belowThreshold` says. |
| Otherwise, no answer | Does what `onAbstain` says. |

The actions:

| Action | Effect |
|---|---|
| `escalate_human` | Creates an approval of kind `escalation` and the step waits. Approving takes the model's pick, or the safest outcome if it had none. Rejecting fails the run as `rejected`. |
| `route_to_fallback_model` | Asks the fallback model once, with its own threshold. |
| `take_safest_outcome` | Takes the **last** outcome listed. List your safest outcome last. |
| `retry_once_then_escalate` | Asks again once, then escalates. |
| `end_run` | Ends the run as succeeded, with reason `ended:<node>`. |

**No answer** covers more than a model declining to choose. Any adapter error, an adapter that is not configured, a hit daily cap, and a threshold set for a different adapter all count as no answer.

> [!WHY] Why the special edges win over the actions
> `$below_threshold` and `$unknown` let a graph handle uncertainty with its own steps, for example a cheaper scan or a card for a person, instead of the built-in actions. If you draw them, they are used.

> [!CAREFUL] Generative adapters do not decide yet
> `pix-fast` and `vault:` entries are accepted by the validator, but they are not wired into the decision registry yet, so a step that names one always gets no answer. Use `clef-flash`, `clef` or `jev`.

## The threshold belongs to its adapter

A threshold is stored with the adapter it was set for, because a confidence of 0.8 from one model does not mean the same as 0.8 from another. A threshold written as a bare number is accepted on save and refused on publish with `threshold_adapter_missing`. A step that names an adapter that does not exist, or cannot be used, is refused with `adapter_unavailable`. Changing the tenant's `systemone.model` without a new `systemone.min_confidence` is refused with `threshold_required`.

## What is recorded

Each decision writes a ledger row, an audit entry of kind `decision` and a `decision` event, in the same transaction as the step. The row stores a hash of the input, never the text. Decisions show in the run trace and on the decision inspector in the builder.

A person can **override** a decision until the run has moved past it. If the step is waiting on an escalation, the approval is cancelled and the step takes the person's outcome. Once a later step has started, the override is refused with `bad_state`. Overriding an outcome that is not one of the step's outcomes is refused with `invalid_outcome`. See [Human approval](/software-factory/decisions/human-approval/).

> [!PIX] Ask why a run went the way it did
> On a call, ask "why did triage escalate on the payments pull request?". Pix reads the decision's outcome, confidence and threshold with `run_facts` and says them back.

## Related

- [System One decisions](/software-factory/decisions/system-one/) for the models, the daily cap and the tenant defaults.
- [Human approval](/software-factory/decisions/human-approval/) for escalations.
