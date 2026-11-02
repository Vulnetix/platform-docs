---
title: "vulnetix config plan"
nav: Plan
description: Show what applying config documents would change, per object, without changing anything. Flags, the manager default, credentials, secrets, text and JSON output, blocking conditions and exit codes.
order: 2
sources: [cli/cmd/config_engine.go, cli/cmd/config_engine_client.go, cli/cmd/config_engine_test.go, cli/cmd/exit_codes.go, vdb-site/api/internal/handler/config_engine.go, vdb-site/api/internal/config/engine.go]
checked: [cli@d01f1dbe3, vdb-site@b424ae4]
updated: 02 Nov 2026
---

`vulnetix config plan` sends your documents to the config engine and prints what applying them would do. Nothing is changed. It ships in CLI v4.0.0.

```sh
vulnetix config plan [-f <file|dir|->]... [--manager <manager>] [--prune] [--token <token>] [-o text|json]
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `-f`, `--file` | string, repeatable | `.vulnetix/config` | A file, a directory (walked recursively), or `-` for standard input. Read the same way as [validate](/platform-iac/cli/validate/#what-it-reads). |
| `--manager` | string | `gitops:<owner/repo>` | Who declares these documents: `terraform`, `console` or `gitops:<repo>`. See [The manager](#the-manager). |
| `--prune` | bool | `false` | Plan a delete for every object this manager owns that the documents no longer declare. |
| `--token` | string | | Config management token. See [Credentials](#credentials). |
| `-o`, `--output` | string | `text` | `text` or `json`. |

The command takes no positional arguments.

## What it does

1. Reads the documents. If none are found (for example, `.vulnetix/config/` does not exist), it fails with exit 2 instead of planning nothing, because planning nothing with `--prune` would delete every object the manager owns.
2. Validates every document offline, exactly as [`vulnetix config validate`](/platform-iac/cli/validate/) does. Any problem is printed on standard error and nothing is sent.
3. Resolves `valueFrom` secrets on this machine. See [Secrets](#secrets).
4. Sends `POST /api/site/v1/config/plan` with the documents, the manager, `prune`, and `sourceRef`: `GITHUB_SHA`, or else the checkout's `HEAD` commit.
5. Refuses if a document's `metadata.org` is not the tenant the plan was made for. The engine also blocks it, with `org_mismatch`.
6. Prints the plan.

## The manager

Every object applied as code records its manager. Only that manager can change or prune it later.

| Value | Use |
|---|---|
| `gitops:<owner/repo>` | Documents in a repository, applied by CI or by hand. |
| `terraform` | The Terraform provider. |
| `console` | Imperative edits: the console, and the deprecated `vulnetix config set quality-gate` and `set eol-policy`. |

Without `--manager`, the CLI uses `gitops:` plus the repository from `GITHUB_REPOSITORY` (set in GitHub Actions), or else from the first `github.com` remote of the git repository in the current directory. Outside such a repository `--manager` is required (exit 2).

The detected `owner/repo` is lowercased, so a local checkout whose remote says `acme/platform` and an Actions run that says `Acme/Platform` are the same manager. A `--manager` you pass is sent as is.

## Credentials

The engine changes tenant policy, so plan, apply and export need an owner or admin. The CLI sends the first of:

1. `--token <token>`, as `Authorization: Bearer <token>`;
2. the `VULNETIX_CONFIG_TOKEN` environment variable, the same way;
3. the credential `vulnetix auth login` stored, with its usual header (`Bearer` for a token, `ApiKey` otherwise).

In CI use a config management token (`vmt_...`) in `VULNETIX_CONFIG_TOKEN`. A service account's ApiKey is a member and gets HTTP 403. A 401 or 403 error names the credential source that was tried.

The engine is reached at `https://www.vulnetix.com/api/site/v1`. `VULNETIX_WEB_URL` replaces `https://www.vulnetix.com`, as it does for `vulnetix auth login`.

## Secrets

A field may hold `valueFrom` instead of a value:

```yaml
token:
  valueFrom: { env: SLACK_BOT_TOKEN }   # or: { file: ~/.secrets/slack }
```

The CLI replaces it with the value before sending. The value is never printed: any occurrence of a resolved value (4 characters or longer) in the plan is shown as `(secret)`, and the engine itself redacts the fields its kinds declare secret.

| Source | Read as |
|---|---|
| `env: NAME` | The variable's value. Unset or empty fails: `spec.token: valueFrom.env: SLACK_BOT_TOKEN is not set`. |
| `file: path` | The file's content with trailing newlines trimmed. `~/` is expanded; a relative path is relative to the current directory. An empty file fails. |

`QualityGate` has no secret fields; `valueFrom` applies to kinds that do.

## Output

The text plan lists each object with a mark, then its field changes:

```text
Plan for 11111111-1111-4111-8111-111111111111 (manager gitops:acme/platform, prune off)

  ~ QualityGate/default  update (adopt: no manager owns it yet)
      severity: "low" -> "high"
      cooldownDays: (unset) -> 7

0 to create, 1 to update, 0 to delete, 0 unchanged
Plan hash: 9c1e04...
```

| Mark | Action |
|---|---|
| `+` | `create` |
| `~` | `update` |
| `-` | `delete` (only with `--prune`) |
| `=` | `noop` |

| Note | Meaning |
|---|---|
| `adopt: no manager owns it yet` | The object exists but nothing manages it. Applying records this manager as its owner. |
| `drift: changed since its manager last applied it` | Someone edited the object outside this manager since the last apply. |
| `managed by <manager>` | Another manager owns it. This comes with a `managed_by_other` blocking condition. |

Values are printed as JSON; `(unset)` is a field with no value. Blocking conditions and warnings follow, as `! [code] Kind/name: message` and `* [code] ...`.

`-o json` prints the engine's plan object, re-indented: `tenant`, `manager`, `prune`, `items[]` (`kind`, `name`, `action`, `changes[]` of `path`, `from`, `to`, and `manager`, `adopt`, `drift` when set), `blocking[]`, `warnings[]`, `summary` (`create`, `update`, `delete`, `noop`) and `planHash`. Errors go to standard error, so standard output stays valid JSON.

### Blocking conditions

| Code | When |
|---|---|
| `invalid` | A document fails its schema on the server, or the server does not apply its kind yet. |
| `duplicate` | Two documents declare the same kind and name. |
| `org_mismatch` | `metadata.org` is not this tenant. |
| `managed_by_other` | Another manager owns the object. |

The warning `metadata_not_stored` means `metadata.labels` and `metadata.annotations` are accepted but not stored yet.

## Exit codes

| Code | When |
|---|---|
| `0` | The plan can be applied (with or without changes). |
| `1` | A document is invalid locally; a file cannot be read; `metadata.org` names another tenant; the engine answered an error; the network failed. |
| `2` | Usage: no documents found, no manager could be detected, `-o` is not `text` or `json`, or no credential at all. |
| `3` | The plan has blocking conditions. The plan is still printed. |

Code 3 is `ExitPlanBlocked` in `cmd/exit_codes.go`. It shares the number with `vulnetix jail`'s indeterminate verdict: in both, the code under test is fine and the pipeline's configuration needs fixing.

## Examples

```sh
vulnetix config plan
vulnetix config plan -f .vulnetix/config/quality-gate.yaml -o json
vulnetix config plan --manager gitops:acme/platform-config --prune
VULNETIX_CONFIG_TOKEN=vmt_... vulnetix config plan --manager terraform
```

To apply a plan, see [`vulnetix config apply`](/platform-iac/cli/apply/).
