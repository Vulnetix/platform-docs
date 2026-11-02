---
title: Wiring clients with install and uninstall
nav: Wiring clients
description: What vulnetix ai-firewall install writes for each AI client, how the API key is referenced, and how uninstall restores each file.
order: 2
sources:
  - cli/cmd/ai_firewall.go
  - cli/pkg/aifirewall/clients.go
  - cli/pkg/aifirewall/config.go
  - cli/pkg/aifirewall/provider.go
  - cli/internal/managedfile/shell.go
  - cli/internal/managedfile/file.go
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`vulnetix ai-firewall install` points the AI clients on this machine at the gateway. It edits the files each client already reads, inside marked blocks or merged keys, so `uninstall` can take exactly its own changes back out.

```bash
vulnetix ai-firewall install --dry-run
vulnetix ai-firewall install
vulnetix ai-firewall install shell claude-code --model claude-sonnet-4-5
vulnetix ai-firewall status
```

Per-client setup by hand, including clients `install` does not handle, is in [Clients](/ai-firewall/clients/overview/).

## What gets wired

1. **Providers.** Every provider in the gateway catalog that has a stored key and is not denied, or only those named with `--provider`. A provider without a key is skipped, because the gateway would answer every request `403 provider_key_missing`. Store keys first with `vulnetix ai-firewall key set <provider>`.
2. **Clients.** Every client detected on the machine, or only those named. A client is detected when its config file or directory exists or its binary (`claude`, `codex`, `aider`, `cursor`, `windsurf`) is on `PATH`. `shell` is always detected; `env` is detected inside a git repository.
3. **Wire check.** A client that needs a request surface the gateway does not serve for its provider is skipped with the reason. Claude Code needs `messages` on `anthropic`; Codex needs `responses` on `openai`.
4. **Model check.** `--model` is refused when the org's policy would reject it, with `model_denied` or `model_not_allowed`.

## Files written

| Client id | Default scope | File | Change | API key |
|---|---|---|---|---|
| `shell` | user | Your login shell's rc file (see below) | Managed block of `export` lines | `$VULNETIX_API_KEY` reference |
| `env` | project | `.env`, `.envrc` and `Makefile` at the git root, whichever exist | Managed block | `${VULNETIX_API_KEY}` reference |
| `claude-code` | project | `.claude/settings.json` (`~/.claude/settings.json` with `--scope user`) | `ANTHROPIC_BASE_URL` and, with `--model`, `ANTHROPIC_MODEL` merged into `env` | Not written; comes from the shell. With `--embed-key`, `ANTHROPIC_AUTH_TOKEN` goes into `settings.local.json`. |
| `codex` | user | `~/.codex/config.toml` | Managed `[model_providers.vulnetix-openai]` table with `wire_api = "responses"` and `env_key = "VULNETIX_API_KEY"`; root `model_provider = "vulnetix-openai"` and, with `--model`, `model` | Read from `$VULNETIX_API_KEY` by Codex |
| `continue` | user | `~/.continue/config.yaml` (or `config.json` when only that exists) | `models[]` entry named `Vulnetix AI Firewall (openai)` with `apiBase` and `apiKey: ${{ secrets.VULNETIX_API_KEY }}`; model `gpt-4o` unless `--model` | **Literal** `VULNETIX_API_KEY=...` in `~/.continue/.env`, mode `0600` |
| `aider` | project | `.aider.conf.yml` at the git root (`~/.aider.conf.yml` outside a repo) | `openai-api-base` and, with `--model`, `model: openai/<model>` | Not written; aider reads `OPENAI_API_KEY` |
| `cursor` | | none | Printed instructions: Settings > Models > Override OpenAI Base URL | You paste it |
| `windsurf` | | none | Printed instructions: Settings > Cascade > Model Provider | You paste it |

Continue is the one client where the key is unavoidably a literal: it runs inside an IDE, cannot read the shell environment, and resolves `${{ secrets.X }}` from `~/.continue/.env`.

### The shell block

The rc file is chosen from `$SHELL`:

| `$SHELL` | File | Syntax |
|---|---|---|
| `zsh` | `~/.zshrc` | `export` |
| `bash` | `~/.bashrc` | `export` |
| `fish` | `~/.config/fish/config.fish` | `set -gx` |
| `tcsh` | `~/.tcshrc` | `setenv` |
| `csh` | `~/.cshrc` | `setenv` |
| anything else | `~/.profile` | `export` |

On Windows the variables are set in the user environment instead of a file.

For an org with OpenAI and Anthropic keys stored, the zsh block is:

```sh
# Vulnetix AI Firewall
export OPENAI_BASE_URL="https://guardrails.vulnetix.com/openai/<org-uuid>/v1"
export OPENAI_API_BASE="https://guardrails.vulnetix.com/openai/<org-uuid>/v1"
export OPENAI_API_KEY="$VULNETIX_API_KEY"
export ANTHROPIC_BASE_URL="https://guardrails.vulnetix.com/anthropic/<org-uuid>"
export ANTHROPIC_AUTH_TOKEN="$VULNETIX_API_KEY"
# End Vulnetix AI Firewall
```

`install` never writes `VULNETIX_API_KEY` itself. Export it from wherever you keep credentials, or the wired clients send an empty key and `status` reports `key_env_unset`.

> [!CAREFUL] The shell block reroutes every OpenAI and Anthropic SDK in that shell
> `OPENAI_API_KEY` and `ANTHROPIC_AUTH_TOKEN` now hold the Vulnetix key, so any script in that shell that calls OpenAI or Anthropic goes through the gateway and is subject to the org's policy. That is the intent. A script that must reach the provider directly needs its own variables.

### Variables per provider

| Provider | Base URL variables | Key variable |
|---|---|---|
| `openai` | `OPENAI_BASE_URL`, `OPENAI_API_BASE` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_BASE_URL` (no `/v1`) | `ANTHROPIC_AUTH_TOKEN` |
| `groq` | `GROQ_BASE_URL` (not verified against the SDK source) | `GROQ_API_KEY` |
| `mistral`, `deepseek`, `xai`, `openrouter`, `together`, `fireworks` | none | none |

`OPENAI_API_BASE` is the older spelling that LangChain and LlamaIndex read, so both are covered without a file of their own. `ANTHROPIC_AUTH_TOKEN` is used instead of `ANTHROPIC_API_KEY` because it makes the SDK send `Authorization: Bearer`.

No SDK reads a base-URL variable for the six providers in the last row. `install` writes an informational `VULNETIX_AIFW_<SLUG>_BASE_URL` (for example `VULNETIX_AIFW_MISTRAL_BASE_URL`) that nothing consumes, and prints a `snippet` command. For those providers the base URL has to be set in code; see [Code snippets](/ai-firewall/cli/snippets/).

## Flags

| Flag | Meaning |
|---|---|
| `--provider <slug>` | Wire only these providers |
| `--model <id>` | Pin a default model in Claude Code, Codex, Continue and aider |
| `--scope user\|project` | Override the client's default scope |
| `--embed-key` | Write the literal key instead of a reference. Refused for a file git would commit; a file holding the key is set to mode `0600`. |
| `--create-env` | Create `.env` at the git root when none of `.env`, `.envrc`, `Makefile` exists. Without it, `env` does nothing in that case. |
| `--dry-run` | Print each file and what would change |

## Safety of the edits

- An existing JSON, TOML or YAML config is copied to `<file>.vulnetix.bak` each time `install` changes it. Managed blocks in rc and env files are not backed up; `uninstall` removes the block. Written files get mode `0600`.
- JSON files are merged: only the keys `install` owns change. A `settings.json` that is not valid JSON is refused, not rewritten.
- `config.toml` is edited as text so comments and table order survive, and the result is parsed before it is written.
- `config.yaml` is edited through the YAML node API so comments and key order survive.
- Running `install` again is idempotent: unchanged files report `already configured`.

## uninstall

```bash
vulnetix ai-firewall uninstall --dry-run --all
vulnetix ai-firewall uninstall claude-code codex
vulnetix ai-firewall uninstall --except shell
```

Uninstall needs no credential and makes no API call. For each client it either restores the `.vulnetix.bak` backup, strips only the keys and blocks `install` wrote, or deletes a file `install` created. A file you wrote is never deleted. For `cursor` and `windsurf` it reminds you to clear the override in the application's settings.

Server-side policy and stored provider keys are not touched. To remove a key, run `vulnetix ai-firewall key remove <provider>`.

## Related

- [Status and checks](/ai-firewall/cli/status-and-checks/)
- [Keys and base URLs](/ai-firewall/get-started/keys-and-base-urls/)
- [Clients](/ai-firewall/clients/overview/)
