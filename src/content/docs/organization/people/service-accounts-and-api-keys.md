---
title: Service accounts and API keys
nav: Service accounts and API keys
description: The two kinds of principal, how an API key is formed and sent, service accounts for CI, rotating and revoking keys, and Teams key seats.
order: 2
sources: [vdb-site/api/internal/handler/service_accounts.go, vdb-site/api/internal/handler/members.go, vdb-site/api/internal/handler/org_keys.go, vdb-site/api/internal/handler/org_members_admin.go, vdb-site/api/internal/handler/account.go, cli/cmd/auth.go]
checked: [vdb-site@1a06d67, cli@4c8c3b7]
updated: 02 Nov 2026
---

Every principal in an organisation has its own API key. There are two kinds of principal:

| `kind` | Is | Signs in | Named |
|---|---|---|---|
| `human` | A person with an email address | yes, as themselves | their email |
| `service_account` | A credential holder for CI. Has no email address, cannot sign in, cannot be sent a password reset. | no | `<org-slug>:<name>`, for example `acme.com:ci-scanner` |

> [!WHY] Why CI should not use a person's key
> A key created "for CI" under a person's address keeps working after that person leaves, under a name that now belongs to nobody. A service account is named after the organisation and survives staff changes because it was never anyone's.

## The API key

An API key is derived from the principal's uuid and its secret. Send it as:

```
Authorization: ApiKey <principalUuid>:<apiKey>
```

The `<principalUuid>` is the principal's own uuid, called the **org id** in the CLI and the console. A wrong key is `401`; a deactivated principal is `403`.

With the CLI:

```bash
export VULNETIX_ORG_ID=<principalUuid>
export VULNETIX_API_KEY=<apiKey>
vulnetix auth verify
```

The CLI reads the two variables directly; they take precedence over a stored login. To store the key instead, run `vulnetix auth login --noninteractive --org-id <principalUuid> --api-key <apiKey>` (`--store home`, `project` or `keyring`; default `home`). `--noninteractive` never opens a browser, and `--org-id` must be a uuid.

Your own key is on **Account › Profile**. `POST /v1/account/regenerate` issues a new secret and key and stops the old one.

## Service accounts

Owners create them on the Members page. The routes below take the console session only (the `vdb_token` cookie or `Authorization: Bearer <session JWT>`); an API key is `401 not authenticated`, so one credential cannot mint another.

| Rule | Value |
|---|---|
| `name` | 3 to 40 characters: lowercase letters, digits and hyphens, starting and ending with a letter or digit (`^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$`) |
| `role` | `member` (the default), `developer` or `owner`. Only an owner may ask for `developer` or `owner`. A service account cannot invite, approve or create other credentials, whatever its role. |
| Response | `{principalUuid, name, kind, role, secret, apiKey}`. **Shown once.** The secret is stored encrypted in the identity provider and cannot be read back. |

The Members page asks an owner which role the new account gets, and for a `developer` or `owner` account its one-time dialog shows the two variables to set.

| Role | The account can |
|---|---|
| `member` | Scan, upload and read: the CLI in CI, and the API. It cannot plan or apply Platform IaC. |
| `developer` | Also plan, apply and export [Platform IaC](/platform-iac/) for every kind except `Organization`, `Member`, `ServiceAccount` and `VaultEntry`. It cannot manage people, billing, service accounts or the vault. |
| `owner` | Everything an owner can, including those four kinds. Use sparingly. |

### Using one for Platform IaC

A `developer` service account is the credential for Terraform, `vulnetix config apply` and the GitHub Actions. It is the same pair of variables as for the CLI in CI:

```sh
export VULNETIX_ORG_ID=<principalUuid>
export VULNETIX_API_KEY=<apiKey>
vulnetix config plan
```

The provider reads the same two names. An Authentik access token (`VULNETIX_API_TOKEN`) works for the same account where your setup already issues tokens. See [credentials for automation](/platform-iac/reference/config-api/#credentials-for-automation).

| Method | Path | Does |
|---|---|---|
| POST | `/v1/org/service-accounts` | create |
| POST | `/v1/org/service-accounts/{principalUuid}/rotate` | new secret and key, shown once; the old key stops working |
| DELETE | `/v1/org/service-accounts/{principalUuid}` | deactivates it; its access log stays |

| Status | Error |
|---|---|
| 400 | `name must be 3-40 characters, lowercase letters, numbers and hyphens (for example: ci-scanner)` |
| 403 | `only owners and admins can create service accounts` (and rotate, delete) |
| 409 | `a service account with that name already exists` |
| 502 | `could not create the service account` |

Rotate refuses a human principal: a person's secret is theirs. To reset a person's key, an owner uses `POST /v1/org/members/{principalUuid}/apikey/rotate` (see [Members and roles](/organization/people/members-and-roles/#acting-on-another-members-account)).

Every create, rotate and delete emits `security.service_account.created`, `.rotated` or `.deleted`.

## Teams key seats

On the Teams plan, a key seat is an API key for a named person, provisioned from **Members**.

| Method | Path | Does |
|---|---|---|
| GET | `/v1/org/keys/allocation` | `{included, used, canProvisionFree, perKeyConfigured}` |
| POST | `/v1/org/keys` `{email}` | Within the bundled allowance: provisions the seat (`{status: "provisioned"}`), or invites the address if it belongs to another organisation (`{status: "invited"}`). Beyond it: starts a per-key add-on checkout (`{checkout_url}`). |

Below Teams, `POST /v1/org/keys` answers 200 with `planLocked: true`. A second key for the same address is `409`.

## Machine credentials elsewhere

Some products issue their own scoped tokens rather than API keys, for example the Belai host token and Guardian ingest tokens. Those are documented with each product.

## Related

- [Members and roles](/organization/people/members-and-roles/)
- [CLI authentication](/cli/)
