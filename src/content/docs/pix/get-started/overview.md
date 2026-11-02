---
title: Overview
description: Pix is Vulnetix for coding agents. Three hooks and eighteen skills in your own agent, five subagents, hosted Pix Sandboxes that run Belai for you, and voice calls with Pix.
order: 1
sources: [pix-ai-coding-assistant/README.md, pix-ai-coding-assistant/.claude-plugin/marketplace.json, pix-ai-coding-assistant/vulnetix/hooks/hooks.json, cli/cmd/agent.go, cli/cmd/skills.go, vdb-site/api/internal/handler/belai_items_validate_launch.go, website/sandbox-worker/src/egress.ts, website/src/worker/call/routes.ts]
checked: [pix-ai-coding-assistant@7aebf02, cli@4c8c3b7, vdb-site@1a06d67, website@ad775f3]
updated: 02 Nov 2026
---

Pix is the name for the Vulnetix pieces that work alongside a coding agent. Some run inside the agent you already use. Some are machines and services Vulnetix runs for you.

| Part | Where it runs | What it does | Start with |
|---|---|---|---|
| Hooks | Your coding agent, through `vulnetix agent hook` | Checks a dependency before it is installed, a commit or push for credentials, and tells the agent what the last scan found | [Hooks](/pix/hooks/overview/) |
| Skills | Your coding agent's skills directory | 18 procedures that need your working tree: pick a dependency, trace a CVE into this repository, apply and verify a fix, scan, publish VEX | [Skills](/pix/skills/overview/) |
| Subagents | Claude Code, from the plugin | 5 multi-step workflows with their own context: bulk triage, upgrades, PR review, compliance bundles, incident response | [Subagents](/pix/agents/overview/) |
| Pix Sandboxes | A container Vulnetix runs per purchase | A Belai host that is always online, with your repositories cloned, a hostname egress policy and a launch configuration | [Pix Sandboxes](/pix/sandboxes/overview/) |
| Pix calls | The console's `/call` page | Talk to Pix, the factory's coordinator: ask how work is going, start or stop sessions, with a read-back before anything starts | [Voice calls](/pix/calls/voice-calls/) |

Looking a vulnerability up is not a Pix skill. That is the [MCP server](/mcp-server/) (`https://mcp.vulnetix.com/mcp`) and the CLI's own `vulnetix vdb` subcommands. Every Pix skill exists because it needs the repository, needs you, or needs a sequence of steps.

## Install in one minute

```bash
vulnetix agent install      # hooks for Claude Code and Codex
vulnetix skills install     # the 18 skills, for every agent it can reach
```

No CLI yet: `brew install Vulnetix/tap/vulnetix`, or `curl -fsSL https://cli.vulnetix.com/install.sh | sh`. See [Install](/pix/get-started/install/) for each agent, the Claude Code marketplace, and how to check it is working.

No credential is needed. The CLI falls back to the shared Community tier: reads work, the rate limit is shared with every other anonymous caller, and scans store no snapshot. `vulnetix auth login` gives you your own quota.

## How the parts connect

- The hooks and skills call the [Vulnetix CLI](/cli/) on your machine. The CLI is the only surface that reads your working tree, edits a manifest or runs without a credential. Dependency names and versions are sent to Vulnetix; source code is not.
- A skill uses the MCP tools (`vulnetix_*`) when the agent has them, and the CLI otherwise. This rule is written once in [`skills/_lib/contract.md`](https://github.com/Vulnetix/pix-ai-coding-assistant/blob/main/skills/_lib/contract.md).
- State a skill or hook writes lives in `.vulnetix/` in the repository. See [Repository files](/pix/reference/repository-files/).
- A Pix Sandbox runs [Belai](/software-factory/belai/install-and-sign-in/), the agent harness the Software Factory dispatches to. Its machine settings and installed items come from a [launch configuration](/pix/sandboxes/launch-configurations/); its outbound traffic goes through the [egress policy](/pix/sandboxes/egress/).
- A Pix call drives the same factory by voice. The factory's own docs cover [what you can ask on a call](/software-factory/pix/calling-pix/) and [every voice tool](/software-factory/pix/voice-tools/).

## Find the page for your task

| I want to | Read |
|---|---|
| Stop my agent installing a known-malicious package | [Dependency guard](/pix/hooks/dependency-guard/) |
| Make the guard warn instead of block, or switch it off | [Policy file](/pix/hooks/policy-file/) |
| Catch a credential before `git commit` | [Change guard](/pix/hooks/change-guard/) |
| Ask "does CVE-2021-44228 affect us?" | [Vulnerability skills](/pix/skills/vulnerabilities/) |
| Review a pull request with every scanner at once | [`pr-security-reviewer`](/pix/agents/pr-security-reviewer/) |
| Give every sandbox the same agents, packs and allowed hosts | [Launch configurations](/pix/sandboxes/launch-configurations/) |
| Let a sandbox reach `*.pythonhosted.org` and nothing else new | [Egress policy](/pix/sandboxes/egress/) |
| Check on the factory from my phone | [Voice calls](/pix/calls/voice-calls/) |
| Fix a hook that says nothing | [Troubleshooting](/pix/get-started/troubleshooting/) |

## Platform IaC

Sandbox launch settings and egress are kinds: [`SandboxLaunchProfile`](/platform-iac/kinds/sandbox-launch-profile/) and [`SandboxEgressPolicy`](/platform-iac/kinds/sandbox-egress-policy/). The sandbox itself is bought in the console. `.vulnetix/agent.yaml`, the repository's hook policy read by `vulnetix agent hook` on every call ([Policy file](/pix/hooks/policy-file/)), is not an `apiVersion: vulnetix.com/v1` document, so `vulnetix config validate` does not check it. Launch configurations are versioned JSON documents in your library, saved through the API.
