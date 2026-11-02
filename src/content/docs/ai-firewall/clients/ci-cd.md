---
title: Agents in CI/CD
nav: CI/CD
description: Run Claude Code, aider or SDK code on a CI runner through the gateway with one secret, and gate the job on `vulnetix ai-firewall status --strict`.
order: 11
sources: [cli/cmd/ai_firewall.go, cli/pkg/aifirewall/checks.go, cli/pkg/auth/credentials.go, cli/cmd/package_firewall.go, ai-firewall/internal/api/handlers.go, ai-firewall/website/content/docs/coding-agents/ci-cd.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

A runner needs only your **Vulnetix API key**. The provider key stays in the vault, so it is never a repository secret, never in a log and never exposed to a fork's pull request. Store the provider key once from a workstation:

```bash
vulnetix ai-firewall key set anthropic --from-env ANTHROPIC_KEY
```

In the repository (or organisation) settings:

| Kind | Name | Value |
|---|---|---|
| Secret | `VULNETIX_API_KEY` | Your Vulnetix API key |
| Variable | `VULNETIX_ORG_ID` | The UUID the key belongs to. It is part of a URL, not a secret. |

The CLI authenticates from `VULNETIX_API_KEY` plus `VULNETIX_ORG_ID`, so the same two values serve both the CLI and the agent.

## Claude Code in GitHub Actions

`anthropics/claude-code-action` runs Claude Code, which takes the same variables as on a laptop:

```yaml
name: Claude
on:
  issue_comment:
    types: [created]
jobs:
  claude:
    if: contains(fromJSON('["OWNER","MEMBER","COLLABORATOR"]'), github.event.comment.author_association)
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        env:
          ANTHROPIC_BASE_URL: https://guardrails.vulnetix.com/anthropic/${{ vars.VULNETIX_ORG_ID }}
          ANTHROPIC_AUTH_TOKEN: ${{ secrets.VULNETIX_API_KEY }}
          ANTHROPIC_API_KEY: ""
```

No `/v1` on `ANTHROPIC_BASE_URL`, and `ANTHROPIC_API_KEY` empty so a stale Anthropic key cannot be sent instead.

> [!CAREFUL] Guard the trigger too
> Routing model calls through the gateway does not stop an untrusted comment or pull request from starting them. The `if:` above limits the job to trusted authors; use the same kind of gate on any agent workflow that can write to the repository.

## aider, or any OpenAI-shaped agent

```yaml
      - name: Run aider
        env:
          OPENAI_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
        run: |
          aider --openai-api-base "https://guardrails.vulnetix.com/openai/${{ vars.VULNETIX_ORG_ID }}/v1" \
                --model openai/gpt-4o-mini \
                --yes --message "Fix the failing test in tests/test_parser.py"
```

OpenAI-shaped base URLs end in `/v1`; Anthropic-shaped ones stop at the UUID. For SDK code, export `OPENAI_BASE_URL` and `OPENAI_API_KEY` the same way, or set `base_url` in code (see [Python](/ai-firewall/clients/python/)).

## Gate the job

`vulnetix ai-firewall status --strict` fails the step when any **error-level** check fails. Run it before the agent step, so a missing key or refused model is a fast red build rather than a half-finished pull request.

```yaml
      - name: AI Firewall posture
        env:
          VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
          VULNETIX_ORG_ID: ${{ vars.VULNETIX_ORG_ID }}
          ANTHROPIC_BASE_URL: https://guardrails.vulnetix.com/anthropic/${{ vars.VULNETIX_ORG_ID }}
          ANTHROPIC_AUTH_TOKEN: ${{ secrets.VULNETIX_API_KEY }}
        run: vulnetix ai-firewall status --strict
```

`status` inspects the environment of the step it runs in, so give it the same variables the agent step gets.

| Check | Severity | Fails `--strict` |
|---|---|---|
| `provider_denied` | error | yes |
| `provider_key_missing` | error | yes |
| `model_denied`, `model_not_allowed` | error | yes |
| `bypasses_firewall` | warning | no |
| `wire_unsupported` | warning | no |
| `key_env_unset` | warning | no |
| `guardrail_pattern_invalid` | warning | no |

To fail on warnings too, read the JSON summary:

```yaml
        run: |
          vulnetix ai-firewall status --strict -o json > fw.json
          jq -e '.summary.warnings == 0' fw.json
```

## Errors seen first in CI

| Status | `code` | Usual CI cause |
|---|---|---|
| `401` | `invalid_api_key` | The secret holds a provider key, or the job cannot see it (an environment it did not name, or a fork pull request) so it expands to an empty string |
| varies | varies | `vars.VULNETIX_ORG_ID` is empty, so the URL has `//` where the UUID should be. Print the URL the job uses. |
| `403` | `provider_key_missing` | The workflow was written before anyone stored the provider key |
| `403` | `model_not_allowed` | The action's default model changed in a new release. Pin the model. |
| `404` | `unsupported_api` | `/v1` on an Anthropic URL, or a provider that does not serve the surface |

## Limits

- `status --strict` checks configuration, not traffic. A step that calls `api.openai.com` with its own key is invisible to it.
- Anyone who can edit the workflow can remove the gateway. Protect workflow files with required reviews.
- Tool-call arguments are not scanned. The checkout, build output and test output fed back as tool results are.
