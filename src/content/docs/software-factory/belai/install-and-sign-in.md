---
title: Install, update and sign in
nav: Install and sign in
description: Install Belai on macOS, Linux or Windows, choose a build, keep it up to date, and sign in to Vulnetix and to model providers.
order: 1
sources: [belai/README.md, belai/install.sh, belai/docs/kiro.md, belai/cmd/belai/login.go]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Belai is the agent harness inside every factory session, and a terminal coding agent you can run yourself. It is one binary: the TUI, the headless runner, the remote control daemon and the editor bridge. The [Belai site](https://belai.vulnetix.com/) describes what it is for; these pages are the reference.

## Install

| Platform | Command |
|---|---|
| macOS, Linux (Homebrew) | `brew install vulnetix/tap/belai` |
| Windows (Scoop) | `scoop bucket add vulnetix https://github.com/Vulnetix/scoop-bucket` then `scoop install belai` |
| Any (script) | `curl -fsSL https://raw.githubusercontent.com/Vulnetix/belai/main/install.sh \| sh` |
| From source | `go install github.com/vulnetix/belai/cmd/belai@latest` |

Upgrade with Homebrew by the tapped name, `brew upgrade --formula vulnetix/tap/belai`, because Homebrew also knows an unrelated cask called `belai`.

The install script checks the download against the release checksums and refuses to install on a mismatch. It installs to `/usr/local/bin`, or `~/.local/bin` if that is not writable. `--install-dir` and `--version` choose the directory and version.

### Builds

| Build | Embeds | Size |
|---|---|---|
| `belai-bert-guardrails` (the default) | The first-stage prompt classifier and the speech model, so guardrails and voice work with no provider configured | about 77 MB |
| `belai-bert-guardrails-jailbreak` | Also the second-stage jailbreak classifier | about 517 MB |
| `belai-no-classifier` | The speech model only | about 56 MB |
| `belai` | Nothing embedded. Voice input downloads its model on `/voice download`. | about 24 MB |

`install.sh --variant` picks one. The command is `belai` whichever you install, and a build updates within its own family.

### Updates

At start, Belai checks for a newer release and, if there is one, prints the upgrade command for how you installed it. It never downloads anything itself. The check is cached for six hours, and `update_check: false` in settings or `BELAI_NO_UPDATE_CHECK=1` turns it off.

## Sign in to Vulnetix

Belai uses the Vulnetix CLI's login for session sync, the library, remote control and the Vulnetix AI Firewall. Sign in with the browser:

```sh
vulnetix auth login
```

An API-token login works for scanning but not for remote control, which needs a browser login. Your first `belai` opens **Getting started**, which offers to install the Vulnetix CLI and sign you in; `/welcome` reopens it.

## Sign in to providers

Most providers take an API key: add it in `/providers`, where it is kept in your keychain or the user credentials file, never in a settings file. Two sign in instead:

```sh
belai login kiro                                                  # AWS Builder ID
belai login kiro -start-url https://acme.awsapps.com/start -region ap-southeast-2
belai login kiro -import                                          # reuse Kiro's own sign-in
```

| Flag | Meaning |
|---|---|
| `-start-url` | IAM Identity Center start URL |
| `-region` | SSO region (default `us-east-1`) |
| `-api-region` | Kiro API region |
| `-profile-arn` | CodeWhisperer profile ARN |
| `-import` | Import Kiro's own sign-in |
| `-backend` | Where to keep the login: `keychain` or `user-file` |

`belai login kiro` is the only `belai login` command; its `-backend keychain` or `-backend user-file` chooses where the login is kept (the keychain when one is available). GitHub Copilot signs in with your GitHub account from `/providers`. See [Providers and keys](/software-factory/workforce/providers-and-keys/).

## Next

- [The terminal UI](/software-factory/belai/tui/)
- [Modes and plans](/software-factory/belai/modes-and-plans/)
- [Remote control](/software-factory/workforce/remote-control/), to let the factory use this machine
