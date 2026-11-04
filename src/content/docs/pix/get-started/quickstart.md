---
title: Pix quickstart
nav: Quickstart
description: Wire the Pix hooks into Claude Code or Codex, install the 18 skills, check both are live, and run your first skill in the agent.
order: 1.5
sources: [cli/cmd/agent.go, cli/internal/agent/install.go, cli/cmd/skills.go, cli/cmd/pix.go, pix-ai-coding-assistant/skills/typosquat-check/SKILL.md]
checked: [cli@v4.17.1, pix-ai-coding-assistant@de11107e2]
updated: 04 Nov 2026
---

This page puts Pix into the coding agent you already use: the hooks that stop a malicious install or a committed credential, and the skills you call by name.

## Prerequisites

- The Vulnetix CLI on the `PATH` of the process that starts your agent: `brew install Vulnetix/tap/vulnetix`, or see [Install the CLI](/cli/get-started/install/).
- A coding agent on this machine. Hooks are wired for Claude Code and OpenAI Codex. Skills reach every agent in [What each agent gets](/pix/get-started/install/#what-each-agent-gets).
- No credential. Without one the CLI uses the shared Community tier.

## 1. Wire the hooks

```bash
vulnetix agent install
```

It detects each agent and writes one `vulnetix agent hook` entry per event into that agent's own settings file:

```text
Claude Code
  hooks    configured ~/.claude/settings.json
  skills   ~/.claude/skills
  mcp      https://mcp.vulnetix.com/mcp
```

A second run prints `hooks    already configured`. Add `--dry-run` to see the change first.

## 2. Install the skills

```bash
vulnetix skills install
```

`vulnetix pix install` does the same. It uses `npx skills add`, else the `claude` plugin commands, else `gh skills add`, whichever it finds first. In Claude Code you can instead run `/plugin marketplace add Vulnetix/pix-ai-coding-assistant` and `/plugin install vulnetix@vulnetix-plugins`, which also brings the hooks and the 5 subagents.

## 3. Check both are live

```bash
vulnetix agent hosts
vulnetix skills check
```

`agent hosts` should show `INSTALLED yes` for your agent, and `HOOKS yes` for Claude Code and Codex. `skills check` lists the Vulnetix skills in each skills directory, and any that are missing or retired. In Claude Code, `/hooks` lists three `vulnetix agent hook` entries.

## 4. Run a skill

Open your agent in a repository and ask whether a package name is safe:

```text
/vulnetix:typosquat-check expresss
```

That is the Claude Code plugin's name. Installed through `npx skills` or `gh`, the skill is `/typosquat-check`. The skill answers `ALLOW`, `WARN` or `BLOCK` with its reason, and records the check in `.vulnetix/memory.yaml`.

## 5. Try the guard

Ask the agent to run `npm i event-stream@3.3.6`. That version is on a malware feed, so the dependency guard denies the call and gives the agent the package card as the reason. `npm i axios` passes and prints nothing: silence is a pass.

## Next

- [Install, update and verify](/pix/get-started/install/) for every agent, updates and pruning.
- [Skills](/pix/skills/overview/) for all 18 and their arguments.
- [Dependency guard](/pix/hooks/dependency-guard/) and the [policy file](/pix/hooks/policy-file/) to warn instead of block.
- [Troubleshooting](/pix/get-started/troubleshooting/) when a hook says nothing.
