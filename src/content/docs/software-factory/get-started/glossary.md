---
title: Glossary
description: Short definitions of the words these docs use, each with a link to the page that explains it in full.
order: 6
checked: [vdb-site@284f1d6, belai@35506b9]
updated: 28 Oct 2026
---

**A2A.** Agent-to-agent messages between hosts, relayed by Vulnetix. The A2A blackout stops the relay. See [A2A messaging](/software-factory/workforce/a2a-messaging/).

**Agent.** A Belai profile: a model, a system prompt, tools and limits. Only worker-mode agents can be dispatched by the factory. See [Agents](/software-factory/workforce/agents/).

**Approval.** A human decision a run waits for. Its kind is `plan`, `merge`, `escalation`, `suppression` or `budget`. See [Human approval](/software-factory/decisions/human-approval/).

**Approve when ready.** How the console shows the autonomy level `auto_merge_low_risk`. The factory approves a ready pull request, and a person merges it.

**Atom.** In these docs' own tooling, one thing a user can touch, such as a route, a setting or a flag. It is not a factory concept.

**Audit ledger.** The permanent, hash-chained record of every change. See [The audit ledger](/software-factory/evidence/audit-ledger/).

**Autonomy.** How far the factory may go on a repository: `observe`, `suggest`, `draft_pr` or `auto_merge_low_risk`. See [Autonomy levels](/software-factory/control/autonomy/).

**Belai.** The agent harness that runs every session, and the CLI and TUI you use by hand. See [Belai CLI and TUI](/software-factory/belai/install-and-sign-in/).

**Blackout.** A recurring window, set in `schedules.blackout`, during which the factory starts no new work: runs started in it wait as `held`. Separate from the A2A blackout.

**Board.** The kanban board of cards. See [The board](/software-factory/workforce/board/).

**Card.** One unit of work on the board, with a key like `K-7f21`. When mirroring is on, it is the same record as a GitHub issue.

**Checkpoint.** Anything waiting on a person. See [Checkpoints](/software-factory/decisions/checkpoints/).

**Cockpit.** The Software Factory home page in the console. See [The cockpit](/software-factory/evidence/cockpit/).

**Crew.** Agents dispatched together to one host for one step. See [Crews](/software-factory/workforce/crews/).

**Default workflow.** One of the seven workflows every managed org gets. Their slugs start `sys-`. See [Default workflows](/software-factory/workflows/default-workflows/).

**Dispatch.** A request to a host to start a session.

**Dry run.** Validating a workflow and walking a sample event through it without running anything.

**Event stream.** The live feed of factory events, kept 30 days. See [The event stream](/software-factory/evidence/event-stream/).

**Fact.** An indexed `(kind, value)` pair recorded for a session or run, such as a vulnerability id or a file. See [Facts](/software-factory/evidence/facts/).

**Gate.** A deterministic check step with no model. See [Gate node](/software-factory/workflows/nodes/gate/).

**Held.** Waiting for a hold to lift: a pause, stop, maintenance window or blackout. Held work is never dropped.

**Host.** A machine running Belai that can take dispatches: a Pix Sandbox or your own. See [Hosts and placement](/software-factory/workforce/hosts-and-placement/).

**Kill switch.** Pause or stop the whole factory. See [Pause, stop and resume](/software-factory/control/pause-and-stop/).

**Managed org.** A GitHub App installation the factory may act on. See [Managed orgs and repositories](/software-factory/control/managed-scope/).

**Needs you.** The head of the checkpoint queue, shown on the cockpit.

**Pix.** The factory coordinator you talk to on a call. Also the name of the sandbox product and of the model allocation in your plan. See [Calling Pix](/software-factory/pix/calling-pix/).

**Pix Sandbox.** A container Vulnetix runs for you as a host. See [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/).

**Read-back.** What Pix says before it starts or stops anything on a call. It acts only on a plain yes to the read-back.

**Run.** One execution of a published workflow version. See [Runs and steps](/software-factory/runs/runs-and-steps/).

**Session.** One Belai conversation on a host, started by a dispatch or by a person. See [Sessions](/software-factory/runs/sessions/).

**Stop the line.** A gate that keeps failing after `stopTheLineAttempts` loops ends the run with `stopped_line:<node>`.

**System One.** The fast classifier models (Clef, Clef Flash, Jev) that decision nodes call. See [System One decisions](/software-factory/decisions/system-one/).

**Template.** A ready-made workflow you can start from. See [Templates](/software-factory/workflows/templates/).

**Tenant.** Your Vulnetix organisation. Every factory record belongs to one.

**Trigger.** What starts a run. See [Triggers](/software-factory/workflows/triggers/).

**Workflow.** A versioned graph of nodes, edges, limits and scope. See [Workflow graphs](/software-factory/workflows/graphs/).
