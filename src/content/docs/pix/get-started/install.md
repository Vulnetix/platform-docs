---
title: Install, update and verify
nav: Install
description: Wire the hooks with vulnetix agent install, install the skills with vulnetix skills install or the Claude Code marketplace, keep them current, and check each surface is live.
order: 2
sources: [cli/cmd/agent.go, cli/internal/agent/hosts.go, cli/internal/agent/install.go, cli/cmd/skills.go, cli/cmd/skills_prune.go, pix-ai-coding-assistant/.claude-plugin/marketplace.json, pix-ai-coding-assistant/vulnetix/hooks/hooks.json, pix-ai-coding-assistant/skills/_lib/contract.md]
checked: [cli@4c8c3b7, pix-ai-coding-assistant@7aebf02]
updated: 02 Nov 2026
---

Pix has three install surfaces, and each is a separate step:

| Surface | Installed by | Reaches |
|---|---|---|
| Hooks | `vulnetix agent install` | Claude Code and OpenAI Codex, the two hosts whose hook contract has been run against the CLI |
| Skills | `vulnetix skills install`, `npx skills add`, or the Claude Code plugin | Every agent in the table below, and more through `npx skills` |
| Subagents | The Claude Code plugin only | Claude Code |

`vulnetix agent install` does not copy skills and does not write MCP configuration. It prints each host's skills directory and the MCP URL so you can see where they go.

## 1. Install the CLI

Every hook and skill runs the Vulnetix CLI, which must be on the `PATH` of the process that starts your agent.

```bash
brew install Vulnetix/tap/vulnetix
# or
curl -fsSL https://cli.vulnetix.com/install.sh | sh
```

Scoop and Nix also work (`scoop bucket add vulnetix https://github.com/Vulnetix/scoop-bucket; scoop install vulnetix/vulnetix`, `nix profile install github:Vulnetix/cli`). See [Install the CLI](/cli/get-started/install/) for Windows and CI.

## 2. Wire the hooks

```bash
vulnetix agent install
```

It detects the agents on this machine, writes the hook entry into each host's own file in its own format, keeps everything else in that file, and reports what changed. Running it again prints `already configured`.

| Flag | Default | Effect |
|---|---|---|
| `--agent <id>` | every detected agent | Wire only this agent. Repeatable. An unknown id fails with `unknown agent "<id>"; run 'vulnetix agent hosts' for the list`. |
| `--dry-run` | off | Print what would change; write nothing. |
| `--no-hooks` | off | Skip hook configuration and only report skills directories and MCP. |

Each host gets one entry per event, all running the same command, `vulnetix agent hook`, with a 30-second timeout:

| Event | Matcher | Answers |
|---|---|---|
| `PreToolUse` | `Bash\|Edit\|Write\|MultiEdit` (Codex: `*`) | [Dependency guard](/pix/hooks/dependency-guard/), [change guard](/pix/hooks/change-guard/) |
| `SessionStart` | none | [Session context](/pix/hooks/session-context/) |
| `UserPromptSubmit` | none | [Session context](/pix/hooks/session-context/) |

The entry is recognised by its command, so a re-run replaces this CLI's entry in place and never touches your other hooks. The Claude Code plugin ships the same three entries in `vulnetix/hooks/hooks.json`, so a marketplace install has the hooks without running `agent install`.

At the end it says which credential the guard will use: `Authenticated.`, or that it is running on the shared Community tier with the link to get a free key.

## 3. Install the skills

```bash
vulnetix skills install
```

It uses the first tool it finds, in this order:

| Tool found | Runs |
|---|---|
| `npx` | `npx skills add --all -y Vulnetix/pix-ai-coding-assistant` |
| `claude` (no `npx`) | `claude plugin marketplace add Vulnetix/pix-ai-coding-assistant`, then `claude plugin install vulnetix@vulnetix-plugins` |
| `gh` (neither) | `gh skills add Vulnetix/claude-code-plugin <skill> --agent <agent> -f --scope user` for each detected agent and each skill in the latest release |

`--agent <id>` and `--skill <name>` target one agent or one skill, and then every tool that is present is used (`npx skills add Vulnetix/pix-ai-coding-assistant --agent <id>` for `npx`).

Either registry tool works directly too, because the skills live at `skills/` in the repository root:

```bash
npx skills add Vulnetix/pix-ai-coding-assistant
```

### Claude Code plugin

Inside Claude Code:

```
/plugin marketplace add Vulnetix/pix-ai-coding-assistant
/plugin install vulnetix@vulnetix-plugins
```

The marketplace is `vulnetix-plugins` and the plugin is `vulnetix` (version 2.0.0). The plugin carries the 18 skills, the 5 subagents and the 3 hook entries. Skills are invoked as `/vulnetix:<skill>`, for example `/vulnetix:repo-impact CVE-2021-44228`.

## What each agent gets

From `vulnetix agent hosts`, the table the installer acts on. `vulnetix agent hosts -o json` prints it as JSON.

| Id | Agent | User skills directory | Project skills directory | Hooks | MCP |
|---|---|---|---|---|---|
| `claude-code` | Claude Code | `~/.claude/skills` | `.claude/skills` | yes, `~/.claude/settings.json` | yes |
| `codex` | OpenAI Codex | `~/.agents/skills` | `.agents/skills` | yes, `~/.codex/hooks.json` | yes |
| `cursor` | Cursor | `~/.agents/skills`, `~/.cursor/skills` | `.agents/skills`, `.cursor/skills` | not verified | yes |
| `gemini-cli` | Gemini CLI | `~/.agents/skills`, `~/.gemini/skills` | `.agents/skills`, `.gemini/skills` | not verified | yes |
| `github-copilot` | GitHub Copilot | `~/.copilot/skills` | `.github/skills` | not verified | yes |
| `opencode` | opencode | `~/.config/opencode/skills` | `.opencode/skills` | not verified | yes |
| `pi` | Pi | `~/.agents/skills`, `~/.pi/agent/skills` | `.agents/skills`, `.pi/skills` | not verified | yes |
| `windsurf` | Windsurf | `~/.codeium/windsurf/skills` | `.windsurf/skills` | not verified | yes |
| `zed` | Zed | `~/.agents/skills` | `.agents/skills` | not verified | yes |
| `amp` | Amp | `~/.config/agents/skills` | `.agents/skills` | not verified | yes |

An agent counts as installed when its configuration directory exists (`~/.claude`, `~/.codex`, `~/.cursor` and so on). "Not verified" means the host documents hooks but this CLI has not been run against them, so `agent install` wires nothing and says `hooks not configured: <agent>'s hook contract has not been verified against this CLI`.

> [!CAREFUL] Codex reads `~/.agents/skills`
> Codex does not read `~/.codex/skills`. Skills copied there are never loaded. Codex also skips a hook it has not been told to trust, with no error and no output, so approve the Vulnetix hook when Codex asks.

For MCP, point the agent at `https://mcp.vulnetix.com/mcp`. See [MCP server](/mcp-server/).

## Update

| Installed with | Update with |
|---|---|
| `vulnetix skills install` | `vulnetix skills update` (runs `npx skills update -y`, else `gh skills update --all`, else `claude plugin marketplace update`) |
| Claude Code plugin | `/plugin update vulnetix` |
| Hooks | Nothing to update: the hook is the CLI. Upgrade the CLI (`brew upgrade vulnetix`). |

No updater deletes a skill that a release removed. `vulnetix skills update` and `vulnetix skills check` list leftovers, and `vulnetix skills prune` removes them:

```bash
vulnetix skills prune          # print what would be removed
vulnetix skills prune --yes    # remove it
```

Prune reads `~/.agents/.skill-lock.json` and only touches entries the lock attributes to a Vulnetix source. Name skills (`vulnetix skills prune fix verify-fix --yes`) to remove those even if the release still ships them.

> [!CAREFUL] `vulnetix skills uninstall` removes every npx-installed skill
> With `npx` present it runs `npx skills remove --all`, which removes all skills the `skills` tool installed, not only Vulnetix's. To remove only Vulnetix skills, name them to `vulnetix skills prune --yes`. Without `npx` it prints each agent's skills directory for you to clean by hand.

## Verify

| Check | Command | Expect |
|---|---|---|
| CLI on the agent's `PATH` | `command -v vulnetix && vulnetix --version` | A path and a version |
| Which credential | `vulnetix auth status` | Your org, or the Community tier |
| Hosts and surfaces | `vulnetix agent hosts` | `INSTALLED yes` for your agent, `HOOKS yes` for Claude Code and Codex |
| Hooks wired | `vulnetix agent install --dry-run` | `hooks    already configured` |
| Skills present | `vulnetix skills check` | The Vulnetix skills in each directory, and any missing or retired ones |
| Hook answers | `echo '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"npm i left-pad"},"cwd":"'"$PWD"'"}' \| vulnetix agent hook` | Usually nothing: silence is a pass. See [Hooks](/pix/hooks/overview/). |

In Claude Code, `/hooks` lists three `vulnetix agent hook` entries (`PreToolUse`, `SessionStart`, `UserPromptSubmit`) and `/plugin` lists `vulnetix` as enabled.

## Credentials

None are required. The CLI looks for one in this order and uses the first it finds: `VULNETIX_API_TOKEN`; `VULNETIX_API_KEY` with `VULNETIX_ORG_ID`; `VVD_ORG` with `VVD_SECRET`; `./.vulnetix/credentials.json`; `~/.vulnetix/credentials.json`; the OS keyring; `.netrc`. With none, it runs on the shared Community credentials. A free Community key with its own quota is at `https://www.vulnetix.com/resolve/register`, then:

```bash
vulnetix auth login
```

It prints a URL and a code and waits until you approve in the browser. An agent cannot approve it for you. See [Authentication](/cli/authentication/overview/).
