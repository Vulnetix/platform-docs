---
title: Pix buttons in the Resolve Platform
nav: Pix buttons
description: Buttons beside a run, finding or pull request that open a session on its repository with the request already written. Nothing starts until you press Start.
order: 4
sources: [website/.repo/pix-ask.md, website/src/shared/pix-ask.ts]
checked: [website@a31d470]
updated: 28 Oct 2026
---

Some console pages have a button beside an object, such as a failed run, a blocked build or a board card. It opens a Belai session on that object's repository with the request already written. The button names what it will do, for example **Find out why this run failed**.

**Nothing starts by itself.** The button opens the new session dialog with the prompt, mode and branch filled in. You read it, change it if you like, and press **Start**.

## What happens when you press it

| Situation | The button |
|---|---|
| One place can run it | Opens the dialog for that host or Pix Sandbox |
| Several places can | Shows a short menu: Pix Sandbox or self-managed hosts |
| Nowhere can run a session yet | Says so, with a link to get or open a Pix Sandbox |
| The repository is not on any host | Says so, with a link |

A button only appears when the object names a repository a session could work on.

The session records that it was started from the Resolve Platform, so it shows as such on the Sessions list. See [Sessions](/software-factory/runs/sessions/).

## Related

- [Calling Pix](/software-factory/pix/calling-pix/) to start sessions by voice.
- [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/)
