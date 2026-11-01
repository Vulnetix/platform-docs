---
title: The ticket standard for cards
nav: Ticket standard
description: The one shape every card an agent files for a person follows, how agents are held to it, and how the board shows a card that falls short.
order: 10
sources: [vdb-site/api/internal/handler/factory_ticket.go, vdb-site/docs/factory.md]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

When an agent files a card for a person, it writes it in one shape, so every ticket reads the same whichever agent wrote it:

- A **title** under 70 characters
- Then these sections, in this order, each as a `## ` heading:
  1. **User story**
  2. **Context**
  3. **Success criteria**
  4. **Definition of done**
  5. **Todo**
  6. **Out of scope**

## How it is enforced

- **In Belai.** Before an agent's tool writes the card, Belai checks it and sends the gaps back to the agent, which fixes them first.
- **On the server.** The factory checks every card the same way, from the same shared rules, so the two can never disagree.

The server never refuses a card for falling short: a host's board sync must never stall on one card. The board shows what is missing instead.

> [!WHY] Why a fixed shape
> A person reading ten cards from five agents should find the success criteria in the same place every time. A fixed shape also makes a card easy to check: a section is there, or it is not.

Templates whose agents write tickets say so on the Templates page. The `sf:ticket` label asks for a card to be written in the standard from an issue.

## Related

- [The board](/software-factory/workforce/board/)
- [Labels and commands](/software-factory/workflows/labels-and-commands/)
