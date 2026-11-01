---
title: Guardrails, classifier, sandbox and trust
nav: Guardrails
description: How Belai keeps a model from acting on text it should not trust. Sealed delimiters, sanitisation, the security classifier, permission rules, the OS sandbox, trusted directories, and the switches that loosen each on purpose.
order: 9
sources: [belai/README.md, belai/docs/role-manager.md, belai/docs/sanitization.md, belai/docs/sandbox.md, belai/docs/nonce-endpoint-spec.md, belai/docs/jev-jobs.md, belai/cmd/belai/help.go]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Belai is built so that a model cannot be steered by text it reads: a web page, a file in the repository, a tool's output, a message from another agent. Several layers do this.

## Sealed delimiters

Every block Belai sends a model (its instructions, the agent profile, the tools, your prompt, a tool result) is fenced with a delimiter that carries a nonce and an integrity hash. Untrusted text can never enter the instruction blocks, and a block that fails its check (an unknown nonce, a bad hash, a forged delimiter) is stripped before anything leaves for the provider.

## Sanitisation

Belai cleans text with deterministic code, one rule set per destination: text for a model, a terminal line, a file path, a URL, a shell command. No model is asked whether a value is safe. Control characters, terminal escapes, bidirectional overrides and invisible characters are removed or refused.

## The security classifier

The Role Manager classifies untrusted content (your prompt, and tool results from the shell, the web and file reads) before the model acts on it. It answers with a single verdict. The default build embeds the first-stage classifier, so this works with no provider configured. A second stage can run on Jev or Clef.

| Flag | Meaning |
|---|---|
| `-classifier-kind`, `-classifier-provider`, `-classifier-model`, `-classifier-effort` | Choose the classifier |

## Permission rules and ask

Every tool call goes through your permission rules: allow, ask or deny by tool and pattern. `/permissions` edits them. With **ask** on (`f4`), a call the rules would ask about waits for you. With ask off, it is decided by the rules, the classifier and the sandbox.

## Guardrails

**Guardrails** (`f3`) are the posture gates on prompts and results. Each gate can enforce, warn or be ignored. A fleet worker or a remote control session starts with guardrails on, and the website can turn them off only when the host passed `--web-allow-guardrails-off`.

## The OS sandbox

A command can reach anything your account can, so Belai runs commands inside an operating-system boundary: only the workspace, a private `/tmp` and the usual tool caches are writable, Belai's own state is hidden, and the network can be switched off. `/sandbox` shows the sandbox's status and policy.

## Trusted directories

Belai asks the first time you open a directory whether to trust it. A repository cannot trust itself. `/trusted` manages the list; remote control offers only trusted directories. `-trust-dir` trusts the current directory from the command line.

## Loosening on purpose

Some flags turn a gate off for one run. Each is named for what it does:

| Flag | Allows |
|---|---|
| `-dangerously-yolo-everything` | Every posture gate set to ignore (except the boundary-source gate), with guardrails and ask off |
| `-allow-unsafe-prompt`, `-allow-malformed-prompt` | A prompt the classifier or parser refused |
| `-allow-unsafe-tool-result`, `-allow-malformed-tool-result` | A tool result the classifier or parser refused |
| `-allow-unpermitted-tools` | Tool calls that match no permission rule |
| `-allow-ask-without-tty` | Asks when nobody is at the terminal |
| `-allow-invalid-skills`, `-allow-invalid-hooks` | Skills or hooks that failed validation |
| `-tool-call-mismatch` | What to do when a model calls a tool it was not offered: `abort`, `strip` or `ignore` |
| `-guardrails`, `-ask-permission` | Both default to true; `-guardrails=false` or `-ask-permission=false` turns one off for the run |

`/yolo` turns guardrails and ask off together in the TUI.

> [!CAREFUL] These flags remove protections
> Use them only in a throwaway sandbox. A factory worker or a web session can have guardrails turned off only if its host allowed it with `--web-allow-guardrails-off`.

## Jev jobs

Jev can also be the security gate's decision model: a score at or below `jev.thresholds.allow_at` (0.10 by default) lets a call or content through, one at or above `jev.thresholds.deny_at` (0.90) blocks it, and the band between goes to the agent model or a person. `jev.jobs` turns individual Jev jobs on or off.

## Related

- [AI Firewall](/software-factory/evidence/firewalls/)
- [Questions and permissions](/software-factory/workforce/questions-and-permissions/)
