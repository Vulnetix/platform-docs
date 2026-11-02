---
title: Troubleshooting
description: Why a hook says nothing, why skills do not appear, what a policy-file warning means, and how to tell which credential the guard runs on.
order: 3
sources: [cli/cmd/agent.go, cli/internal/agent/run.go, cli/internal/agent/policy.go, cli/internal/agent/lookup.go, cli/internal/agent/changeguard.go, cli/internal/agent/hosts.go, pix-ai-coding-assistant/README.md]
checked: [cli@4c8c3b7, pix-ai-coding-assistant@7aebf02]
updated: 02 Nov 2026
---

## The guard says nothing

Silence is the normal answer. `vulnetix agent hook` prints nothing when:

| Cause | How to tell |
|---|---|
| The package satisfies your policy, which is nearly always | Expected. Try a package with a known advisory to see a warning. |
| `enabled: false` in `.vulnetix/agent.yaml` | `grep enabled .vulnetix/agent.yaml` |
| The command is not an install the guard recognises | See [recognised commands](/pix/hooks/dependency-guard/#commands-it-reads) |
| The edited file is not a manifest the CLI parses, or the edit does not parse yet | Only a parseable manifest is assessed |
| The API was unreachable, the lookup timed out (12 seconds) or nothing is known about the package | No verdict is given on missing data |
| The payload had no event name and no `--event` was passed | Run the test below |
| The hook is not wired | `vulnetix agent install --dry-run` |

Test the hook directly from the repository root:

```bash
echo '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git commit -m test"},"cwd":"'"$PWD"'"}' | vulnetix agent hook
echo "exit $?"
```

The exit status is always `0`. Output, when there is any, is one JSON line with `hookSpecificOutput`.

## Codex never runs the hook

Codex skips a hook it does not trust and reports nothing. Approve the Vulnetix hook when Codex asks. Check `~/.codex/hooks.json` holds an entry whose command is `vulnetix agent hook`.

## The host cannot find `vulnetix`

The hook command is the bare word `vulnetix`, resolved from the `PATH` of the process that started your agent, which can differ from your shell's.

```bash
command -v vulnetix
vulnetix --version
```

Add the CLI's directory to the environment that starts the agent, then restart it. An old install may have written an absolute, versioned path into the host config; run `vulnetix agent install` again with a current CLI to rewrite this CLI's entry and nothing else.

## `vulnetix agent: ... using defaults` on stderr

`.vulnetix/agent.yaml` could not be read or parsed, so the hook is running on the default policy, not on what the file says. Fix the YAML. The top-level key must be `agent:`. See [Policy file](/pix/hooks/policy-file/).

## The change guard says it stopped at its cap

It reads at most 400 files or 8 MB of a change, inside an 8-second budget. A larger commit or a first push of a whole repository is only partly read, and the guard says so instead of reporting the change clean. Run `vulnetix secrets` on the repository for a full scan. See [Secrets](/secrets/).

## Skills do not appear

| Agent | Fix |
|---|---|
| Any | `vulnetix skills check` lists what is installed in each directory and what is missing. Re-run `vulnetix skills install`. |
| Codex | Codex reads `~/.agents/skills`, not `~/.codex/skills`. |
| Claude Code plugin | Skills are namespaced: `/vulnetix:fix CVE-2021-44228`, not `/vulnetix fix`. |
| After an update | A skill a release removed stays until `vulnetix skills prune --yes`. |

## Which credential am I on

```bash
vulnetix auth status
```

On the shared Community tier, reads work, the daily limit is shared with every other anonymous caller, and scans store no server-side snapshot. Get your own key at `https://www.vulnetix.com/resolve/register`, then `vulnetix auth login`.

## The session summary is stale or missing

`session-context` reads the last scan recorded in `.vulnetix/memory.yaml`; it does not scan. Run `vulnetix scan` to refresh it; a scan run with `--disable-memory` does not update it. With no scan on record, the session starts with `Vulnetix: no scan on record for this repository.` and a prompt that names a CVE gets no answer.
