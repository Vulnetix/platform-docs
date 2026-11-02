---
title: CLI commands
description: Every flag of vulnetix agent hook, install, hosts and capabilities, and of vulnetix skills install, check, update, uninstall and prune.
order: 2
sources: [cli/cmd/agent.go, cli/cmd/skills.go, cli/cmd/skills_prune.go, cli/internal/agent/install.go, cli/internal/agent/capabilities.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## vulnetix agent

| Command | Does |
|---|---|
| `vulnetix agent hook` | Answers one host hook: payload on stdin, response on stdout. Always exits `0`. |
| `vulnetix agent install` | Writes the hook entry into each detected host's config |
| `vulnetix agent hosts` | Prints the support matrix the installer acts on |
| `vulnetix agent capabilities` | Writes `.vulnetix/capabilities.yaml` |

| Command | Flag | Default | Meaning |
|---|---|---|---|
| `hook` | `--event <name>` | the payload's `hook_event_name` | `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart`, `Stop` |
| `hook` | `--root <dir>` | payload `cwd`, then the working directory | Where `.vulnetix/` is read |
| `install` | `--agent <id>` | every detected agent | Repeatable. Ids: `claude-code`, `codex`, `cursor`, `gemini-cli`, `github-copilot`, `opencode`, `pi`, `windsurf`, `zed`, `amp` |
| `install` | `--dry-run` | off | Report only |
| `install` | `--no-hooks` | off | Skip hook configuration |
| `hosts` | `-o`, `--output` | `pretty` | `pretty` or `json` |
| `capabilities` | `--root <dir>` | working directory | Repository to detect |
| `capabilities` | `--force` | off | Re-detect even if the file is under 24 hours old |

`vulnetix agent hosts` columns: `ID`, `NAME`, `INSTALLED`, `SKILLS`, `HOOKS`, `MCP`. With `-o json` it prints the host table itself (id, name, skills directories, hook dialect and file, MCP, detection paths).

`install` output, per host:

```
Claude Code
  hooks    configured ~/.claude/settings.json
  skills   ~/.claude/skills
  mcp      https://mcp.vulnetix.com/mcp
```

`hooks` reads `would configure <file>` with `--dry-run`, `already configured` when nothing changed, or a `note` line when the host's hooks are not verified. With no agents detected it says so and suggests `--agent`.

## vulnetix skills

| Command | Flags | Does |
|---|---|---|
| `install` | `--agent <id>`, `--skill <name>` | Installs the skills. Without flags: `npx skills add --all -y Vulnetix/pix-ai-coding-assistant`, else the Claude Code marketplace, else `gh skills add` per agent and skill. With flags, every available tool is used for that agent or skill. |
| `check` | | Lists Vulnetix skills in each detected agent's directories, dangling links, skills the release no longer ships, and skills it ships that are missing |
| `update` | | `npx skills update -y`, else `gh skills update --all`, else `claude plugin marketplace update`; then lists retired skills left behind |
| `uninstall` | | `npx skills remove --all` (every skill the `skills` tool installed, not only Vulnetix's); without `npx`, prints the directories to clean |
| `prune [skill...]` | `--yes` | Removes Vulnetix skills the latest release no longer ships, or the named ones. Without `--yes`, prints what it would remove. |

`prune` compares `~/.agents/.skill-lock.json` with the release's `skills/` directory. It removes each host symlink into the skill's store directory, the store directory and the lock entry, only for entries the lock attributes to a Vulnetix source, and never a real directory in a host's skills folder.

See [Install, update and verify](/pix/get-started/install/) for the order to run these in.
