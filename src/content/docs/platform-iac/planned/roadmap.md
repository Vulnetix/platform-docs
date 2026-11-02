---
title: "The config engine and CLI v4"
nav: Engine and CLI v4
description: The server-side engine that will plan, apply and export config documents, the CLI v4 commands on top of it, and Download as code in the console.
order: 1
sources: [config-schemas/README.md]
checked: [config-schemas@9bda9e1, cli@4c8c3b7]
updated: 02 Nov 2026
---

> [!CAREFUL] Partly available
> The engine's `/v1/config/kinds`, `validate`, `plan`, `apply` and `export` routes are live, and `vulnetix config plan`, `apply` and `export` ship in the CLI. They accept the `QualityGate` kind today; other kinds land kind by kind. The CLI module path change (v4) and the remaining items below are still planned. What works today is on the [Overview](/platform-iac/).

## The engine

One server-side engine will own every kind. Each front end (the CLI, the Terraform provider, the console) calls it, so they all accept the same documents and give the same results.

| Planned endpoint | Purpose |
|---|---|
| `GET /v1/config/kinds` | The kinds and their schemas, as built into the server from a `config-schemas` release. |
| `POST /v1/config/validate` | Validate documents without planning. |
| `POST /v1/config/plan` | Per object: create, update, delete or no change, with a field diff, a `planHash` and any blocking conditions. |
| `POST /v1/config/apply` | Apply a plan by its `planHash`, in dependency order, in one transaction for kinds stored in Postgres. |
| `GET /v1/config/export` | Current state as documents, with secrets redacted. Formats `yaml`, `hcl` and `sh`. |
| `GET`, `PUT`, `DELETE /v1/config/objects/{kind}/{name}` | One object at a time, for the Terraform provider. |

Planned behaviour:

- **Managers.** Each object records who manages it: `terraform`, `gitops:<repo>` or `console`, with the commit it came from.
- **Prune.** A manager can delete only objects it manages, and only when asked.
- **Drift.** A plan shows changes made outside the manager, such as an edit in the console, as drift.
- **Secrets.** `valueFrom` values are read on the client and sent once. They are never exported, and a plan shows a secret as changed only when you supply a new value.
- **Status.** Apply returns a `status` block per object. Connectors that need a browser (Slack OAuth, the GitHub App) return `status.phase: AwaitingAuthorization` and a URL.
- **Machine credentials.** A scoped management token for service accounts, with role checks on every policy write.

## CLI v4

A major CLI release will add:

| Planned command | Does |
|---|---|
| `vulnetix config plan` | Show what applying `.vulnetix/config/` (or `-f`) would change. Flags `--prune` and `--manager`. Exit 3 when the plan has blocking conditions. |
| `vulnetix config apply` | Apply the plan. |
| `vulnetix config export --format yaml\|hcl\|sh` | Write current state as documents, Terraform, or a script. |

`validate`, `kinds` and `schema` stay as they are. `vulnetix config set quality-gate|eol-policy|package-firewall` and `vulnetix ai-firewall apply|export` will become deprecated aliases that build a document and call the engine. That is the breaking change behind the major version.

The CLI's GitHub Action is also planned to gain `task: config-plan` (posting the plan on a pull request) and `task: config-apply` (on the default branch), and Software Factory a `config-apply` workflow node.

## Download as code

Console settings pages that map to a kind will get a **Download as code** menu with three formats: YAML, Terraform HCL with `import {}` blocks, and a bash script that runs `vulnetix config apply`. It works on unsaved form drafts too. Software Factory pages come first, because factory settings and workflows already export as YAML. Objects managed by Terraform or GitOps will show a **Managed as code** badge.
