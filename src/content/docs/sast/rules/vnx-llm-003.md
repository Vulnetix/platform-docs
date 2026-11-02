---
title: "VNX-LLM-003: Hardcoded LLM API key"
nav: "VNX-LLM-003"
description: "Reports Anthropic, OpenAI and Groq API keys by their prefixes, and high-entropy literals assigned to LLM-provider key variables or passed to provider clients; placeholders and environment lookups are ignored."
order: 792
sources: ["cli/internal/sast/rules/vnx-llm-003.rego", "cli/website/content/docs/sast-rules/vnx-llm-003.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-LLM-003` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `llm` `ai-security` `credentials` |
| Source | [`internal/sast/rules/vnx-llm-003.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-llm-003.rego) |

## Overview

An LLM provider API key, such as an OpenAI key (sk-), an Anthropic key (sk-ant-), or a similar credential, is hardcoded as a string literal in source code or configuration. Hardcoded keys are committed to version control and can be exposed through repository leaks, logs, or build artifacts, allowing anyone who discovers the key to consume your quota or access your data.

## Why This Matters

LLM API keys are credentials with real monetary value. A leaked OpenAI key can be used to run expensive inference jobs at your cost, access fine-tuned models, retrieve embeddings from your data, or abuse your usage tier. Attackers actively scan GitHub for exposed keys and begin exploiting them within minutes of exposure. Unlike database passwords, API keys for LLM services are often directly monetizable without any further lateral movement.

## What Gets Flagged

Anthropic (`sk-ant-api03-...`), OpenAI project/service-account/admin (`sk-proj-`, `sk-svcacct-`, `sk-admin-`) and classic (`sk-...T3BlbkFJ...`) keys anywhere in a file, and a high-entropy literal assigned to a provider-named key variable or passed as `api_key`/`apiKey` to a provider client.

```python
# FLAGGED: OpenAI project key passed to the client
client = OpenAI(api_key="sk-proj-<64 random characters>")
```

```bash
# FLAGGED: Anthropic key in a committed .env file
ANTHROPIC_API_KEY=sk-ant-api03-<93 random characters>AA
```

```typescript
// FLAGGED: provider-named key constant
export const COHERE_API_KEY = "<40 random characters>";
```

Not flagged: keys read from the environment (`os.environ["OPENAI_API_KEY"]`), placeholders (`sk-your-openai-api-key-here`, `sk-ant-xxxx...`, `REPLACE_WITH_...`), `sk-` inside longer identifiers (`task-`, `desk-`), and test or fixture paths.

## Remediation

1. Remove hardcoded keys from all source files and git history.
2. Rotate any exposed keys immediately via the provider's dashboard.
3. Load credentials from environment variables or a secrets manager.
4. Add key patterns to your `.gitignore` and pre-commit hooks.

```python
# SAFE: load key from environment variable
import os
client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
```

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [OpenAI – Best Practices for API Key Safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [OWASP – Hardcoded Passwords](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-llm-003
// nosec vnx-llm-003
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-llm-003 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
