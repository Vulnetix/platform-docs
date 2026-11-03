---
title: The config engine
nav: Engine
description: How the server-side engine plans and applies config documents for every kind, how it records who manages an object, what status an object reports, which kinds are written outside the database transaction, and how Guardian kinds are authorized.
order: 2
sources: ["vdb-site/docs/platform-iac-engine.md", "vdb-site/api/internal/config/engine.go", "vdb-site/api/internal/config/kind.go", "vdb-site/api/internal/config/sideeffects.go", "vdb-site/api/internal/config/external.go", "vdb-site/api/internal/config/guardian.go", "vdb-site/api/internal/handler/config_engine_kinds.go", "vdb-site/api/internal/orgroles/orgroles.go", "vdb-site/api/internal/config/guardian_assertion.go", "vdb-site/api/internal/handler/factory_engine_node_config_apply.go"]
checked: ["vdb-site@3c8c323"]
updated: 04 Nov 2026
---

One server-side engine owns every kind. The CLI, the Terraform provider and the console's Download as code all call it, so they accept the same documents and give the same results. The routes are on [Config engine API](/platform-iac/reference/config-api/); the kinds are on the [catalogue](/platform-iac/kinds/catalogue/); the schemas the engine validates against come from `config-schemas` and each carries an `x-vulnetix` annotation (singleton, validate only, `dependsOn`, `secrets`, `celFields`) that the engine, the CLI, the provider and these docs all read.

## Plan and apply

- **Plan** reads the current state and compares it with the documents. Per object it reports create, update, delete or no change, with a field diff, a `planHash`, warnings and any blocking conditions. It changes nothing.
- **Apply** takes the same documents and the `planHash`. It re-plans inside the transaction, under a per-tenant lock, and writes only if the hash still matches; otherwise it answers 409 and writes nothing.
- **Order.** Kinds are applied in dependency order, from each kind's `dependsOn`, and deleted in the reverse order. A reference between objects is by `metadata.name`, so both can be in one apply.
- **Transaction.** Every Postgres-backed kind applies in one transaction: all of it or none of it. Some kinds also write somewhere a transaction cannot cover; see [Outside the transaction](#outside-the-transaction).
- **Validation** is the console's own. A document is refused for the same reasons the console form refuses it, because the engine calls the console's validators rather than copying them.

## Who manages an object

Each object records its manager: `terraform`, `console` or `gitops:<repo>`, and the commit it came from. A manager can delete only objects it manages, and only when asked (`--prune`). A plan shows a change made outside the manager, such as an edit in the console, as drift. Kinds whose objects have no name column of their own (the Guardian kinds, `MalwareIoc`, `VexSource`, `Campaign` and others) keep `metadata.name` on the ownership record. An object nobody declared is exported under a name derived from its fields, so applying that document adopts it.

## Drift protection

An organisation can make the console and the legacy APIs refuse changes to a kind that has a `terraform` or `gitops:<repo>` object, with the `driftProtection` setting of the [`Organization`](/platform-iac/kinds/organization/) kind. Platform IaC writes (everything under `/v1/config/*`) always pass, and so do reads and exports. A guarded write answers `409 managed_by_platform_iac`, and the guard answers `503` if it cannot read the setting. It is middleware in front of the console routes, not a check in the writers the engine shares, so the engine's own apply is never blocked. See [Drift protection](/platform-iac/guides/drift-protection/).

## Secrets

A field named in a schema's `x-vulnetix.secrets` takes `valueFrom`. The client resolves it (`env` or `file`) on its own machine and sends the value once. The engine never exports it, never shows it in a plan, and compares it only to say whether it differs. An export writes a `valueFrom.env` placeholder.

## Status phases

Every applied object has a result: `Applied`, `Unchanged` or `Deleted`. A kind can add a status, and a `phase` field says where the object stands:

| Phase | Meaning | Kinds |
|---|---|---|
| `Pending` | Applied, and waiting on a person. | [`Member`](/platform-iac/kinds/member/): the invitation is sent and has not been accepted. The status carries `invitationExpires`. |
| `AwaitingAuthorization` | Applied, and waiting on a person to authorize it in a browser. The status carries `authorizationUrl`. | [`MessagingConnection`](/platform-iac/kinds/messaging-connection/) for Slack; [`AwsConnection`](/platform-iac/kinds/aws-connection/) with `sso`, which also carries `userCode` and then reports `Authorized` or `AuthorizationRequired`. |
| `Failed` | The object's write in the second phase failed. The status carries a `message`, and nothing is recorded for the object. | The [Guardian kinds](#siem-kinds-written-in-guardian) and [`VaultEntry`](/platform-iac/kinds/vault-entry/). |

Some values are shown once, in the result of the apply that creates the object, and never by plan, export or a later apply: a [`ServiceAccount`](/platform-iac/kinds/service-account/)'s `apiKey` and `secret`, a [`LogSource`](/platform-iac/kinds/log-source/)'s `ingestToken`, and a webhook [`MessagingConnection`](/platform-iac/kinds/messaging-connection/)'s signing secret. Plan never shows them, because they exist only after the write.

A kind can also report read-only facts after the write, such as a [`VexSource`](/platform-iac/kinds/vex-source/)'s latest fetch, a [`GitHubInstallation`](/platform-iac/kinds/github-installation/)'s account, or a [`FactorySettings`](/platform-iac/kinds/factory-settings/) `revision`. Each kind's page says what it reports.

## Outside the transaction

An apply that writes outside Postgres inside the transaction registers an undo with `OnRollback`. The undos run newest first when the transaction does not commit. Calls to AWS, KMS and the secrets vault cannot be rolled back, so a rolled-back apply can leave an unused OIDC client or a vault version nothing references.

Two groups of kinds are written in a **second phase**, after the Postgres transaction commits, because the store cannot join it:

1. The Postgres transaction applies every other kind, records no-ops and label-only updates for these kinds, and commits.
2. Each create, update and delete of these kinds then runs on its own, in dependency order, in a transaction of its own that holds the tenant's config lock and writes the ownership row and the audit entry. When the external store took the write but recording it fails, the write is undone: a create is deleted, an update is written back.
3. Each object has its own result. One that fails has `status.phase: Failed` and a `message`, and nothing is recorded for it. The others, and the Postgres phase, stay applied. `POST /config/apply` answers 207, with `failed` counting them. Plan again to see what is left.
4. A single-object `PUT` or `DELETE`, which is what the Terraform provider sends, answers 502 `external_failed` when the store refuses, and records nothing.

The two groups are the five [SIEM kinds](#siem-kinds-written-in-guardian) and [`VaultEntry`](/platform-iac/kinds/vault-entry/), whose records live in the tenant's KMS-encrypted vault file in S3.

## SIEM kinds, written in Guardian

[`SavedSearch`](/platform-iac/kinds/saved-search/), [`DetectionRule`](/platform-iac/kinds/detection-rule/), [`AlertTrigger`](/platform-iac/kinds/alert-trigger/), [`ScheduledReport`](/platform-iac/kinds/scheduled-report/) and [`LogSource`](/platform-iac/kinds/log-source/) live in Guardian's own store, behind its console API. The engine writes them through that API as a second phase.

- **Credential and tenant.** The engine never sends a tenant. Whatever the caller used (an ApiKey, a login or an Authentik access token, which vdb-site has already verified), vdb-site vouches for the caller with a signed assertion in `X-Vulnetix-Assertion`: an ES256 JWT, valid for under a minute, that names the tenant, the principal, a role and the SIEM kinds the caller may change. Guardian verifies the signature against vdb-site's public key and requires the tenant Postgres resolves for the principal to be the same one. A request can only reach the tenant the caller belongs to, with the role it has. A shared service secret with a tenant header was ruled out: whoever held it could name any tenant.
- **Before planning,** the engine asks Guardian who the caller is, and blocks the plan when Guardian resolves it to another tenant, when the tenant has no Guardian pack, or when Guardian refuses the credential.
- **Roles.** A service account with the `developer` role is treated as an admin by Guardian: it can write configuration. A member reads only.
- **Names and references.** Guardian objects have ids, not names. `searchRef` and `ruleRef` are names in documents and Guardian ids on the wire. A reference to an object declared in the same apply works, because objects are written in dependency order. A messaging connection is referenced by the name a [`MessagingConnection`](/platform-iac/kinds/messaging-connection/) was declared under; one nobody declared is addressed by its id, and Guardian checks it belongs to the tenant.

## Roles

Every Org kind blocks a change by a caller who is not an owner or admin. Role rules are shared with the members page: only an owner grants owner, `admin` is never granted, and a plan whose result has no owner is refused (`no_owner`). The person applying cannot remove themselves; that check runs at apply time, because plan has no principal.

The `developer` role exists for service accounts that apply Platform IaC. It can plan, apply, prune and export every kind except [`Organization`](/platform-iac/kinds/organization/), [`Member`](/platform-iac/kinds/member/), [`ServiceAccount`](/platform-iac/kinds/service-account/) and [`VaultEntry`](/platform-iac/kinds/vault-entry/). Those four decide who can act for the tenant, so a leaked CI credential can never add a member, mint a service account, read a secret into a place it controls, or turn Drift protection off. Only an owner creates a `developer` or `owner` service account, and people are never given `developer`. The credentials are on [Config engine API](/platform-iac/reference/config-api/#credentials-for-automation).

Guardian's search, alerts, usage and billing routes are for people signed in to the console. Its configuration routes (searches, rules, triggers, sends and sources) accept the assertion described above; a member reads only.

## GitOps from a repository

A Software Factory workflow node, `config-apply`, lets a config repository manage the tenant. Trigger it on a `push` webhook to the repository's default branch. See [`FactoryWorkflow`](/platform-iac/kinds/factory-workflow/#gitops-from-a-repository) for what it does, and the [config-plan and config-apply GitHub Actions](/platform-iac/github-actions/config-plan/) for the same flow in CI.

## Software Factory settings

[`FactorySettings`](/platform-iac/kinds/factory-settings/), [`ScannerProfile`](/platform-iac/kinds/scanner-profile/), [`FactoryManagedOrg`](/platform-iac/kinds/factory-managed-org/) and [`NotificationDefaults`](/platform-iac/kinds/notification-defaults/) each own a disjoint set of keys in the one settings document, so applying one never writes a key another owns. The console's Export as YAML on the factory settings page renders these documents with the engine.
