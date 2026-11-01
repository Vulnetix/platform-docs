---
title: "The library: skills, prompts, commands, processes, repos and more"
nav: Library
description: Everything worth keeping when a machine is wiped, kept in your account and installed on any connected host. The kinds of item, their documents, how items travel between hosts and the library, the sync switches, and the commands that read and write them.
order: 18
sources: [belai/docs/library-items.md, belai/docs/skills.md, vdb-site/docs/belai-library-items.md, vdb-site/docs/belai-library-settings.md, vdb-site/api/internal/handler/belai_items.go, vdb-site/api/internal/handler/belai_library.go]
checked: [belai@35506b9, vdb-site@284f1d6]
updated: 28 Oct 2026
---

Your library keeps the things worth keeping when a machine is wiped or a second one is set up: agent profiles and crews, and **library items**. The Library page (`/resolve/belai-library`) lists them, the hosts that hold each, and every version.

Every item is one small document. Each version is write-once. The website can install an item on another connected host or take a backup from one. A host keeps working offline: the library is a copy, never what a host reads at run time.

## Kinds

| Kind | Command | Lives on a host in | Sync switch |
|---|---|---|---|
| `skill` | `belai skill` | `~/.vulnetix/belai/skills/<name>/SKILL.md` | `sync.skills` |
| `prompt` | `belai prompt` | `~/.vulnetix/belai/prompts/<NNN>-<name>.md` | `sync.prompts` |
| `command` | `belai command` | `~/.vulnetix/belai/commands/<name>.md` | `sync.commands` |
| `process` | `belai process` | `~/.vulnetix/belai/processes/<NNN>-<name>.json` | `sync.processes` |
| `repo` | `belai repo` | the `repos` list in settings; clones under `~/.vulnetix/belai/repos/<dir>` | `sync.repos` |
| `budget` | `belai budget` | `token_budgets` in settings | `sync.budgets` |
| `rewrite` | `belai rewrite` | `bash_rewrite` in settings | `sync.rewrites` |
| `provider` | `belai provider` | `providers` and `firewall` in settings; keys in the credentials store | `sync.providers` |
| `mcp` | `belai mcp` | one entry of `mcp.servers` in settings; secrets in the credentials store | `sync.mcps` |
| `hook` | none | a bundle directory, `~/.vulnetix/belai/hooks/<name>/`; installed on request only | `sync.hooks` |
| `launch` | none | never on a host. See [launch configurations](/software-factory/workforce/pix-sandboxes/). | none |

An item is identified by its kind and name, so the same skill on two machines is one item. An account holds up to 200 live items of one kind.

## Documents

| Kind | Format and fields |
|---|---|
| Skill | Markdown with front matter: `name`, `description`, `allowed-tools`, `compatibility`, `license`, `metadata`, `disable-model-invocation`. Keys under `belai.` are reserved: `belai.role`, `belai.contexts`, `belai.niche`, `belai.resources`, `belai.updated`. |
| Prompt | Markdown with front matter: `name`, `description`, `enabled`, `order` |
| Command | Markdown with front matter: `name`, `description`, `argument-hint`, `allowed-tools`, `compatibility`, `license`, `metadata`, `disable-model-invocation` |
| Process | JSON: `name`, `command`, `args`, `options`, `env`, `cwd`, `user`, `stdout`, `stderr`, `enabled`, `order`. `stdout` and `stderr` go to `log`, `discard`, `file`, `append` or `stdout`. |
| Repo | JSON: `name`, `url`, `refs`, `dir`, `depth`, `submodules`, `auth`, `installation_id`, `visibility`, `enabled` |
| Budget | JSON: `name`, `budgets` (each `provider`, `model`, `scope`, `tokens`), `cycle_seconds`, `warn` |
| Rewrite | JSON: `name`, `rules`, `enabled` |
| MCP server | JSON: `name`, `transport`, `command`, `args`, `url`, `headers`, `env`, `secrets`, `tools`, `timeout_ms`, `sandbox`, `disabled` |
| Hook | JSON: `name`, `description`, `hooks`, plus its script files |
| Provider | JSON. See [Providers and keys](/software-factory/workforce/providers-and-keys/). |

## How items travel

All of these need `belai rc` running and the Vulnetix CLI signed in.

| Action | Does |
|---|---|
| **Automatic sync** | Every 30 seconds the host hashes each item of each enabled kind and asks what to do. `push`: the library has nothing newer, so the host pushes a new version. `current`: the library has it. `diverged`: the website saved a version this host has not installed, so the host never overwrites it. `skip`: not this account's, or deleted. |
| **Backup** | The website asks a host for its copy of one item and stores it as a new version |
| **Sync from hosts** | One pass of the automatic sync, now |
| **Install** | The website installs one version of an item on a host. It replaces an item of the same name only when you say so. |
| **Scan hosts** and **Import** | Find items other agent harnesses keep, and import them. See [Importing agents](/software-factory/workforce/agent-import/). |

Installing a skill, prompt or command checks it first, because it is text a model will read: it is refused if it holds harness markup, terminal escapes or other control characters, bidirectional overrides, or invisible characters that hide text. A write is atomic, the files are private to you, and a symbolic link at the target is refused.

A scan reports each candidate as `valid`, `warning` or `invalid`, with notes on what was `mapped`, `dropped`, kept as `metadata`, or raised as a `warning`.

## Sync switches

Each kind has a switch under `sync`, on by default and never on while `sync.enabled` is off. A project's settings may turn one off, never on. An off switch means nothing of that kind is hashed, advertised, pushed or installed. `sync.processes` matters most: a process is a command Belai runs, so turning it off keeps the website out of what runs on the host.

## Commands

```sh
belai skill list [-json]
belai skill validate FILE
belai skill import [-force] FILE
belai skill export [-force] NAME [FILE]
```

`belai prompt`, `belai command`, `belai process`, `belai repo`, `belai budget`, `belai rewrite`, `belai provider` and `belai mcp` take the same `list`, `validate`, `import` and `export`. `belai repo` also has `sync` and `status`. `FILE` of `-` is standard input or output. `import` replaces an item only with `-force`. None of these ever reads or writes a key, and they work offline. `belai library scan` finds items kept by other harnesses.

## In the TUI

`/skills` lists installed skills. `/prompts` manages the prompt library. `/processes` manages the process library. `/commands` lists your custom slash commands, and `/<name>` runs one.

## API

| Method | Path |
|---|---|
| | Items: `/v1/belai/library/items/...` (list, versions, install, backup, delete) |
| | Profiles and crews: `/v1/belai/library/profiles/...`, `/v1/belai/library/crews/...` |
| | Settings and catalogue: `/v1/belai/library/settings`, `/v1/belai/library/repositories/catalogue` |
| | Prompts for web sessions: `/v1/belai/sessions/{id}/prompts`, `/v1/belai/prompts/{pid}` |
