---
title: Dependency guard
description: Checks every package an agent is about to install or write into a manifest against the repository's Safe Harbour policy, says nothing when it passes, and blocks only malware and exploited critical advisories by default.
order: 2
sources: [cli/internal/agent/run.go, cli/internal/agent/depguard.go, cli/internal/agent/installcmd.go, cli/internal/agent/lookup.go, cli/internal/agent/policy.go, cli/internal/fix/plan.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

The dependency guard runs on `PreToolUse`. It recovers the packages a tool call would add, looks them up in one request, and decides from the repository's [policy](/pix/hooks/policy-file/) whether to stay silent, warn or block.

## What it reads

| Tool call | Packages assessed |
|---|---|
| A shell command | Each package named by a [recognised install command](#commands-it-reads), in every segment of the line (`&&`, `;`, `\|` and so on) |
| A write or edit to a dependency manifest | Only what the edit adds or changes. The file is parsed before and after; a package already declared at the same version is skipped. |

A manifest is any file `vulnetix scan` parses as one ([SCA manifests](/sca/scanning/ecosystems/)). An edit whose result does not parse, such as a half-written file, is skipped. A global install (`-g`, `--global`, `--location=global`) is skipped. A local path, URL or git reference is not a registry package and is skipped.

### Commands it reads

| Command | Ecosystem |
|---|---|
| `npm install`, `npm i`, `npm add`, `yarn add`, `yarn install`, `pnpm add`, `pnpm install`, `pnpm i`, `bun add`, `bun install`, `bun i`, `deno add` | `npm` |
| `pip install`, `pip3 install`, `uv add`, `uv pip install`, `poetry add`, `pdm add`, `pipenv install`, `conda install` | `pypi` |
| `go get`, `go install` | `golang` |
| `cargo add` | `cargo` |
| `gem install`, `bundle add` | `rubygems` |
| `composer require` | `composer` |
| `dotnet add package`, `nuget install` | `nuget` |
| `mvn dependency:get` | `maven` (`group:artifact[:version]`) |
| `mix hex.package fetch` | `hex` |
| `swift package add-dependency` | `swift` |

Flags that take a value (`npm i -w web axios`) are skipped, so `web` is not read as a package. Leading environment assignments and interpreter forms such as `python -m pip install` are handled.

## Signals

Each package's lookup produces zero or more signals. Your policy maps each signal to block, warn, or silent.

| Signal | True when | Default |
|---|---|---|
| `malware` | A malware feed names the version that would install | block |
| `kev-critical` | A critical advisory against it is being exploited: on a KEV catalogue, or exploit maturity reported as active (the same test as `--exploits active`) | block |
| `malware-unresolved` | A malware report exists against the package name, and the version that would install could not be resolved | warn |
| `severity-high` | A high or critical advisory, with no exploitation evidence | warn |
| `below-target` | The package has an advisory and a safer version exists under the Safe Harbour strategy | warn |
| `eol` | The package is past end of life | warn |
| `cooldown` | The version was published within `cooldownDays` (off by default) | warn |
| `unpinned` | The command named no exact version | silent |

The decision for a package is its worst signal. If any package blocks, the whole call is denied, and the reason lists every blocked and warned package so the agent can choose what to do instead.

`below-target` fires only for a package that already has a problem as requested. A newer safe release existing is not, on its own, a reason to interrupt.

> [!WHY] Why `unpinned` is silent by default
> `npm i axios` records a range, and it is how almost every install is written. Warning on it fires on nearly every command and teaches people to stop reading. Enforce exact pins at build time with `--block-unpinned` on the scan commands instead.

## The Safe Harbour target

`safeHarbourStrategy` picks the version the guard compares against. All four pick from versions Safe Harbour clears (no known vulnerability, exploit or malware), except where noted.

| Strategy | Target |
|---|---|
| `safest` (default) | The highest stable release Safe Harbour clears. Never a pre-release. |
| `stable` | The cleared stable release closest to the one in use. It can be lower than the one in use. |
| `latest` | The highest stable release by the ecosystem's own version rules. A point release on an old branch is not the latest. |
| `rolling` | Of the non-malware versions published on the release day of the highest version (UTC), pre-releases and vulnerable versions included, the one closest to the one in use |

`maxMajorBump` (default `0`) caps how far the recommended target may move: `0` never recommends a new major version.

## Limits

| Limit | Value |
|---|---|
| Lookup budget for the whole call | 12 seconds; past it the guard has no opinion |
| Host hook timeout written by `vulnetix agent install` | 30 seconds |
| A package nothing is known about | Left alone, never blocked |

## Example

With the defaults, an agent runs `npm i event-stream@3.3.6`. The version is on a malware feed, so the call is denied and the agent receives the package card as the reason. `npm i axios` with no advisory prints nothing.
