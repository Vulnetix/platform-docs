---
title: Settings
description: Every `vulnetix.*` setting the extension contributes, with type, allowed values, default, scope, what reads it and when a change applies.
order: 1
sources: [vulnetix-vscode/package.json, vulnetix-vscode/src/shared/settings.ts, vulnetix-vscode/src/shared/manifests.ts, vulnetix-vscode/src/shared/launch.ts, vulnetix-vscode/src/extension.ts, vulnetix-vscode/src/lsp/client.ts, cli/internal/lsp/settings.go]
checked: [vulnetix-vscode@9ad08fa, cli@4c8c3b7]
updated: 02 Nov 2026
---

24 settings are contributed under `contributes.configuration` in `package.json`. Settings with **Read by: nothing yet** appear in the Settings UI and are saved, but no code reads them.

**Scope** decides where a setting may be set. `machine` settings can only be set in user or machine settings, never by a workspace, because they decide which code runs or where data goes. `window` settings apply per window. `resource` settings can be set per workspace or folder and committed in `.vscode/settings.json`.

**Applies**: *restart* means the extension restarts the server on change; *live* means the server receives it over `workspace/didChangeConfiguration` and republishes open files without restarting; *next start* means it is read when the server is next started.

## CLI binary

| Setting | Type and values | Default | Scope | Read by | Applies |
|---|---|---|---|---|---|
| `vulnetix.cli.path` | string: absolute path to a `vulnetix` binary | `""` | machine | Extension | Next start (set through **Set CLI Path**: at once) |
| `vulnetix.cli.downloadBaseUrl` | string: base URL serving `<tag>/<asset>` and `<tag>/checksums.txt`. Empty uses `https://github.com/Vulnetix/cli/releases/download` | `""` | machine | Extension | Next download |
| `vulnetix.cli.autoUpdate` | enum: `never`, `prompt`, `auto` | `prompt` | machine | Nothing yet | n/a |

## Language server

| Setting | Type and values | Default | Scope | Read by | Applies |
|---|---|---|---|---|---|
| `vulnetix.lsp.enabled` | boolean. `false` stops a running server. | `true` | window | Extension | At once |
| `vulnetix.lsp.memoryLimitMb` | number: schema minimum 256; passed as `--memory-limit-mb`, any value outside 128 to 16384 or not an integer becomes 2048 | `2048` | machine | Extension, server | Restart |
| `vulnetix.trace.server` | enum: `off`, `messages`, `verbose`. Traces LSP traffic into the Vulnetix output channel. | `off` | window | Language client | At once |

## When analysis runs

| Setting | Type and values | Default | Scope | Read by | Applies |
|---|---|---|---|---|---|
| `vulnetix.scan.debounceMs` | number: quiet period after typing before analysis. Passed as `--debounce-ms`; outside 0 to 5000 or not an integer becomes 400 | `400` | resource | Extension, server | Restart |
| `vulnetix.scan.onType` | boolean | `true` | resource | Nothing yet | n/a |
| `vulnetix.scan.onSave` | enum: `off`, `file`, `workspace` | `file` | resource | Nothing yet | n/a |
| `vulnetix.scan.onStartup` | boolean | `false` | resource | Nothing yet | n/a |
| `vulnetix.secrets.onType` | boolean. Secrets always run on save only. | `false` | resource | Nothing yet | n/a |
| `vulnetix.secrets.gitHistory` | boolean. The editor never walks git history. | `false` | resource | Nothing yet | n/a |

Current trigger behaviour is on [When analysis runs](/vscode/findings/when-analysis-runs/).

## What is shown

| Setting | Type and values | Default | Scope | Read by | Applies |
|---|---|---|---|---|---|
| `vulnetix.diagnostics.minimumSeverity` | enum: `critical`, `high`, `medium`, `low`, `info` | `low` | resource | Server | Live |
| `vulnetix.diagnostics.mapLowTo` | enum: `information` (Problems panel entry), `hint` (faint underline, no entry) | `information` | window | Server | Live |
| `vulnetix.diagnostics.showSuppressed` | boolean: publish suppressed findings as Hints | `false` | resource | Server | Live |

See [Severity and filtering](/vscode/findings/severity/).

## Dependencies

| Setting | Type and values | Default | Scope | Read by | Applies |
|---|---|---|---|---|---|
| `vulnetix.sca.enabled` | boolean | `true` | resource | Server | Live for findings; hover, hints and quick fixes are advertised at server start |
| `vulnetix.sca.safeHarbourStrategy` | enum: `safest`, `stable`, `latest`, `rolling` (`rolling` from extension 0.3.1) | `safest` | resource | Server | Live |
| `vulnetix.sca.maxMajorBump` | number: major versions a fix may cross. Schema minimum 0; the server accepts 0 to 100 | `0` | resource | Server | Live |
| `vulnetix.sca.annotateLockfiles` | boolean: also publish findings in lockfiles | `true` | resource | Server | Live |

See [Dependencies](/vscode/findings/dependencies/).

## Suppressions

| Setting | Type and values | Default | Scope | Read by | Applies |
|---|---|---|---|---|---|
| `vulnetix.memory.path` | string: the `.vulnetix` directory or the `memory.yaml` file. Relative paths resolve against the workspace root. Empty uses `.vulnetix/`. | `""` | resource | Server | Live |
| `vulnetix.suppressions` | array of objects with `ruleId`, `findingId`, `path`, `reason` (strings, no other keys) | `[]` | resource | Server | Live |

See [Suppressions](/vscode/findings/suppressions/).

## Endpoints and telemetry

| Setting | Type and values | Default | Scope | Read by | Applies |
|---|---|---|---|---|---|
| `vulnetix.api.baseUrl` | string: sets `VULNETIX_API_URL` for the server | `""` | machine | Extension | Restart (run **Restart Language Server**) |
| `vulnetix.api.webUrl` | string: sets `VULNETIX_WEB_URL` for the server | `""` | machine | Extension | Restart (run **Restart Language Server**) |
| `vulnetix.telemetry.enabled` | boolean. `false` sets `VULNETIX_NO_ANALYTICS=1` and `DO_NOT_TRACK=1` for the server. Cannot override `telemetry.telemetryLevel: off`. | `true` | machine | Extension | Restart (run **Restart Language Server**) |

## Invalid values

The server validates every value it reads. A value of the wrong type, out of range, or not in the enum is logged in the Vulnetix output channel and replaced with the default. It never disables analysis. Fractional numbers are treated as absent.

## Example

```jsonc
// .vscode/settings.json, shared with the team
{
  "vulnetix.diagnostics.minimumSeverity": "medium",
  "vulnetix.sca.safeHarbourStrategy": "stable",
  "vulnetix.sca.maxMajorBump": 1,
  "vulnetix.memory.path": "security/.vulnetix"
}
```
