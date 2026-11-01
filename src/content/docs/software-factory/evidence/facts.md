---
title: Facts
description: An index of what every session and run touched (vulnerabilities, repositories, files, domains, tools, models) so you can find every run that worked on a CVE or every session that reached a domain.
order: 6
sources: [vdb-site/docs/factory.md, vdb-site/docs/belai-session-facts.md, vdb-site/api/internal/facts/kinds.go, vdb-site/api/internal/handler/factory_facts.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

Facts are an append-only index of `(kind, value)` pairs about sessions and runs: which vulnerabilities a session talked about, which repository and branch it worked on, which files it read and wrote, which domains it reached, which tools and models it used. They let you ask questions across everything: every run that touched `CVE-2021-44228`, every session that reached `pastebin.com`, every run that used `jev`.

## Kinds

| Group | Kinds |
|---|---|
| Security | `vuln`, `cwe`, `purl`, `finding` |
| Code | `repo`, `branch`, `commit`, `pr`, `issue`, `card`, `project` |
| Files | `file.read`, `file.write`, `filename` |
| Network | `domain`, `domain.suffix`, `ip` |
| Tools | `tool`, `tool.error`, `mcp`, `skill`, `command`, `command.line`, `permission`, `ask` |
| Models, modes and agents | `model`, `provider`, `mode`, `effort`, `profile`, `agent`, `subagent`, `agent.mention`, `role`, `crew`, `adapter` |
| Where it ran | `host`, `os`, `belai.version`, `origin` |
| The run | `trigger`, `event`, `source`, `node`, `goal`, `turn` |
| The person on a call | `client.ip`, `client.country`, `client.region`, `client.city`, `client.locale`, `client.browser`, `client.os`, `client.device` |

### Private kinds

`file.read`, `file.write`, `filename`, `command`, `command.line`, `agent.mention` and the eight `client.*` kinds can reveal more than other kinds, so they are **private**. The Events and Audit pages refuse them as filters. Pages that show them, such as a session's own page, ask for them by name.

> [!WHY] Why facts are separate from events
> Events and the audit ledger promise never to hold file paths or command lines. Facts need them to be useful, so they live in their own index with their own access rules, and commands are redacted before they are stored.

## Who can read them

A run's facts are visible to your tenant. A session's facts are visible to the person who owns the session, or to anyone in the tenant when a factory run's step ran that session. A session you may not read is not found.

## Where you use them

- **Filters**: `fact=kind:value` on Runs, Events and Audit, up to 5 pairs, all of which must match. A filter that matches more than 500 subjects says the list is cut.
- **A run or session**: the facts it carries, with when each was first and last seen, so a page can draw a timeline of models and modes.
- **Search by value**: every run and session that carries a fact, or every value under a prefix such as a directory or `CVE-2021-`.
- **A cross-tab**: two kinds against each other, such as models against repositories.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/runs/{id}/facts?kinds=model,vuln` |
| GET | `/v1/factory/sessions/{id}/facts?kinds=` (up to 3,000) |
| GET | `/v1/factory/facts?kind=&value=&prefix=1` |
| GET | `/v1/factory/facts/matrix?rows=&cols=&where=&since=` |
