---
title: Policy file (.vulnetix/agent.yaml)
nav: Policy file
description: Every key of .vulnetix/agent.yaml, the defaults when a key or the whole file is missing, and how a malformed file is reported.
order: 5
sources: [cli/internal/agent/policy.go, cli/internal/fix/plan.go, cli/cmd/agent.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`.vulnetix/agent.yaml` in the repository root sets what the hooks block, warn on, and leave alone. It is optional; without it the defaults below apply. It is read on every hook call, so a change takes effect on the next tool call.

## The defaults, written out

This file is equivalent to having no file:

```yaml
agent:
  enabled: true
  safeHarbourStrategy: safest
  maxMajorBump: 0
  cooldownDays: 0
  dependencyGuard:
    block: [malware, kev-critical]
    warn: [severity-high, below-target, eol, cooldown, malware-unresolved]
  changeGuard:
    block: [secret]
    warn: [severity-high, kev-critical]
```

## Keys

All keys sit under `agent:`.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `enabled` | bool | `true` | `false` turns every hook off without uninstalling it. Each call returns nothing. |
| `safeHarbourStrategy` | `safest`, `stable`, `latest`, `rolling` | `safest` | The target the dependency guard compares against. Case-insensitive; an unknown value falls back to `safest`. See [the Safe Harbour target](/pix/hooks/dependency-guard/#the-safe-harbour-target). |
| `maxMajorBump` | int | `0` | How many major versions a recommended target may move. `0` never recommends a new major. A negative value reads as `0`. |
| `cooldownDays` | int | `0` (off) | A version published fewer than this many days ago raises `cooldown`. A negative value reads as `0`. |
| `dependencyGuard.block` | list of signals | `[malware, kev-critical]` | Signals that deny the tool call |
| `dependencyGuard.warn` | list of signals | `[severity-high, below-target, eol, cooldown, malware-unresolved]` | Signals reported into the agent's context |
| `changeGuard.block` | list of signals | `[secret]` | Signals that deny a `git commit` or `git push` |
| `changeGuard.warn` | list of signals | `[severity-high, kev-critical]` | Reported, not blocked. Only `secret` is evaluated by the change guard today. |

Signals: `malware`, `kev-critical`, `malware-unresolved`, `severity-high`, `below-target`, `eol`, `unpinned`, `cooldown`, `secret`. What each means is on [Dependency guard](/pix/hooks/dependency-guard/#signals).

A signal in neither list is silent. If a signal is in both, block wins.

> [!CAREFUL] An empty guard section is the default, not "off"
> If both `block` and `warn` of a guard are empty or missing, that guard gets the defaults. A file that sets only `safeHarbourStrategy` keeps the malware block. To turn every hook off, set `enabled: false`. To turn one guard off alone, give it only a signal it never evaluates, for example `changeGuard: {warn: [unpinned]}`.

The signal for a credential is `secret`, singular. A list naming `secrets` matches nothing.

## Malformed files

A file that cannot be read or parsed is reported on stderr, where the person sees it and the agent does not mistake it for a verdict. The message begins `vulnetix agent: parsing .vulnetix/agent.yaml:`, gives the YAML error, and ends `using defaults`. The hook then runs on the defaults. A missing file is not reported.

## Examples

Warn on malware instead of blocking, and also flag versions younger than a week:

```yaml
agent:
  cooldownDays: 7
  dependencyGuard:
    block: [kev-critical]
    warn: [malware, malware-unresolved, severity-high, below-target, eol, cooldown]
```

Allow the guard to recommend one major version up, and use the release closest to what you run:

```yaml
agent:
  safeHarbourStrategy: stable
  maxMajorBump: 1
```

Report credentials in commits without blocking:

```yaml
agent:
  changeGuard:
    warn: [secret]
```
