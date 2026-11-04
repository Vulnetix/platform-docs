---
title: "Secret rules: Webhooks & Signed URLs"
nav: "Webhooks & Signed URLs"
description: "Slack/Teams/Discord webhook URLs and signed URLs with embedded secrets."
order: 13
sources: ["cli/internal/sast/secretsgen/catalog.json", "cli/internal/sast/secretsgen/main.go"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

4 rules, kind `secrets`. They run under `vulnetix secrets` and the secrets stage of `vulnetix scan`, not under `vulnetix sast`. Each is generated from one entry in `internal/sast/secretsgen/catalog.json`.

Detection: `keyword` means the pattern is tried only on lines that contain one of the listed keywords (case-insensitive); `entropy` means the matched token must also reach the entry's minimum Shannon entropy. Every catalog rule skips test files, lockfiles, minified and generated files, and paths under `testdata/`, `fixtures/`, `vendor/`, `node_modules/`, `dist/`, `build/` and `src/test/` (the `skip_path` list in `internal/sast/rules/lib_secrets.rego`), and documented example tokens.

| Rule ID | Name | Severity | Detection | Keywords | CWE |
|---|---|---|---|---|---|
| <a id="vnx-sec-099"></a>`VNX-SEC-099` | Zapier webhook URL | High | keyword + regex | `hooks.zapier.com` | CWE-798 |
| <a id="vnx-sec-180"></a>`VNX-SEC-180` | Cloudflare Workers / Pages deploy webhook URL | Medium | regex | `api.cloudflare.com/client/v4/pages/webhooks` | CWE-798 |
| <a id="vnx-sec-417"></a>`VNX-SEC-417` | Discord webhook URL | High | keyword + regex | `discord.com/api/webhooks` `discordapp.com/api/webhooks` | CWE-798 |
| <a id="vnx-sec-457"></a>`VNX-SEC-457` | Microsoft Teams incoming webhook URL (Power Automate) | High | keyword + regex | `logic.azure.com` `workflows` `triggers/manual` | CWE-798 |

Suppress one with `// nosec <rule-id>` on the line, or `vulnetix ignore add --rule <rule-id>`. See [Suppressing findings](/sast/guides/suppressing-findings/).
