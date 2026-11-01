---
title: Bot attribution
nav: Attribution
description: How commits and comments the factory's agents make are marked, so anyone reading the history can see an agent made them and trace them back to the session.
order: 10
sources: [belai/docs/bot-attribution.md, vdb-site/api/internal/handler/belai_github_attribution.go]
checked: [belai@8aa7760, vdb-site@597344c]
updated: 28 Oct 2026
---

Inside a Pix Sandbox, every commit Belai makes carries trailers that say an agent made it:

```
Co-authored-by: ...
Signed-off-by: Pix [bot] <...>
```

with a link to the session that made it and, when the caller passes them, to the vulnerability ids the session touched (at most 10).

## When trailers are added

- Only inside a Pix Sandbox. The sandbox writes `~/.pix/attribution`. Without it, Belai is not in a sandbox and adds nothing, so a developer's own commits are never signed off by a bot.
- Belai's own commits (a worker's commit, the TUI's auto-commit, remote control's auto-commit) add them in code.
- A model's own `git commit` gets them from the sandbox's commit hook.
- Before a branch is published, Belai adds any trailers a repository's own hooks kept out. If that rewrite fails, the branch is published as it was.
- The comment that closes a duplicate pull request carries them too.

Agents are told the trailers are added for them and must not write, change or remove them.

> [!WHY] Why mark agent work in the history
> A reviewer reading `git log` a year from now should be able to tell which changes a person made and which an agent made, and find the session that explains why.

## On GitHub and other forges

The factory recognises its own identities: the Vulnetix App's bot, `Pix [bot]` and commits authored by `security@vulnetix.com`. On a [forge connection](/software-factory/control/forge-connections/) its identity is the connection's bot account instead: its commits, pull requests and comments there sign off as that account, and events from its login or email are recognised as the factory's own. Events from them never start runs. See [Triggers](/software-factory/workflows/triggers/). [Delivery](/software-factory/evidence/delivery/) lists them under "Seen, and left out" and never counts them as people.
