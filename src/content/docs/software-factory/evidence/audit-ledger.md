---
title: The audit ledger
nav: Audit ledger
description: The permanent, hash-chained record of what the factory, its workers and its people did, how to filter it, verify the chain and export a signed copy.
order: 4
sources: [vdb-site/docs/factory.md, belai/docs/audit.md, vdb-site/api/internal/handler/factory_audit.go, vdb-site/api/internal/handler/factory_audit_store.go, vdb-site/api/internal/handler/belai_audit.go]
checked: [vdb-site@284f1d6, belai@35506b9, website@a31d470]
updated: 28 Oct 2026
---

The audit ledger is the permanent record. Every change in the factory writes an entry **in the same transaction as the change**, so the change and its record cannot disagree. Entries form a hash chain: each one carries the hash of the one before, so removing or editing an entry breaks the chain.

The Audit page (`/resolve/factory-audit`) shows one chain for your tenant, merged with each Belai host's own audit chain (read-only), so one page covers workers, cards, sessions, decisions and settings. Events keep 30 days; the ledger is kept for good.

## Entry kinds

The factory chain:

| Kind | Records |
|---|---|
| `decision` | A System One decision, or a person's override |
| `approval` | An approval decided |
| `setting` | A setting changed, with old and new values |
| `crew_control` | A pause, stop or resume, a crew controlled, or a step that found no host |
| `card`, `claim_lapsed` | A card moved; a claim lapsed |
| `commit`, `pull_request` | A commit; a pull request opened or a conflict card filed |
| `gate` | A gate passed, failed or held |
| `vex`, `finding` | A VEX statement written; a finding carded or reconciled |
| `fault`, `worker` | A worker started, stopped, faulted or changed state |
| `provider_switch` | Work moved to another model provider |
| `session`, `session_deleted` | A session started; a session deleted (a tombstone keeps the chain whole) |
| `a2a_blackout`, `a2a_withheld`, `a2a` | The A2A blackout switched; a host's relay refused during the blackout (a count, never text); messages sent and received |
| `memory` | A person changed agent memory: `created`, `edited`, `deleted` or `cleared`, with the note id and scope, never the text |
| `killswitch` | The kill switch (listed as `crew_control`) |

The ledger also accepts the dotted names hosts use for the same things, so a filter on either finds both: `card.moved`, `gate.held`, `provider.switch`, `session.started`, `session.deleted` and `setting.changed`.

Host chains record, among others: `worker.started`, `worker.stopped`, `worker.state`, `worker.fault`, `worker.fallback`, `card.claimed`, `card.released`, `card.lease_lapsed`, `crew.control`, `gate.verified`, `finding.carded`, `finding.reconciled`, `vex.written`, `repo.commit`, `repo.publish`, `host.dispatch`, `host.first_seen`, `host.rc_online`, `host.rc_offline`, `host.schedule`, `host.teleport`, `host.version_changed`, `a2a.sent`, `a2a.received`, `a2a.blackout` and `a2a.withheld`. A security crew's finding verdict is one of `fixed`, `false_positive`, `no_fix`, `needs_human` or `rejected`.

## Who acted

Each entry names an actor and what kind it is: `user` or `person` (a person in the Resolve Platform), `agent`, `host`, `harness` (Belai itself), `engine` or `system` (the factory), `rule` or `budget_rule` (a policy), `webhook` (GitHub), or `web`. Host chains use `human`, `agent`, `harness` and `web`. The API folds these into `user`, `agent`, `host`, `system` and `rule`.

## Filtering

| Filter | Takes |
|---|---|
| text | words in the entry |
| kind | one or more kinds |
| vuln | a CVE or GHSA id. Also matches sessions and runs whose [facts](/software-factory/evidence/facts/) carry it. |
| card, agent, repo | |
| workflow | a workflow id or slug, or a run id |
| fact | `kind:value`, repeatable |
| chain | `factory` or `host:<id>` |

Each entry links to the events around it.

## Verifying the chain

**Verify** recomputes the hash of every entry in your chain and each host chain. A broken chain shows where it breaks: the entry, the hash expected and the hash found.

## Exporting

**Export signed JSONL** downloads entries for a date range (up to 400 days), one per line in order, ending with a head line that carries the chain head's sequence and hash. The head line is meant to be signed with an AWS KMS key so anyone with the public key can check the export is complete and unchanged; until a key is wired in, its `signature` and `keyId` are null.

## Settings

Settings › Transparency and audit:

| Setting | Default | Effect |
|---|---|---|
| `audit.sign` | on | Sign the decision ledger |
| `audit.calls` | on | Log every model call with its input hash |
| `audit.weekly_report` | on | A weekly factory report to org owners |

These three are stored and shown in Settings; nothing in the factory reads them yet.

> [!WHY] Why the entry is written with the change
> If the record were written after the change, a crash in between would leave a change with no record. Writing both in one transaction means either both happened or neither did.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/audit?q=&kind=&vuln=&card=&agent=&repo=&wf=&fact=&chain=&before=` |
| GET | `/v1/factory/audit/verify` |
| GET | `/v1/factory/audit/export?from=&to=` |
| GET | `/v1/belai/audit` (host chains) |
