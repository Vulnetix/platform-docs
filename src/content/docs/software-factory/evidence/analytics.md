---
title: Analytics
description: Token use and activity across your Belai sessions, by day, hour, host, model and agent, read from the sessions your hosts already sync.
order: 12
sources: [vdb-site/docs/belai-analytics.md, belai/docs/git-directories-analytics.md, vdb-site/api/internal/handler/belai_analytics.go]
checked: [vdb-site@284f1d6, belai@35506b9]
updated: 28 Oct 2026
---

Analytics shows token use across your Belai sessions: on the console's token use panels, per host and per agent. It reads the sessions and transcript entries your hosts already sync, and needs nothing set up.

## What is counted

| Figure | From |
|---|---|
| Calls and tokens | Each model reply. Tokens are the total the host recorded, or prompt plus completion. A reply with no usage counts as a call with no tokens. |
| Models | `provider/model` from each reply, else the session's model, else `unknown` |
| Tools | Each tool call |
| Turns | How each turn ended |

A session is in the window when it was last updated within it, and an entry when it was written within it.

## Request

```http
GET /v1/belai/analytics?days=30&host=<uuid>&tz=600
```

| Parameter | Meaning |
|---|---|
| `days` | 7 (the default), 30 or 90 |
| `host` | Only that host's sessions. A host you do not own comes back empty. |
| `tz` | Minutes east of UTC, to place day and hour edges |

Every query is scoped to your own sessions.

## Git directories

Belai also works out the git directories around a session, read-only: the repository and its top-level layout (file counts per directory), the checkouts next to it, and the directories a `belai rc` daemon offers to the console for starting work.

## Related

- [Usage and spend](/software-factory/cost/usage/)
- [Token budgets](/software-factory/belai/token-budgets/) for session intelligence inside Belai.
