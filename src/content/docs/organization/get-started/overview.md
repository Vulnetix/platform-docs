---
title: Organization
nav: Overview
description: Your Vulnetix organisation, the people and service accounts in it, the secrets vault, integrations, messaging and notifications, and which page handles each.
order: 1
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/members.go, vdb-site/api/internal/handler/entitlements.go, vdb-site/.repo/org-provisioning.md, website/src/shared/console-nav.ts]
checked: [vdb-site@1a06d67, website@b548e4c]
updated: 02 Nov 2026
---

An organisation is the tenant everything else belongs to: scan data, policies, vault entries, connections and members. It is created by the first person to sign up with a company domain, or as a personal organisation for a free-mail address.

## The parts

| Part | Resolve Platform page | Read |
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
| Resolve Platform session (Authentik sign-in) | `vdb_token` cookie or `Authorization: Bearer <JWT>` | everything |
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

The organization's own settings are kinds: [`Organization`](/platform-iac/kinds/organization/), [`Member`](/platform-iac/kinds/member/), [`ServiceAccount`](/platform-iac/kinds/service-account/) and [`NotificationDefaults`](/platform-iac/kinds/notification-defaults/) for the organization and its people; [`VaultEntry`](/platform-iac/kinds/vault-entry/) for its secrets; [`GitHubInstallation`](/platform-iac/kinds/git-hub-installation/), [`ForgeConnection`](/platform-iac/kinds/forge-connection/), [`MessagingConnection`](/platform-iac/kinds/messaging-connection/), [`MessagingRoute`](/platform-iac/kinds/messaging-route/), [`MessagingTemplate`](/platform-iac/kinds/messaging-template/) and [`WizConnection`](/platform-iac/kinds/wiz-connection/) for its integrations. The config engine applies them, and [Terraform and OpenTofu](/platform-iac/terraform/) manages them. Only an owner, or an owner service account, can apply [`Organization`](/platform-iac/kinds/organization/), [`Member`](/platform-iac/kinds/member/), [`ServiceAccount`](/platform-iac/kinds/service-account/) and [`VaultEntry`](/platform-iac/kinds/vault-entry/); a `developer` can apply the rest. A new `Member` reports `Pending` until the invitation is accepted, and a `ServiceAccount`'s key is shown once, in the apply that creates it; see [status phases](/platform-iac/reference/engine/#status-phases).

## Drift protection

Drift protection is the organisation setting that decides what the console does with settings that Terraform or a GitOps repository manages. Off, the default, the console marks them as managed and still lets you edit them, and the next apply may overwrite your change. On, the server refuses console and legacy API changes to them with HTTP 409 `managed_by_platform_iac`, and the console shows the page read only. Pages with nothing managed as code are never affected.

- **Where it is.** The Platform IaC indicator in the top-right of a console page, beside the **?** icon (alone where the page has no **?**), opens a menu with the switch. The same switch, with an explanation, is on **Account** › **Profile** (`/resolve/account`), in the card **Platform IaC drift protection**.
- **Who can switch it.** An organisation owner or admin, at any time. Other members see the state and the text `Only an organisation owner or admin can switch Drift protection.`
- **Everything else** (the three states, what read only means, the limits) is on [Drift protection](/platform-iac/guides/drift-protection/#in-the-console).
