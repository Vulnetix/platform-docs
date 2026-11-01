---
title: Agent avatars
nav: Avatars
description: How each agent gets a face, drawn as a variant of Pix, and the limits on drawing them.
order: 4
sources: [vdb-site/api/internal/handler/belai_ai_avatar.go, vdb-site/api/internal/handler/belai_avatar.go, belai/internal/pix, belai/internal/avatar]
checked: [vdb-site@284f1d6, belai@35506b9]
updated: 28 Oct 2026
---

Each agent can have an avatar, so the console shows who is who in a crew. An avatar is drawn as a variant of Pix, the Vulnetix mascot: a model is shown the Pix drawing and a brief for the agent, and returns a changed drawing.

- Every avatar is a variant of the same Pix drawing, and only uses SVG elements a guard admits. A drawing with scripts, styles, text, links, images or anything else outside that set is refused. The only animation admitted is a bounded `<animate>` or `<animateTransform>` that moves or recolours what is already drawn.
- A profile may have **five avatars drawn an hour**.
- Avatars are drawn by a model Vulnetix runs. If a profile has used its allowance, a host can draw one instead, as a fallback.

The built-in agents have personas with their own avatars, such as Rubber Duck, Kremvax and Dark Avenger in the security crew.

## API

| Method | Path |
|---|---|
| POST, GET | `/v1/belai/ai-avatars` |
| GET | `/v1/belai/agent-creators/{id}/avatar` |
| POST | `/v1/belai/hosts/{hostId}/agent-creators/{id}/avatar` (a host drawing one) |
