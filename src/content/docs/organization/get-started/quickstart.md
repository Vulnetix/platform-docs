---
title: Organization quickstart
nav: Quickstart
description: Set up a new Vulnetix organisation, invite a colleague, create a service account for CI, and give the pipeline VULNETIX_ORG_ID and VULNETIX_API_KEY.
order: 1.5
sources: [vdb-site/api/internal/handler/members.go, vdb-site/api/internal/handler/service_accounts.go, vdb-site/api/internal/handler/provision.go, website/src/pages/resolve/members.vue, cli/cmd/auth.go]
checked: [vdb-site@d2ea72f23, website@7f3b734cd, cli@v4.17.1]
updated: 04 Nov 2026
---

This page sets up an organisation for a team: one colleague invited, and a credential CI can use that belongs to the organisation rather than to a person.

## Prerequisites

- A console sign-in at `https://www.vulnetix.com/resolve` with your company address. The first person to sign up with a company domain becomes the owner of that domain's organisation. A free-mail address gets a personal organisation that nobody can join.
- The `owner` role for steps 2 and 3. Every plan includes members and service accounts.

## 1. Open the Members page

Go to **Account › Members** (`/resolve/members`). It lists the people, service accounts, pending invitations and access requests.

## 2. Invite a colleague

Choose **Invite person**. In **Invite someone**, enter the **Email address**, pick a **Role** (`member`, `developer` or `owner`), and choose **Send invitation**.

The invitation lasts 14 days. The colleague signs up or signs in with that address and joins with that role. Someone from your domain who signs up without an invitation waits as an access request until you approve them.

## 3. Create a service account for CI

Choose **New service account**. Enter a **Name**, for example `ci-scanner`, and under **What it may do** keep **Member** to scan, upload and read. Choose **Create**.

The account is named `<org>:ci-scanner`. The next dialog shows its **Org ID**, **Secret** and **API Key** once. Copy the Org ID and API Key now: the secret cannot be shown again, only rotated.

> [!WHY] Not a person's key
> A key created under a person's address keeps working after they leave, under a name that belongs to nobody. A service account belongs to the organisation.

## 4. Give the pipeline the credential

Save the two values as CI secrets and pass them to the CLI as environment variables. In GitHub Actions:

```yaml
- name: Vulnetix scan
  env:
    VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
    VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
  run: vulnetix scan
```

The variables take precedence over any stored login.

## 5. Check the credential

```bash
VULNETIX_ORG_ID=<org id> VULNETIX_API_KEY=<api key> vulnetix auth verify
```

```text
[OK] Authentication verified successfully
  Organization: <org id>
```

A wrong key fails with `verification failed`. A deactivated account is refused with `403`.

## Next

- [Members and roles](/organization/people/members-and-roles/) for roles, access requests and removing people.
- [Service accounts and API keys](/organization/people/service-accounts-and-api-keys/) for rotation and the `developer` role for Platform IaC.
- [Secrets vault](/organization/security/secrets-vault/) for provider keys and integration credentials.
- [Integrations](/organization/integrations/integrations/) to connect the GitHub App.
