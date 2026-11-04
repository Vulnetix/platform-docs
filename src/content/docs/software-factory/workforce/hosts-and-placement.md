---
title: Hosts and placement
description: The machines factory work runs on, how the factory picks one for each step, tenant placement settings, eligibility, worker states, and host requests to people.
order: 6
sources: [vdb-site/docs/factory.md, vdb-site/docs/belai-host-attention.md, belai/docs/fleet.md, vdb-site/api/internal/handler/factory_host_select.go, vdb-site/api/internal/handler/factory_hosts_eligibility.go]
checked: [vdb-site@284f1d6, belai@35506b9, website@a31d470]
updated: 05 Nov 2026
---

A **host** is a machine running Belai in remote control mode (`belai rc`). It keeps a connection open to Vulnetix, advertises the repositories and directories it has and the agents and crews it offers, and takes dispatches. There are two kinds:

| Kind | Is |
|---|---|
| Pix Sandbox | A container Vulnetix runs for you. See [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/). |
| Self-hosted | Your own machine running `belai rc`. See [Remote control](/software-factory/workforce/remote-control/). |

How many self-hosted hosts you can run depends on the plan. Community includes one, free; a second one is refused with `"code": "host_limit"` while the first is active (seen in the last 45 seconds). Pro, Business and Enterprise enrol any number. Pix Sandboxes never count against the limit. See [Who can use it](/software-factory/#who-can-use-it).

The Pix Sandboxes page (`/resolve/belai-hosts`) lists both, with each host's status, workers, sessions and version.

## Placement

A crew step says where it may run with `runOn`, and the tenant sets a default:

| Setting | Values | Default |
|---|---|---|
| `hosts.runOn` | `auto`, `pix_sandbox`, `self_hosted`, `host:<uuid>`, `label:<name>` | `auto` |
| `hosts.runOnFallback` | `none`, `auto` | `auto` |

| `runOn` | Means |
|---|---|
| `auto` | Any online host that offers the agent or crew and has the repository, or can clone it |
| `pix_sandbox` | Only a Pix Sandbox |
| `self_hosted` | Only your own machines |
| `host:<uuid>` | Exactly that host |
| `label:<name>` | The host whose hostname, or whose sandbox name, is `<name>`. Name a sandbox by its sandbox name: every sandbox's hostname is the same. |

A step that names no `runOn` (every default workflow, for example) takes `hosts.runOn`. The tenant's setting also orders the hosts a step's own `runOn` allows.

### Which hosts are candidates

Only the hosts of the run's principal: the workflow's author, or for a default workflow, the member who made the organisation managed. Cards, dispatches and sessions are all scoped to that person, so a host another member registered would never see the card.

> [!CAREFUL] Run belai rc as the right person
> `belai rc` registers its host under the person signed in to the Vulnetix CLI. Sign in as the member whose workflows should land there, or the factory will not use that host.

### Eligible and ranked

A host is eligible when it advertises the agent or crew, and either offers a directory whose git remote is the run's repository, or is a self-hosted machine that can clone it (`agents.clone`, on by default) and the GitHub App can read the repository. Pix Sandboxes never clone; they work on the repositories you added.

Eligible hosts are tried in this order:

1. Hosts with the repository before hosts that would clone it
2. Within each, the hosts `hosts.runOn` prefers
3. Then the most free worker slots
4. Then the most recently seen

A full host stays in the list, last in its class. A Pix Sandbox draining for an update in its maintenance window is skipped.

When no host can take a step, see [Waiting for a machine](/software-factory/runs/waiting-for-a-machine/).

### Checking eligibility

```http
GET /v1/factory/hosts/eligibility?repo=acme/api&profile=belai:builder&kind=profile
```

Every host you have, with its state for a step on that repository, eligible hosts first in the order a dispatch would try them:

| State | Means |
|---|---|
| `ready` | Has the repository and offers the agent |
| `can_clone` | Would clone the repository |
| `no_repo` | Does not have the repository and cannot clone it |
| `no_profile` | Does not offer the agent or crew |
| `offline` | Not running |
| `full` | No free worker slots |
| `draining` | A Pix Sandbox draining for an update in its maintenance window: online, but takes no new step |

## Workers on a host

Each worker on a host is in one of these states: `starting`, `working`, `idle`, `paused`, `stopping`, `stopped` or `failed`. The cockpit's Fleet view and the Workforce page show them.

## When a host needs a person

A host runs where nobody sits, so it cannot open a browser. When it needs something, it asks Vulnetix, which tells the host's owner through your notification channels. The owner, or a tenant owner or admin, decides from the notification or the Hosts page, and the host reads the answer on its next heartbeat.

| Kind | Reasons | Approving |
|---|---|---|
| `login` | `credential_expiring`, `reauth_needed` | Completes a sign-in for the host's own person. The host stores the new login. |
| `approve` | `approval_needed`, `action_needed` | Records the decision. The host acts on it. |

The reason comes from this fixed list; a host cannot put its own words in front of you.

## In the terminal

`/fleet` in the TUI starts, stops and watches the board's worker agents on this machine.

## API

| Method | Path |
|---|---|
| GET | `/v1/belai/hosts` |
| PUT | `/v1/belai/hosts/{hostId}` |
| GET | `/v1/factory/hosts/eligibility` |
| GET | `/v1/factory/fleet` |
| GET | `/v1/belai/repo-hosts` (which hosts have a repository) |
| POST | `/v1/belai/attention/{id}/decide` (decide a host request; the waiting ones are listed under `attention` in `GET /v1/belai/hosts`) |
