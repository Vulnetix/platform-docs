---
title: Code, secrets and infrastructure
description: "Findings from the CLI's embedded rule set: the four rule kinds, their diagnostic sources and triggers, how a finding is placed, and what the editor does not do yet."
order: 3
sources: [cli/internal/lsp/diagnostics.go, cli/internal/lsp/server.go, cli/internal/sast/kinds.go, cli/internal/sast/nosec.go, cli/cmd/scan.go, cli/cmd/lsp.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
status: available
---

The server evaluates the same embedded Rego rule set as `vulnetix sast` and `vulnetix scan`, in process, with no network access. Rules are grouped into four kinds:

| Rule kind | Diagnostic source | Runs | Covers |
|---|---|---|---|
| `sast` | `vulnetix-sast` | As you type and on save | Injection, unsafe deserialisation, weak cryptography, path traversal, SSRF and the rest of the code rules |
| `iac` | `vulnetix-iac` | As you type and on save | Terraform and OpenTofu, Kubernetes manifests, Helm and similar configuration |
| `oci` | `vulnetix-containers` | As you type and on save | `Dockerfile`, `Containerfile` and Compose files |
| `secrets` | `vulnetix-secrets` | On save only | Credential shapes: cloud keys, tokens, private keys, connection strings |

The rule catalogue itself is documented with the scanners: [SAST](/sast/), [Secrets](/secrets/), [IaC scanning](/iac-scanning/) and [Containers](/sca/).

## What a finding carries

| Field | Content |
|---|---|
| Range | The lines the rule reported, narrowed to the matching columns where the snippet can be found on the line |
| Severity | critical or high is an Error, medium a Warning, low and info an Information (or Hint, see [Severity and filtering](/vscode/findings/severity/)) |
| Code | The rule ID, such as `VNX-DOCKER-008`, linked to the rule's help page when the rule declares one |
| Source | One of the four sources above. A rule kind the extension does not recognise is shown under `vulnetix-sast`. |

## Scope

- Only documents with the `file` scheme are analysed. Untitled buffers, notebook cells and files from virtual filesystems are not.
- A file outside the first workspace folder is not analysed, because rule paths are relative to that root.
- The workspace index behind each evaluation is built once at startup, to depth 3 and honouring `.gitignore`. Rules that look at neighbouring files see that index plus your open buffer.

## Git history

The editor never walks git history for secrets: the server indexes with git disabled. `vulnetix scan` walks it by default (`--git-history`, default `true`), so a secret committed and later removed can appear in CI and not in the editor. That is expected, not drift.

> [!CAREFUL] `nosec` comments do not suppress findings in the editor
> `vulnetix scan` drops findings on a line carrying `# nosec` or `// nosec` (gosec syntax, also `nosec VNX-ID,VNX-ID` and line 1 for a whole file). The language server does not run that pass, so the editor still shows those findings. Use `.vulnetix/memory.yaml` or `vulnetix.suppressions` to hide them in the editor: see [Suppressions](/vscode/findings/suppressions/).

## Not available yet

There is no setting to add rule packs, disable the default rules, drop findings in test files, or turn individual kinds off. The settings the old docs named for these (`vulnetix.sast.rules`, `vulnetix.sast.suppressTestCode`, `vulnetix.scan.features` and others) do not exist. See [Not available yet](/vscode/reference/not-available-yet/).
