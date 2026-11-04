---
title: The settings document
nav: Settings document
description: How factory settings are stored as one revisioned document per tenant, saved and exported, with delayed keys, locked keys and per-host project overrides.
order: 7
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_settings_store.go, website/src/shared/factory-settings.ts]
checked: [vdb-site@597344c, website@58b9ffa, belai@8aa7760]
updated: 28 Oct 2026
---

All factory settings live in one document per tenant. The Settings page (`/resolve/factory-settings`) edits it. You can change many keys and save them together: the page counts your unsaved changes and offers **Save** and **Discard**. Only owners and admins can save.

Every key, with its type, allowed values and default, is in the [settings reference](/software-factory/reference/settings/). This page explains how the document behaves.

## Sections

| Section | Covers |
|---|---|
| Scope and orgs | Managed installations and which repositories count. See [Managed scope](/software-factory/control/managed-scope/). |
| Autonomy | Maximum autonomy, concurrency, retries, waiting. See [Autonomy](/software-factory/control/autonomy/). |
| Defaults | The seven default workflows, `autonomy.default` and the defaults' GitHub write cap. See [Default workflows](/software-factory/workflows/default-workflows/). |
| System One decisions | The default decision model and thresholds. See [System One](/software-factory/decisions/system-one/). |
| Agents and crews | Limits every crew a workflow starts inherits. See [Crews](/software-factory/workforce/crews/). |
| GitHub | Branch prefix, pull request state, protected branches, check runs. |
| Commit signing | Signing of commits a person makes from factory pages. See [Commit signing](/software-factory/decisions/commit-signing/). |
| GitHub data | How the factory reads GitHub: stored data first, live calls last. See [GitHub quota](/software-factory/cost/github-quota/). |
| Hosts | Where runs execute, and sandbox size, egress and versions. See [Hosts and placement](/software-factory/workforce/hosts-and-placement/). |
| Security and provenance | Scanners, SLSA minimum, evidence, TEA. See [Trust and SLSA](/software-factory/evidence/trust-and-slsa/). |
| Budgets | Org-wide token limits. See [Budgets](/software-factory/cost/budgets/). |
| Providers and secrets | Which vault keys the factory may use. See [Providers and keys](/software-factory/workforce/providers-and-keys/). |
| Persistence | Where runs, handoffs and decisions are written. |
| Schedules | The timezone, blackouts and missed fires. See [Holds and blackouts](/software-factory/control/holds-and-blackouts/). |
| Transparency and audit | What you and your auditors can see. See [The audit ledger](/software-factory/evidence/audit-ledger/). |
| Notifications | Browser push and chat. See [Notifications](/software-factory/workforce/notifications/). |
| Delivery estimates | The rates behind the Delivery figures. See [Delivery](/software-factory/evidence/delivery/). |
| Project overrides | Per host and directory settings for Belai sessions. See below. |

The kill switch, **Stop the factory**, is also on this page. See [Pause, stop and resume](/software-factory/control/pause-and-stop/).

## Saving

A save sends only the keys you changed. Every changed key is written in one transaction, with one `setting` event and one audit entry each, holding the old and new value.

The document has a **revision**. A save carries the revision you loaded. If someone else saved since then, yours is refused with `revision_conflict` and the page shows their values. Re-apply your changes and save again. Workflows use a separate check, `version_conflict`, for a draft that has moved on since you opened it.

Some values are checked together:

- Changing `systemone.model` needs a new `systemone.min_confidence` in the same save, or the save fails with `threshold_required`. Confidence from one model is not comparable with another's.
- `forge.check_runs` needs the App permission `checks: write` on every managed installation, or the save fails with `permission_missing`.
- `persistence.postgres` can be switched off only while no workflow is published. Otherwise the save fails with `workflows_published`.
- Lowering `autonomy.max` lowers every repository's effective autonomy at once. Their stored values are kept.

A value that is the wrong type or out of range is refused with the key named, so the page can show the error beside the field.

## Keys that take effect later

Keys stored on a Pix Sandbox, such as the sandbox size, egress mode and version policy, take effect at the next launch. After a save they are listed as pending, and the page shows them as waiting until then.

## Locked keys

Two keys cannot be changed:

| Key | Locked to |
|---|---|
| `forge.polling.forbidden` | `true`. The factory never polls GitHub on a timer; it listens for webhooks and reads stored data. |
| `firewall_enabled` | `true`. The AI Firewall stays on for factory sessions. |

Trying to save one is refused with `403 locked`. So is the read-only `systemone.min_confidence.adapter`, which the server sets itself.

## Export

**Export as YAML** downloads the whole document as Platform IaC documents: [`FactorySettings`](/platform-iac/kinds/factory-settings/), [`ScannerProfile`](/platform-iac/kinds/scanner-profile/) and [`FactoryManagedOrg`](/platform-iac/kinds/factory-managed-org/), each with its own keys. It is the same as `GET /v1/factory/settings?format=yaml`, and `format=hcl` and `format=sh` write Terraform and a script. It is useful for review or for keeping a copy in a repository. `PUT /v1/factory/settings` with `Content-Type: application/yaml` applies either these documents or the older flat export, as manager `console`; `?dryRun=true` returns the plan. Settings applied this way do not send the nudges a save in the Resolve Platform sends (seeding default workflows when `defaults.enabled` changes, engine state and budget refreshes); the scheduler and the next event pick the change up.

## Project overrides

The **Project overrides** section is different: it edits settings that Belai sessions read on one host for one directory. These are not part of the tenant document. The page asks the host for its current values and where each one comes from, and saving sends the change to the host and waits for its answer.

The page offers `mode`, `guardrails`, `ask_permission`, `firewall_enabled` (locked by the factory), `caveman`, `auto_commit_per_task`, `show_reasoning`, `show_tool_calls`, `show_edits`, `show_internal_work`, `tests.post_end`, `tests.on_fail`, `lsp.enabled`, `jev.jobs.tools`, `jev.jobs.edits`, `jev.thresholds.block` and `jev.thresholds.flag`. The host checks every key against its own list and refuses the rest: it also accepts `layout` and per-language `lsp.languages.<id>` (for example `lsp.languages.go`, `lsp.languages.ts`), and it names System One keys by its own jobs and cut-offs (`jev.jobs.<job>`, `jev.thresholds.<cut-off>` such as `deny_at`), so the four `jev.` keys the page offers are refused by current hosts. The host must run `belai rc --web-project-settings` for the page to edit anything.

The line under each value says where it comes from: `project`, `global`, `default`, `env`, `flag`, `repository`, `last_used` or `locked`.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/factory/settings` | `?format=yaml` to export. Includes the revision, who last saved and when, the locked keys, the pending keys and the options for keys whose choices are dynamic. |
| PUT | `/v1/factory/settings` | `{"revision": 14, "values": {...}}`. Owner or admin. Partial: keys you leave out are untouched. |

The response to a save lists each key as `applied` or `pending_launch`, and every value that changed, including any the server derived.
