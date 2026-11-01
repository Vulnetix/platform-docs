---
title: Importing agents and agent files
nav: Agent import
description: Bring agents, commands, skills and prompts from other agent harnesses into Belai, and attach files an agent carries with it.
order: 3
sources: [belai/docs/agent-import.md, belai/docs/harnesses.md, belai/cmd/belai/agentcmd.go, belai/cmd/belai/agentfilescmd.go]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Other agent harnesses keep their agents, commands, skills, prompts and hooks as files, each in its own layout. Belai has one converter per layout, and uses it three ways:

| Where | Does |
|---|---|
| `belai agent import` | Converts one agent definition into a Belai profile |
| `belai library scan` | Searches this host for items of every kind kept by other harnesses, and says what an import would make of each |
| The library page's **Scan hosts** and **Import** | The same scan and conversion, started from the website |

The converter writes nothing to disk. A scan only reads and reports; an import uploads the converted document to your [library](/software-factory/workforce/library/).

## Formats

| Format | Reads |
|---|---|
| `claude-code` | Commands and subagents as Markdown, skills as `<name>/SKILL.md`, `CLAUDE.md`, and the hooks in `settings.json` |
| `cursor` | Commands as plain Markdown, `.cursorrules`, `AGENTS.md` |
| `codex` | Custom prompts as Markdown, `AGENTS.md`, `hooks.json` |
| `gemini-cli` | `GEMINI.md` and Markdown files |
| `opencode` | Commands and agents as Markdown |
| `windsurf` | Workflows as Markdown |
| `copilot` | `.prompt.md`, `.agent.md`, `copilot-instructions.md` |
| `cline` | Workflows as plain Markdown |
| `generic-md` | Markdown with optional front matter |
| `belai` | Belai's own files |
| `claws`, `nemoclaw`, `hermes`, `mini-swe` | Agent definitions, for `belai agent import -from` |

## Importing an agent

```sh
belai agent import review-bot.json             # a Belai profile
belai agent import -from claws ./agents/ops    # another harness's agent: a preview
belai agent import -from auto -yes ./agent.md  # save it, and install its skills
```

Without `-yes`, an import from another harness is a preview of what it would make. `-name` saves it under another name, and `-force` replaces a profile of the same name.

## Scanning a host

```sh
belai library scan                 # every kind
belai library scan -kind command   # one kind
belai library scan -json           # the report as it is uploaded
```

`-kind` is one of `command`, `skill`, `prompt`, `agent`, `crew`, `process`, `budget`, `rewrite`, `provider`, `repo`, `hook` or `document`. A scan looks in each installed harness's user directories, in Belai's own directories, and in each repository you trust. It writes nothing and sends nothing.

## Files an agent carries

An agent can carry files, such as a style guide or a runbook, kept with the agent and listed in its knowledge paths so it can retrieve them.

```sh
belai agent files NAME                  # the files and where each is found
belai agent files add NAME FILE -as PATH
belai agent files rm NAME PATH
belai agent files adopt DIR             # attach each DIR/<agent>.md to the agent of that name
```

Crew definitions have their own commands under `belai agent crew`: `import` FILE (`-force` replaces a crew of the same name), `export` NAME and `delete` NAME. See [Crews](/software-factory/workforce/crews/).

## Related

- [The library](/software-factory/workforce/library/)
- [Agents](/software-factory/workforce/agents/)
