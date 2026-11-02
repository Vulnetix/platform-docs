---
title: Glob reference
description: The pattern syntax of tool, MCP, skill and client rules, where only * is special, matching is anchored and case-sensitive, and how each API validates a pattern.
order: 20
sources:
  - ai-firewall/internal/policy/glob.go
  - cli/pkg/aifirewall/policy.go
  - vdb-api/internal/handler/ai_firewall_rules.go
checked: [ai-firewall@339de55, cli@4c8c3b7, vdb-api@4145f0a]
updated: 02 Nov 2026
---

Capability rules (`tool_*`, `mcp_*`, `skill_*`, `client_*`) take a glob. Content rules take an [RE2 regex](/ai-firewall/reference/regex-reference/).

## Syntax

- `*` matches any run of characters, including none.
- Every other character matches itself. `.`, `?`, `[`, `^`, `$` and `\` have no special meaning.
- The pattern is anchored at both ends.
- Matching is case-sensitive.
- Leading and trailing whitespace is trimmed.

The gateway compiles a glob by quoting each part between `*` characters and joining them with `.*`, inside `\A` and `\z`.

| Pattern | Matches | Does not match |
|---|---|---|
| `Bash` | `Bash` | `bash`, `Bashful`, `BashOutput`, `run_Bash` |
| `mcp__github__*` | `mcp__github__create_pull_request`, `mcp__github__` | `mcp__githubx__list`, `mcp__gitlab__create_issue` |
| `mcp__*__delete_*` | `mcp__jira__delete_issue` | `mcp__jira__remove_issue`, `delete_file` |
| `*deploy*` | `deploy`, `blue-green-deploy-prod` | `Deploy` |
| `*` | every name in the family | |
| `a.c` | `a.c` | `abc` |

Client names are always lowercase (`claude-code`, `codex-cli`), so a client pattern must be lowercase to match.

## Validation

| Where | Empty pattern | `^Bash$` |
|---|---|---|
| `vulnetix ai-firewall apply` | refused: `a capability rule needs a pattern` | refused: `capability patterns are globs, not regexes` |
| CLI API (`policy guardrail`) and console API | refused: `pattern is required for a capability rule` | accepted, and matches only a tool literally named `^Bash$` |
| Gateway | rule skipped | matches only `^Bash$` |

## Porting from a regex

| Regex | Glob |
|---|---|
| `^Bash$` | `Bash` |
| `^mcp__github__` | `mcp__github__*` |
| `delete` (unanchored) | `*delete*` |

There is no alternation or character class. A regex alternation of two names becomes two rules, one for `Bash` and one for `Read`.

## Why not a regex

A capability rule matches a name from a list. Someone who types `Bash` means `Bash`; an unanchored regex would also match `Bashful`. Worse, `mcp__github__*` is a valid regex meaning `mcp__github_` followed by any number of underscores, so it would compile, store, report itself as enabled and match nothing anyone intended.

## Related

- [Tool rules](/ai-firewall/policy/tools/)
- [Policy file reference](/ai-firewall/reference/policy-file/#pattern-syntax)
