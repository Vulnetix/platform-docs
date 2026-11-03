---
title: Members and roles
description: How people join an organisation, the owner and member roles, access requests, what an owner can do to another member's account, and the API behind the Members page.
order: 1
sources: [vdb-site/api/internal/handler/org_roles.go, vdb-site/api/internal/handler/members.go, vdb-site/api/internal/handler/org_members_admin.go, vdb-site/api/internal/handler/provision.go, vdb-site/.repo/org-provisioning.md, website/.repo/org-members-and-roles.md, vdb-site/api/main.go]
checked: [vdb-site@1a06d67, website@ad775f3]
updated: 02 Nov 2026
---

People sign in to Vulnetix through its identity provider (Authentik). Each person is a **principal** in exactly one organisation, with a role there. Manage them on **Account › Members** (`/resolve/members`).

## What your organisation is

Your organisation is decided by the address you first signed up with:

| Address | Organisation |
|---|---|
| A company domain (`dev@acme.com`) | The organisation for that domain (`acme.com`). The first person becomes its owner. Colleagues can be invited in. |
| A free or consumer mail provider (Gmail, Outlook and similar) | A personal organisation of one, named `u-<8 hex>`. Nobody can join it by domain. |
| A disposable address, a public suffix (`co.uk`, `github.io`) or a reserved prefix (`plan-`, `pix-`, `vulnetix-`, `org-`) | Refused |

## Roles

| Role | Can |
|---|---|
| `owner` | Everything below, plus invite, approve, change roles, remove members, manage service accounts and API keys, write the vault, messaging and GitHub App settings. Only an owner can make another owner. |
| `member` | Use the console and the API. Read the vault, messaging and members lists. Triage, suppress and edit prioritisation and campaigns (see the warning on [Vulnerability management](/vulnerability-management/)). |
| `admin` | Retired. An organisation created before the retirement may still have admins; they keep owner-like management rights but can only hand out `member`, until an owner changes their role. Nobody can be given `admin`. |

- An organisation always keeps an owner. The last owner cannot step down: `409 you are the only owner; promote someone else before stepping down`.
- You cannot remove yourself: `400`.
- An owner or admin can switch [Drift protection](/platform-iac/guides/drift-protection/), the setting that makes the console read only for settings managed as code. A member sees its state but cannot change it.
- The roles a caller may hand out come back as `assignableRoles` from `GET /v1/org/members`. The console renders exactly that list.

## Joining an organisation

An invitation is the only way into an existing organisation.

1. An owner invites an address with a role (`POST /v1/org/invitations {email, role}`). The invitation lasts **14 days**.
2. The person signs up or signs in with that address and joins with that role.

Someone who signs up with your domain **without** an invitation does not get in. They are parked as an **access request**, with no account and no API key, and see "access requested". An owner approves (`POST /v1/org/pending/{userPk}/approve`, optional `{role}`) or denies them. Approval is what creates their account.

## Removing someone

`DELETE /v1/org/members/{principalUuid}` **deactivates** the principal. Their access log stays attributed to them, and an inactive principal cannot authenticate: the API answers `403` to their key. Their API key stops working at once.

## Acting on another member's account

Owners can:

| Action | Route | Notes |
|---|---|---|
| Set their password | `POST /v1/org/members/{principalUuid}/password` | at least 12 characters |
| List their MFA devices | `GET /v1/org/members/{principalUuid}/mfa` | |
| Remove one MFA device | `DELETE /v1/org/members/{principalUuid}/mfa/{model}/{pk}` | |
| View their API key | `GET /v1/org/members/{principalUuid}/apikey` | The derived key and a masked secret |
| Rotate their API key | `POST /v1/org/members/{principalUuid}/apikey/rotate` | The old key stops working. The new secret is shown once. |

Each of these emits a sensitive messaging event (`security.password.reset_by_admin`, `security.mfa.reset_by_admin`, `security.member.api_key_viewed`, `security.member.api_key_rotated`), so you can route them to a channel. See [Messaging](/organization/integrations/messaging/#events).

## Your own account

**Account › Profile** (`/resolve/account`) shows your API key, MFA devices and active sessions.

| Method | Path | Does |
|---|---|---|
| GET, DELETE | `/v1/account/mfa`, `/v1/account/mfa/{model}/{pk}` | your MFA devices |
| GET, DELETE | `/v1/account/sessions` | your sessions; DELETE signs out all of them |
| POST | `/v1/account/regenerate` | a new secret and API key. The old key stops working. |

## Authentication

Every route on this page takes the console session only: the `vdb_token` cookie, or `Authorization: Bearer <session JWT>`. An `ApiKey` header is `401 not authenticated`. Membership cannot be changed with an API key or a service account.

## Errors

| Status | Error |
|---|---|
| 400 | `the admin role cannot be assigned; use owner or member`, `unknown role; use owner or member`, `please enter a valid email address`, `you cannot remove yourself` |
| 403 | `only owners and admins can invite` (and `... change roles`, `... remove members`, `... approve access`), `only an owner can grant the owner role`, `you cannot assign roles` |
| 409 | `you are the only owner; promote someone else before stepping down` |
| 502 | the identity provider could not be reached |

## API

| Method | Path |
|---|---|
| GET | `/v1/org/members` returns `{org, role, assignableRoles, members, pending, invitations}`. Each member is `{principalUuid, name, kind, role, isActive, isSelf, createdAt}`, where `kind` is `human` or `service_account`. |
| POST | `/v1/org/members/{principalUuid}/role` `{role}` |
| DELETE | `/v1/org/members/{principalUuid}` |
| POST | `/v1/org/invitations` `{email, role}` |
| DELETE | `/v1/org/invitations/{pk}` |
| POST | `/v1/org/pending/{userPk}/approve`, `/v1/org/pending/{userPk}/deny` |

## Related

- [Service accounts and API keys](/organization/people/service-accounts-and-api-keys/)
