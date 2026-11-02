---
title: Organization
nav: Overview
description: Your Vulnetix organisation, the people and service accounts in it, the secrets vault, integrations, messaging and notifications, and which page handles each.
order: 1
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/members.go, vdb-site/api/internal/handler/entitlements.go, vdb-site/.repo/org-provisioning.md, website/src/shared/console-nav.ts]
checked: [vdb-site@1a06d67, website@ad775f3]
updated: 02 Nov 2026
---

An organisation is the tenant everything else belongs to: scan data, policies, vault entries, connections and members. It is created by the first person to sign up with a company domain, or as a personal organisation for a free-mail address.

## The parts

| Part | Console page | Read |
|---|---|---|
| Members, roles, invitations and access requests | Account › Members (`/resolve/members`) | [Members and roles](/organization/people/members-and-roles/) |
| API keys, service accounts for CI, Teams key seats | Account › Members, Account › Profile | [Service accounts and API keys](/organization/people/service-accounts-and-api-keys/) |
| Secrets vault: AI provider keys, sandbox variables, integration credentials | Configuration › Secrets Vault (`/resolve/vault`) | [Secrets vault](/organization/security/secrets-vault/) |
| GitHub App, other forges, chat providers, cloud and registry connections | Configuration › Integrations (`/resolve/integrations`) | [Integrations](/organization/integrations/integrations/) |
| What is sent where: connections, routes, templates, delivery | Configuration › Messaging (`/resolve/messaging`) | [Messaging](/organization/integrations/messaging/), [Signed webhooks](/organization/integrations/signed-webhooks/) |
| Browser and phone push, preferences, quiet hours | Settings › Notifications | [Notifications](/organization/integrations/notifications/) |
| Proxies, TLS interception, allowlists | | [Corporate proxy](/organization/network/corporate-proxy/) |

## Two kinds of credential

| Credential | Header | Works on |
|---|---|---|
| Console session (Authentik sign-in) | `vdb_token` cookie or `Authorization: Bearer <JWT>` | everything |
| API key of a person or service account | `Authorization: ApiKey <principalUuid>:<apiKey>` | scan data, findings, policies, campaigns, the CLI. **Not** members, service accounts, key seats, the vault, integrations, messaging or notification settings. |

> [!WHY] Why an API key cannot manage the organisation
> If a CI key could add members, mint service accounts or read the vault's grants, a leaked key would be a takeover. Those routes need a person signed in.

## Plans

| Feature | Plan |
|---|---|
| Members, roles, invitations, service accounts, the vault | every plan |
| Teams API key seats | Teams and above |
| Chat and issue delivery, messaging routes | Pro and above |
| Cloud and SaaS integrations, registry logins | Pro and above |

A gated route answers `200` with `planLocked: true` rather than `403`.

## Audit

Sensitive changes (invitations, role changes, removals, password and MFA resets, API key views and rotations, service accounts, vault changes) emit `security.*` and `vault.*` events. They are recorded even with no route, kept 180 days, and visible to owners in Messaging › Activity. Route them to a channel to be told as they happen; see [Messaging](/organization/integrations/messaging/#events).

## Platform IaC

Organisation settings have no config-as-code today: members, service accounts, vault entries, connections, routes and templates are managed in the console. `vulnetix config validate`, `kinds` and `schema` validate only the kinds that exist now, and the published schemas in `Vulnetix/config-schemas` cover `QualityGate` alone. Config-as-code for organisation settings is planned and is described on [/platform-iac/](/platform-iac/).
