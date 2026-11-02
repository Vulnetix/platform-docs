---
title: Privacy and network use
description: What the extension and the `vulnetix lsp` server send, to which host and when, how telemetry is switched off, and where credentials come from.
order: 2
sources: [vulnetix-vscode/src/shared/launch.ts, vulnetix-vscode/src/lsp/client.ts, vulnetix-vscode/src/constants.ts, vulnetix-vscode/src/cli/download.ts, cli/cmd/lsp.go, cli/internal/lsp/sca.go, cli/pkg/auth/credentials.go, cli/pkg/cache/cache.go]
checked: [vulnetix-vscode@9ad08fa, cli@4c8c3b7]
updated: 02 Nov 2026
---

Scanning is local. File contents, paths and repository names are not sent anywhere. The server publishes nothing to your organisation: there is no upload from the editor.

## Every request

| Request | From | To | Carries | When |
|---|---|---|---|---|
| CLI download | Extension host | `github.com/Vulnetix/cli/releases/download` or `vulnetix.cli.downloadBaseUrl` | The asset name | First run, or **Vulnetix: Install CLI** |
| Bulk dependency check | `vulnetix lsp` | `api.vdb.vulnetix.com` | Package URLs (name, version, ecosystem) | Server start, manifest save, manifest changed on disk |
| Safe Harbour versions | `vulnetix lsp` | `api.vdb.vulnetix.com` | Package URLs of the vulnerable packages in one manifest | When you open that manifest |

Set `vulnetix.sca.enabled` to `false` and the server makes no VDB requests; everything else keeps working offline. Point the server at another API with `vulnetix.api.baseUrl` (sets `VULNETIX_API_URL` in its environment). `vulnetix.api.webUrl` sets `VULNETIX_WEB_URL`; nothing in the extension uses it yet.

The server never polls GitHub for CLI updates: `vulnetix lsp` skips the update check. CLI analytics are switched off by the `--no-analytics` flag the extension always passes.

## Telemetry

The extension itself sends no telemetry. For the server process:

| Condition | What the extension does |
|---|---|
| Always (from 0.3.1) | Passes `--no-analytics` |
| `telemetry.telemetryLevel` is `off`, or `vulnetix.telemetry.enabled` is `false` | Also sets `VULNETIX_NO_ANALYTICS=1` and `DO_NOT_TRACK=1` in its environment |

`vulnetix.telemetry.enabled` can only turn things further off. It cannot re-enable telemetry the editor has disabled.

## Cache

Dependency responses are cached on disk in `~/.vulnetix/cache/vdb/<cli-version>/`, shared with the CLI in your terminal.

## Credentials

There is no setting for an API key and no sign-in command. The server resolves credentials the way the CLI does, from the environment it inherits from the editor:

| Order | Source |
|---|---|
| 1 | `VULNETIX_API_TOKEN` (`VULNETIX_ORG_ID` optional) |
| 2 | `VULNETIX_API_KEY` with `VULNETIX_ORG_ID` |
| 3 | `VVD_ORG` with `VVD_SECRET` |
| 4 | `.vulnetix/credentials.json` in the server's working directory (the workspace folder) |
| 5 | `~/.vulnetix/credentials.json`, written by `vulnetix auth login` |
| 6 | The Package Firewall entry for `packages.vulnetix.com` in `~/.netrc` |
| 7 | Built-in community credentials |

So `vulnetix auth login` in a terminal is how you sign the editor in today. See [Authentication](/cli/).

> [!CAREFUL] A project credentials file is read from the workspace
> `.vulnetix/credentials.json` in the opened folder is a credential source. Do not commit one, and treat a cloned repository that contains one as untrusted.
