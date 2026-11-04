---
title: "vulnetix surface"
nav: surface
description: Check from inside your own network that the routes, operations and hosts registered on your attack surface still answer, and report what responded.
order: 12
sources: [cli/cmd/surface.go]
checked: [cli@v4.13.1]
updated: 04 Nov 2026
---

`vulnetix surface liveness` checks that the routes and hosts on your organisation's attack surface still answer. It runs on your infrastructure, so it can reach internal hosts that Vulnetix's own checker cannot.

```bash
vulnetix surface liveness [flags]
```

It reads the targets from your attack surface, sends one safe request to each, and reports what answered. The verdicts are worked out by the platform; the command only observes.

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--repo` | string | | Check only the targets of one repository, as `owner/name` |
| `--scheme` | string | `https` | Scheme used to reach each host |

## What each request is

| Target method | Request sent |
|---|---|
| `GET`, `HEAD` | The same method |
| Any method that is not idempotent, such as `POST` | `OPTIONS` |

Every request carries no credentials and no body, and redirects are not followed, so the result is what the endpoint itself answered. A request that cannot connect is reported as status `0`.

> [!WHY] Why it runs on your side
> Many registered routes are internal: an admin API behind a VPN, a service only reachable from a cluster. A checker on the internet would report every one of them as dead. Running it where the services run reports what is actually up.

## Requirements

A signed-in organisation. Community credentials are refused. See [Authentication](/cli/authentication/overview/).

## Examples

```bash
# Check every registered target
vulnetix surface liveness

# One repository's routes, over plain HTTP inside a test network
vulnetix surface liveness --repo acme/payments --scheme http
```
