---
title: HTTP API
description: Every organisation, vault, integration, messaging and notification route, with the credential it takes and the page that explains it.
order: 1
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/members.go, vdb-site/api/internal/handler/account.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

Base URL: `https://www.vulnetix.com/api/site/v1/`. Paths below are written from `/v1`. **Session** means the console session only (`vdb_token` cookie or `Authorization: Bearer <JWT>`); an API key is `401`. **Any** means a session or `Authorization: ApiKey <principalUuid>:<apiKey>`. When an owner or admin has turned on [Drift protection](/platform-iac/guides/drift-protection/), a write to a setting that is managed as code answers `409 managed_by_platform_iac` on the routes that write it, whichever of these credentials is used.

## Members and keys

| Method | Path | Auth | Explained in |
|---|---|---|---|
| GET | `/v1/org/members` | session | [Members and roles](/organization/people/members-and-roles/#api) |
| POST | `/v1/org/members/{principalUuid}/role` | session | [Members and roles](/organization/people/members-and-roles/#roles) |
| DELETE | `/v1/org/members/{principalUuid}` | session | [Members and roles](/organization/people/members-and-roles/#removing-someone) |
| POST | `/v1/org/invitations` | session | [Members and roles](/organization/people/members-and-roles/#joining-an-organisation) |
| DELETE | `/v1/org/invitations/{pk}` | session | |
| POST | `/v1/org/pending/{userPk}/approve`, `/v1/org/pending/{userPk}/deny` | session | |
| POST | `/v1/org/members/{principalUuid}/password` | session | [Members and roles](/organization/people/members-and-roles/#acting-on-another-members-account) |
| GET | `/v1/org/members/{principalUuid}/mfa` | session | |
| DELETE | `/v1/org/members/{principalUuid}/mfa/{model}/{pk}` | session | |
| GET | `/v1/org/members/{principalUuid}/apikey` | session | |
| POST | `/v1/org/members/{principalUuid}/apikey/rotate` | session | |
| POST | `/v1/org/service-accounts` | session | [Service accounts](/organization/people/service-accounts-and-api-keys/#service-accounts) |
| POST | `/v1/org/service-accounts/{principalUuid}/rotate` | session | |
| DELETE | `/v1/org/service-accounts/{principalUuid}` | session | |
| GET | `/v1/org/keys/allocation` | session | [Teams key seats](/organization/people/service-accounts-and-api-keys/#teams-key-seats) |
| POST | `/v1/org/keys` | session | |
| GET, PUT | `/v1/config/drift-protection` | member session or a `vmt_` token to read; owner or admin session, or a `vmt_` token that lists `Organization`, to change | [Drift protection](/platform-iac/guides/drift-protection/) |
| GET, DELETE | `/v1/account/mfa`, `/v1/account/mfa/{model}/{pk}` | session | [Your own account](/organization/people/members-and-roles/#your-own-account) |
| GET, DELETE | `/v1/account/sessions` | session | |
| POST | `/v1/account/regenerate` | session | |

## Vault

| Method | Path | Auth | Explained in |
|---|---|---|---|
| GET | `/v1/vault` | session | [Secrets vault](/organization/security/secrets-vault/#api) |
| POST | `/v1/vault/entries` | session | |
| PATCH, DELETE | `/v1/vault/entries/{id}` | session | |
| POST | `/v1/vault/entries/{id}/verify`, `/v1/vault/entries/{id}/rotate` | session | |
| POST | `/v1/vault/test-key` | session | |

## Integrations

| Method | Path | Auth | Explained in |
|---|---|---|---|
| GET | `/v1/integrations` | session | [Integrations](/organization/integrations/integrations/) |
| GET | `/v1/integrations/tools` | any | per-tool scan activity |
| GET | `/v1/integrations/github/install/start` | session | [GitHub App](/organization/integrations/integrations/#github-app) |
| POST | `/v1/integrations/github/claim` | session | |
| DELETE | `/v1/integrations/github/{id}` | session | |
| POST | `/v1/integrations/github/{id}/refresh` | session | |
| GET | `/v1/integrations/github/repos/status` | session | [Repository scope](/vulnerability-management/scope/repositories/#the-github-app) |
| GET | `/v1/integrations/github/capabilities` | session | [Capabilities](/organization/integrations/integrations/#capabilities) |
| PUT | `/v1/integrations/github/capabilities/{id}` | session | |
| GET, POST | `/v1/integrations/forges` and its sub-routes | session | [Other forges](/organization/integrations/integrations/#other-forges) |
| GET | `/v1/integrations/slack/oauth/start` | session | [Chat, tickets and webhooks](/organization/integrations/integrations/#chat-tickets-and-webhooks) |
| PATCH, DELETE | `/v1/integrations/slack/{id}` | session | |
| POST | `/v1/integrations/discord`, `/v1/integrations/google-chat` | session | |
| DELETE | `/v1/integrations/discord/{id}`, `/v1/integrations/google-chat/{id}` | session | |
| GET, POST | `/v1/integrations/rules` | session | [Legacy notification rules](/organization/integrations/integrations/#legacy-notification-rules) |
| PATCH, DELETE | `/v1/integrations/rules/{id}` | session | |
| POST | `/v1/integrations/rules/{id}/test` | session | |

## Messaging (Pro and above, session)

| Method | Path | Explained in |
|---|---|---|
| GET | `/v1/messaging/catalogue` | [Messaging](/organization/integrations/messaging/#events) |
| GET, POST | `/v1/messaging/connections` | [Connections](/organization/integrations/messaging/#connections) |
| PATCH, DELETE | `/v1/messaging/connections/{id}` | |
| POST | `/v1/messaging/connections/{id}/test` | |
| POST | `/v1/messaging/connections/{id}/rotate-secret` | [Signed webhooks](/organization/integrations/signed-webhooks/#rotating-the-secret) |
| GET, POST | `/v1/messaging/routes` | [Routes](/organization/integrations/messaging/#routes) |
| PATCH, DELETE | `/v1/messaging/routes/{id}` | |
| POST | `/v1/messaging/routes/{id}/test`, `/v1/messaging/routes/{id}/dry-run` | |
| GET, POST | `/v1/messaging/templates` | [Templates](/organization/integrations/messaging/#templates) |
| POST | `/v1/messaging/templates/preview` | |
| GET, PATCH, DELETE | `/v1/messaging/templates/{id}` | |
| GET | `/v1/messaging/templates/{id}/versions/{v}` | |
| POST | `/v1/messaging/templates/{id}/restore/{v}` | |
| GET | `/v1/messaging/events`, `/v1/messaging/deliveries` | [Delivery](/organization/integrations/messaging/#delivery) |
| POST | `/v1/messaging/deliveries/{id}/retry` | |
| GET | `/v1/messaging/identities` | [People](/organization/integrations/messaging/#people) |
| POST | `/v1/messaging/identities/auto-link` | |
| PUT, DELETE | `/v1/messaging/identities/{principalUuid}/{provider}` | |

## Notifications (session)

| Method | Path | Explained in |
|---|---|---|
| POST, DELETE | `/v1/push/subscriptions` | [Notifications](/organization/integrations/notifications/) |
| GET | `/v1/push/vapid-public-key` | |
| POST | `/v1/push/test` | |
| GET | `/v1/notifications/catalogue` | |
| GET, PUT | `/v1/notifications/preferences` | |
| GET, PUT | `/v1/notifications/tenant-defaults` | |
| GET | `/v1/notifications/actions/describe` | |
| POST | `/v1/notifications/actions/execute` | |
