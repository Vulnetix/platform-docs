---
title: What the factory never does
nav: What it never does
description: The hard limits. These are built into the code and the GitHub App's permissions, not settings you might change by accident.
order: 4
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_settings_store.go, website/src/shared/pix-pocket.ts]
checked: [vdb-site@597344c, website@58b9ffa]
updated: 28 Oct 2026
---

Most of the factory's behaviour is a setting. The limits on this page are not. Each one is enforced by code or by the permissions the GitHub App holds, so no workflow, setting or agent can get past it.

## It never merges

The GitHub App has `contents: read`, not `contents: write`. Nothing in the factory can merge, enable auto-merge or push to your default branch. The highest autonomy level, `auto_merge_low_risk`, is shown as **approve when ready**. At that level the factory submits an APPROVE review once a pull request is ready, and a person or your merge queue merges it.

## It never pushes to a protected branch

`forge.protected` is on by default and only an owner or admin can switch it off for a repository. Agents push to their own branches, named with `forge.branch_prefix` (`belai/K-` by default). The merge conflict fixer is the one exception that pushes to an existing pull request's head branch. It only fast-forwards that branch, and only after its fix passes. A fork's pull request gets a comment instead.

## It never acts outside managed orgs

An installation that is not managed is read-only to the factory. A managed org that is switched off starts no new run from an event. Runs it already started finish, and the kill switch stops those.

## It never polls GitHub

`forge.polling.forbidden` is locked on, on every forge. The factory learns about GitHub, and about each [forge connection](/software-factory/control/forge-connections/), from webhooks and its mirror tables, and no page load calls a forge. The one exception is a binding with no webhook, which falls back to a conditional poll every 10 minutes using `If-None-Match`; an unchanged response costs nothing against your rate limit. Every button that calls GitHub shows its price first.

## It never drops a held run

Pauses, stops, maintenance windows and schedule blackouts hold work. Held runs show up and start when the hold lifts. A schedule fire that arrives while the factory is paused or stopped starts no run. `schedules.missed` (`run_once` by default) is the policy for those fires, but no held-fire count is stored yet, so none is replayed on resume.

## It never runs a model decision you cannot see

A [decision](/software-factory/workflows/nodes/decision/) node chooses only between outcomes you listed, and each outcome must lead somewhere you drew. A model never writes free text into the path of a run. [Gates](/software-factory/workflows/nodes/gate/) never consult a model.

## It never acts on a voice instruction without a plain yes

On a [Pix call](/software-factory/pix/calling-pix/), anything that starts or stops work is read back to you first, and runs only if your very next answer is yes. A proposal expires after 2 minutes. Pix speaks only figures its tools read from your factory's records. It does not add them up itself, and call history keeps no audio.

## It never counts a bot as a person

[Delivery](/software-factory/evidence/delivery/) figures count people and agents separately. A bot account is never counted as a contributor, and a figure that was not recorded reads "Not recorded yet", never zero.

## It never runs factory work with the AI Firewall off

`firewall_enabled` is locked on. On a factory host, the [AI Firewall](/software-factory/evidence/firewalls/) sits between Belai and the model provider for factory sessions, and a project setting cannot switch it off for them.

## It never stores secrets in events or the ledger

Event payloads are at most 8 KiB and never hold prompts or secrets. The audit ledger records that agent memory changed, not what the note says.
