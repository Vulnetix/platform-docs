---
title: "VNX-SEC-045: Discord bot token"
nav: "VNX-SEC-045"
description: "Reports Discord bot tokens whose first segment is the base64 of a numeric Discord snowflake id, written into files."
order: 939
sources: ["cli/internal/sast/rules/vnx-sec-045.rego", "cli/internal/sast/docs/vnx-sec-045.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-045` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `discord` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-045.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-045.rego) |

## Overview

This rule reports a Discord bot token: three dot-separated base64url segments, `<base64 bot id>.<6-character timestamp>.<27- or 38-character HMAC>`. The first segment must be the base64 encoding of a 17 to 20 digit snowflake id, which fixes the possible character at every position (`MT...`, `OD...`, `Nz...`), so JWTs, hashes and other dotted base64 strings are not reported. Placeholders, environment lookups and test, fixture and vendored paths are not reported either, and the snippet is redacted. Discord bot tokens grant the ability to act on behalf of the bot, read every DM the bot receives, post messages to channels the bot is in, and modify server settings the bot has permissions for.

## Why This Matters

A leaked Discord bot token can be used to scrape every DM the bot receives, including user reports, support tickets, and personal data. Discord's API does not require a re-authorization flow to use an existing bot token, so the attacker can act as the bot indefinitely until the token is regenerated.

## Remediation

1. **Regenerate the bot token in the Discord developer portal** → Applications → Bot → Reset Token.
2. **Store the new token in a secrets manager** (AWS SSM, Vault, Doppler, GitHub Actions secrets).
3. **Audit the bot's recent DMs and channel posts** for messages you did not author.
4. **Purge from git history** with `git filter-repo`.

## References

- [Discord Bot Tokens](https://discord.com/developers/docs/topics/oauth2#bot-tokens)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `discord-bot-token`](https://github.com/gitleaks/gitleaks)
- [truffleHog DiscordBot detector](https://github.com/trufflesecurity/trufflehog)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-045
// nosec vnx-sec-045
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-045 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
