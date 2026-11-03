---
title: Config engine API
nav: Config API
description: Every /v1/config route of the config engine, who may call it, how documents are sent, and the credentials a machine uses instead of a person's session.
order: 1
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/config_engine.go, vdb-site/api/internal/orgroles/orgroles.go, vdb-site/api/internal/handler/authentik_jwt.go, vdb-site/api/internal/handler/service_accounts.go, vdb-site/api/internal/handler/vex_source.go, vdb-site/api/internal/handler/config.go, cli/cmd/config_engine_client.go, cli/cmd/site_client.go, cli/pkg/auth/credentials.go]
checked: [vdb-site@3c8c323, cli@5e0116312]
updated: 04 Nov 2026
---

The config engine is served by the Vulnetix site API, not the VDB API. The CLI calls it at `https://www.vulnetix.com/api/site/v1/config/...` (the host is `VULNETIX_WEB_URL` when that is set). The paths below are written from `/v1`.

## Who may call it

| Caller | What it can do |
|---|---|
| A signed-in member | List kinds, validate documents and read ownership |
| An owner | Everything: plan, apply, export and the object routes, because they read or change the organisation's policy |
| A service account with the `developer` role | Plan, apply, export and the object routes for every kind except the four that only an owner may apply: `Organization`, `Member`, `ServiceAccount` and `VaultEntry` |
| A member, or a service account with the `member` role | Read-only routes. A plan, apply or export is refused with `403`. |

How a caller proves who it is is on [credentials for automation](#credentials-for-automation). The role comes from the organisation's Authentik groups, not from the credential itself.

## Routes

| Method and path | Does |
|---|---|
| `GET /config/kinds` | The kinds the server applies, with their schemas |
| `POST /config/validate` | Validates documents against their schemas. Reads no organisation state. |
| `POST /config/plan` | A per-object create, update, delete or no-op, a `planHash`, and anything that blocks the apply. See [plan](/platform-iac/cli/plan/). |
| `POST /config/apply` | Applies a reviewed plan, named by its `planHash`, in one transaction. See [apply](/platform-iac/cli/apply/). |
| `GET /config/export?kind=&name=&manager=&format=` | The stored state as documents. `format` is `yaml`, `hcl` or `sh`. See [export](/platform-iac/cli/export/). |
| `POST /config/export?format=` | Renders documents you send (an unsaved console form) instead of the stored state |
| `GET /config/ownership?kind=&name=` | Which objects are managed as code, by which manager and from which source. Any member may read it. |
| `GET /config/objects/{kind}/{name}` | One object and its status |
| `PUT /config/objects/{kind}/{name}` | Plans and applies one document in one transaction (server-side apply, used by the Terraform provider). The body is `{"manager", "sourceRef", "document"}` (or `"yaml"`), or a YAML document with `manager` and `sourceRef` in the query. |
| `DELETE /config/objects/{kind}/{name}?manager=&force=&sourceRef=` | Deletes one object. Without `force`, only the object's own manager may delete it. |
| `POST /config/vex-sources/{name}/refresh` | Asks for a [VEX source](/platform-iac/guides/vex-sources/) to be fetched at the next tick. This is how a webhook-only source is told its documents changed. |
| `POST /config/vex-sources/{name}/snapshot` | Uploads the documents a path source names, each base64 with the hex SHA-256 of its bytes. They replace the source's last snapshot: rules for statements that are gone are removed, as a fetch would. |
| `GET /config/drift-protection` | The [Drift protection](/platform-iac/guides/drift-protection/) setting: `{enabled, available, managed[]}`. Any member session. |
| `PUT /config/drift-protection` | Turns it on or off with `{"enabled": bool}`. An owner only, because it is the `Organization` kind. Answers `409 drift_protection_unavailable` to `true` before the server's migration. |
| `GET /config/openapi.yaml` | This API as OpenAPI 3.1, with the kind schemas. Public: it holds no organisation data. |

`GET /config` (with no further path) is not part of the engine: it is the site's public feature-flag document.

## Drift protection

`GET` and `PUT /config/drift-protection` read and change the organisation's [Drift protection](/platform-iac/guides/drift-protection/) setting. It is also `spec.driftProtection` of the `Organization` kind. With it on, the console and the legacy APIs answer `409 managed_by_platform_iac` to a write to a kind that has a `terraform` or `gitops` object; every `/config/*` route still passes. The setting is never refused by itself.

## Sending documents

Documents travel in one of two forms:

- A YAML stream with `Content-Type: application/yaml` or `text/yaml`. `manager`, `prune`, `sourceRef` and `planHash` then go in the query string.
- JSON: `{"documents": [...]}` or `{"yaml": "..."}`, with those fields alongside.

A request body is limited to 4 MiB.

## Credentials for automation

A Terraform provider, a CI job or a GitOps controller should not hold a person's session. The config engine takes the credentials Vulnetix already issues; there is no separate machine token.

| Credential | Sent as | Use it for |
|---|---|---|
| A **service account's ApiKey**, with the `developer` or `owner` role | `Authorization: ApiKey <orgId>:<key>` | The recommended credential for CI and Terraform. It belongs to the organisation, so it keeps working when a person leaves. |
| An **Authentik access token** (OAuth2 client credentials) for such a service account | `Authorization: Bearer <jwt>` | Where your identity setup already issues short-lived tokens. |
| A **person's** ApiKey or `vulnetix auth login` session | `ApiKey` or `Bearer`, as above | Working from your own machine. The person must be an owner. |

The environment variables are `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` for the ApiKey, and `VULNETIX_API_TOKEN` for a bearer token. The [CLI](/platform-iac/cli/plan/) and the [Terraform provider](/platform-iac/terraform/) read the same names.

Rules that follow:

- The role decides what a credential may do. `developer` is an ordinary organisation role, for people and for service accounts, beside `owner` and `member`. A service account's role is set when it is created: `member` (the default), `developer` or `owner`. Only an owner grants `developer` or `owner`, to a person or to a service account, and nobody can grant a role above their own.
- A person with the `developer` role signs in as themselves (`vulnetix auth login`) and can plan, apply and export like a `developer` service account. They cannot invite or remove people, change roles, create service accounts, or manage billing or the vault.
- A service account with the `member` role can read but not plan, apply or export. It is refused with `403`.
- A `developer` service account cannot apply `Organization`, `Member`, `ServiceAccount` or `VaultEntry`, so a leaked CI credential cannot add a person, mint another service account, read a secret or turn Drift protection off.
- An Authentik token comes from the `platform-iac` application at `https://auth.vulnetix.com/application/o/platform-iac/` (client id `vulnetix-platform-iac`, `client_credentials` grant, one hour). Authentik only issues one to a service account that is stamped as a Vulnetix principal and holds the `developer` or `owner` role; a `member` is refused at the token endpoint. The server then requires the user to be active and in the organisation's group. The token's claims never name the organisation; the server looks the user up.
- Deactivating the service account stops its ApiKey and its tokens working.
- The five SIEM kinds (`SavedSearch`, `DetectionRule`, `AlertTrigger`, `ScheduledReport` and `LogSource`) are written in Guardian. The server vouches for the caller to Guardian with a short-lived signed assertion, so the same credentials work for them.
