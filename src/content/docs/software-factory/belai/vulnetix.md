---
title: Vulnetix scanning inside sessions
nav: Vulnetix scanning
description: Run Vulnetix reviews from Belai, read their results safely, and switch the AI Firewall, with /vulnetix.
order: 19
sources: [belai/docs/vulnetix.md, belai/docs/vulnetix-review.md, belai/docs/vuln-row.md]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

`/vulnetix` is Belai's entry point for the Vulnetix CLI and the Vulnetix AI Firewall. It runs Vulnetix review commands, shows what the CLI can do, keeps a history of projects found on this machine, and switches the AI Firewall for model traffic.

## Reviewing code

A review runs the Vulnetix scanners on the project and writes their results (SARIF, CycloneDX and OpenVEX) under `.vulnetix`. When it finishes, the session switches to agent mode with the `belai:vulnetix-review` profile engaged, so you can work through the findings.

Results are read as data, never as instructions: scanner output is never promoted into the model's trusted context, and vulnerability ids and package names are checked against strict formats before they are shown.

The results also become [project knowledge](/software-factory/workforce/knowledge/), so later sessions can find them.

## The AI Firewall

`/vulnetix firewall` makes the Vulnetix AI Firewall the active firewall (or switches it on or off when it already is), and `f10` switches the active firewall for this project. See [Firewalls](/software-factory/evidence/firewalls/).

## In the factory

Factory scans use the same scanners. See [Scan node](/software-factory/workflows/nodes/scan/) and [Trust](/software-factory/evidence/trust-and-slsa/).
