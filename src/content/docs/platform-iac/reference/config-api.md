---
title: Config engine API
nav: Config API
description: Every /v1/config route of the config engine, who may call it, how documents are sent, and the management tokens a machine uses instead of a person's session.
order: 1
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/config_engine.go, vdb-site/api/internal/handler/config_tokens.go, vdb-site/api/internal/handler/vex_source.go, vdb-site/api/internal/handler/config.go, cli/cmd/config_engine_client.go, cli/cmd/auth.go]
checked: [vdb-site@fe1ff17, cli@c0662b43d]
updated: 03 Nov 2026
---

The config engine is served by the Vulnetix site API, not the VDB API. The CLI calls it at `https://www.vulnetix.com/api/site/v1/config/...` (the host is `VULNETIX_WEB_URL` when that is set). The paths below are written from `/v1`.

## Who may call it

| Caller | What it can do |
|---|---|
| A signed-in member | List kinds, validate documents and read ownership |
| An owner or admin | Everything: plan, apply, export and the object routes, because they read or change the organisation's policy |
| A management token (`Authorization: Bearer vmt_<secret>`) | What its role allows, and only for the kinds it lists. A plan, apply, export or prune that touches another kind is refused. |

A token issued with the `member` role cannot plan, apply or export: those answer `403` with `this token's role is member; plan, apply and export need owner or admin`.

## Routes

| Method and path | Does |
|---|---|
| `GET /config/kinds` | The kinds the server applies, with their schemas |
| `POST /config/validate` | Validates documents against their schemas. Reads no organisation state. |
| `POST /config/plan` | A per-object create, update, delete or no-op, a `planHash`, and anything that blocks the apply. See [plan](/platform-iac/cli/plan/). |
| `POST /config/apply` | Applies a reviewed plan, named by its `planHash`, in one transaction. See [apply](/platform-iac/cli/apply/). |
| `GET /config/export?kind=&name=&manager=&format=` | The stored state as documents. `format` is `yaml`, `hcl` or `sh`. See [export](/platform-iac/cli/export/). |
| `POST /config/export?format=` | Renders documents you send (an unsaved console form) instead of the stored state |
| `GET /config/ownership?kind=&name=` | Which objects are managed as code, by which manager and from which source. Any member, and a token of any role, may read it. |
| `GET /config/objects/{kind}/{name}` | One object and its status |
| `PUT /config/objects/{kind}/{name}` | Plans and applies one document in one transaction (server-side apply, used by the Terraform provider). The body is `{"manager", "sourceRef", "document"}` (or `"yaml"`), or a YAML document with `manager` and `sourceRef` in the query. |
| `DELETE /config/objects/{kind}/{name}?manager=&force=&sourceRef=` | Deletes one object. Without `force`, only the object's own manager may delete it. |
| `POST /config/vex-sources/{name}/refresh` | Asks for a [VEX source](/platform-iac/guides/vex-sources/) to be fetched at the next tick. This is how a webhook-only source is told its documents changed. |
| `POST /config/vex-sources/{name}/snapshot` | Uploads the documents a path source names, each base64 with the hex SHA-256 of its bytes. They replace the source's last snapshot: rules for statements that are gone are removed, as a fetch would. |
| `GET /config/openapi.yaml` | This API as OpenAPI 3.1, with the kind schemas. Public: it holds no organisation data. |
| `POST /config/tokens` | Issues a management token. The secret is in the reply once. |
| `GET /config/tokens` | Lists tokens, never the secret or its hash |
| `POST /config/tokens/{uuid}/rotate` | A new secret for the same token. The old secret stops working at once. |
| `DELETE /config/tokens/{uuid}` | Revokes a token |

`GET /config` (with no further path) is not part of the engine: it is the site's public feature-flag document.

## Sending documents

Documents travel in one of two forms:

- A YAML stream with `Content-Type: application/yaml` or `text/yaml`. `manager`, `prune`, `sourceRef` and `planHash` then go in the query string.
- JSON: `{"documents": [...]}` or `{"yaml": "..."}`, with those fields alongside.

A request body is limited to 4 MiB.

## Management tokens

A Terraform provider, a CI job or a GitOps controller should not hold a person's session, and a service account's API key acts as a member, which cannot change policy. A management token is the machine credential for this API instead.

| Field (`POST /config/tokens`) | Meaning |
|---|---|
| `name` | The token's name |
| `principalUuid` | The service account the token acts as |
| `role` | The role it has on `/v1/config/*` and on policy writes. Nobody can issue a token above their own role. |
| `kinds` | The kinds it may plan, apply and export |
| `expiresInDays` | 1 to 365; 90 when left out |

Rules that follow from how tokens are stored and checked:

- Only `sha256` of the secret is stored, so a database read cannot recreate a token.
- Issuing, rotating and revoking need an owner or admin signed in with a session. A token cannot manage tokens.
- Outside `/v1/config/*` and the policy writes, a token is its service account: a member.
- Deactivating the service account stops its tokens working.
- A revoked token's row is kept, with `revokedAt` set, so the list still shows it.
