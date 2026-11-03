---
title: "vulnetix config apply"
nav: Apply
description: Plan config documents, confirm, and apply exactly that plan in one transaction. Flags, confirmation rules, the plan hash, the 409 when state moved, and exit codes.
order: 3
sources: [cli/cmd/config_engine.go, cli/cmd/config_engine_client.go, cli/cmd/config_engine_test.go, vdb-site/api/internal/handler/config_engine.go, vdb-site/api/internal/config/engine.go]
checked: [cli@d01f1dbe3, vdb-site@b424ae4]
updated: 02 Nov 2026
---

`vulnetix config apply` makes a plan as [`vulnetix config plan`](/platform-iac/cli/plan/) does, prints it, asks for confirmation, and then applies exactly that plan. Added in CLI v3.155.0. From CLI v4.0.0, with no `-f`, it also reads the well-known files; see [Migrating from v3 to v4](/cli/get-started/migrating-to-v4/).

```sh
vulnetix config apply [-f <file|dir|->]... [--manager <manager>] [--prune] [--auto-approve] [--plan-hash <hash>]
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `-f`, `--file` | string, repeatable | `.vulnetix/config` | As for `plan`. |
| `--manager` | string | `gitops:<owner/repo>` | As for `plan`. See [The manager](/platform-iac/cli/plan/#the-manager). |
| `--prune` | bool | `false` | Also delete objects this manager owns that the documents no longer declare. |
| `--auto-approve` | bool | `false` | Apply without asking. |
| `--plan-hash` | string | | Apply only if the fresh plan has this `planHash`. Counts as approval. |

Reading, validation, `valueFrom` secrets and the `metadata.org` check are the same as for `plan`. There is no `-o`: the output is always text.

## Sequence

1. Plan, and print the plan.
2. If the plan has blocking conditions, stop with exit 3. Nothing is applied.
3. If `--plan-hash` is set and differs from the fresh plan's hash, stop with exit 1: `the plan changed since the one you reviewed (<yours>, now <fresh>); plan again and review`.
4. If there is nothing to apply, print `Nothing to apply.` and exit 0. There is something to apply when an object is created, updated or deleted, or an unchanged object is adopted or has drifted (apply then records this manager as its owner).
5. Confirm, unless `--auto-approve` or `--plan-hash` is set. See [Confirmation](#confirmation).
6. Send `POST /api/site/v1/config/apply` with the same documents and the plan's `planHash`.
7. Print each object's result (`Applied`, `Deleted` or `Unchanged`) and the summary.

The engine re-plans inside the apply transaction, under a per-tenant lock, and applies only when the hash still matches. All Postgres-backed kinds apply in one transaction, in dependency order; either everything in the plan is written or nothing is.

## Confirmation

On a terminal, apply asks:

```text
Apply this plan? Only 'yes' is accepted:
```

Anything other than `yes` exits 1 with `apply cancelled`.

Without a terminal on standard input, or when documents come from `-f -` (standard input is then the documents), apply cannot ask. It exits 2 unless `--auto-approve` or `--plan-hash` is set.

To apply in CI exactly what a reviewer saw, take the hash from the reviewed plan and pass it:

```sh
hash=$(vulnetix config plan -o json | jq -r .planHash)
# review
vulnetix config apply --plan-hash "$hash"
```

## When the state moved (409)

If anything the plan covers changed between the plan and the apply (another apply, a console edit, edited documents), the engine answers HTTP 409 and writes nothing. The CLI prints:

```text
Error: the configuration changed after this plan was made (someone applied or edited it), so nothing was applied; run 'vulnetix config plan' again and review (the fresh plan: 0 to create, 2 to update, 0 to delete, 0 unchanged)
```

Plan again, review, and apply. The exit code is 1.

## Exit codes

| Code | When |
|---|---|
| `0` | Applied, or nothing to apply. |
| `1` | As for `plan`, and also: a `--plan-hash` mismatch, a 409, `apply cancelled`, and a partial apply: the engine answered 207, or an object ended in phase `Failed`. The failure reasons are listed and the rest of the plan stays applied. |
| `2` | As for `plan`, and also: no terminal to confirm on without `--auto-approve` or `--plan-hash`. |
| `3` | The plan has blocking conditions (from the plan, or the engine's HTTP 422 at apply). Nothing was applied. |

## Examples

```sh
vulnetix config apply
vulnetix config apply --auto-approve
vulnetix config apply --prune --auto-approve
vulnetix config apply --plan-hash 9c1e04...
```

In GitHub Actions use the action's [`config-apply` task](/cli/ci-cd/github-actions/#config-plan-and-config-apply).
