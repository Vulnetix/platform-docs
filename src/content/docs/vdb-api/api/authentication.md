---
title: Authentication
description: The three Authorization header forms the VDB API accepts, how to derive an API key or a JWT from a SigV4-signed request, and the status codes each failure returns.
order: 1
sources: [vdb-api/internal/middleware/auth.go, vdb-api/internal/handler/auth.go, vdb-api/internal/sigv4/sigv4.go, vdb-api/main.go, cli/pkg/auth/auth.go, cli/pkg/vdb/client.go, vdb-site/api/internal/handler/account.go]
checked: [vdb-api@4145f0a, cli@4c8c3b71c, vdb-site@1a06d67]
updated: 02 Nov 2026
---

Every route under `/v1` and `/v2` needs an `Authorization` header, except the handful listed in the [overview](/vdb-api/#routes-without-a-credential). The API reads the header's scheme and accepts three forms.

| Form | Header | Expires | Best for |
|---|---|---|---|
| API key | `Authorization: ApiKey <orgId>:<hex>` | Never; rotates when the secret changes | Scripts, CI, the CLI |
| JWT | `Authorization: Bearer <jwt>` | 15 minutes | Clients that hold the secret and prefer short-lived tokens |
| API token | `Authorization: Bearer <token>` | As issued | Tokens issued to a user account; the API resolves the org itself |

All three resolve to an organisation (the "principal"). Rate limits, plan and data scoping all follow from it.

## API key

```
Authorization: ApiKey <orgId>:<hex>
```

`<hex>` is the lowercase hex HMAC-SHA256 of the org id, keyed with your secret:

```bash
ORG="your-org-uuid"
SECRET="your-secret"
HEX=$(printf '%s' "$ORG" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')
curl -s -H "Authorization: ApiKey ${ORG}:${HEX}" https://api.vdb.vulnetix.com/v2/sources
```

The API splits the value at the first `:`. Everything before it is the org id; everything after it must equal the HMAC exactly. It does not strip whitespace or a repeated org id.

> [!CAREFUL] `ApiKey <org>:<org>:<hex>` is a 401
> The Resolve Platform's Account page shows the API key as `<orgId>:<hex>`, ready to paste after `ApiKey `. Prefixing it with the org id again sends `ApiKey <org>:<org>:<hex>`, and the comparison fails with `401 {"error":"Invalid API key"}`. The CLI (v3.56.2 and later) removes a leading `<orgId>:` from `VULNETIX_API_KEY`, `--api-key`, the credentials file and netrc before it builds the header, so the CLI accepts either form. curl and your own clients do not.

An API key stops working when the secret is regenerated on the Account page, because the HMAC changes with it.

## SigV4 exchange

If you hold the secret rather than the key, sign a request with AWS Signature Version 4 and exchange it at one of two routes. Both are `GET` only; `POST /v2/auth/token` returns `400`.

| Route | Returns |
|---|---|
| `GET /v2/auth/token` | `{"token": "<jwt>", "iss": "urn:vulnetix:vdb", "sub": "urn:uuid:<orgId>", "exp": <epoch seconds>}` |
| `GET /v2/auth/api-key` | `{"success": true, "orgId": "<orgId>", "apiKey": "<hex>"}` |

The signature the API checks:

| Part | Value |
|---|---|
| Algorithm | `AWS4-HMAC-SHA512` or `AWS4-HMAC-SHA256`. For SHA512 the API tries SHA256 first, then SHA512 |
| Access key | Your org id |
| Credential scope | `<YYYYMMDD>/<region>/<service>/aws4_request`. The CLI signs with region `us-east-1` and service `vdb` |
| Signed headers | `x-amz-date` (send `X-Amz-Date: <YYYYMMDDTHHMMSSZ>`) |
| Canonical URI | The request path, for example `/v2/auth/token` |
| Payload hash | Hash of the empty body, with the algorithm's hash function |

Example header:

```
Authorization: AWS4-HMAC-SHA512 Credential=<orgId>/20261102/us-east-1/vdb/aws4_request, SignedHeaders=x-amz-date, Signature=<hex>
X-Amz-Date: 20261102T010203Z
```

The CLI does this for you when you configure SigV4 (`VVD_ORG` and `VVD_SECRET`, or `--org-id` with `--secret`): it fetches a JWT, caches it until `exp`, and fetches a new one when it expires.

## JWT

The JWT from `/v2/auth/token` carries `iss: urn:vulnetix:vdb`, `sub: urn:uuid:<orgId>`, `orgId`, `accessKey`, `iat` and `exp`. It lasts 15 minutes. Send it as `Authorization: Bearer <jwt>`.

When it expires the API answers `401` with `"error": "Token has expired. Please obtain a new token from /v1/auth/token."`. Fetch a new one; there is no refresh token.

## API token

A bearer value that is not a three-part JWT is treated as an API token issued to a user account (`VULNETIX_API_TOKEN` in the CLI). The API looks up the account and the organisation it belongs to. If the account belongs to more than one organisation, the API cannot tell whose data you mean and answers `409`.

## Failures

| Status | `error` | Cause |
|---|---|---|
| 401 | `Missing Authorization header. Please provide a Bearer token.` | No header |
| 401 | `Malformed ApiKey header. Expected: Authorization: ApiKey <orgId>:<sha256-hex>` | No `:`, or an empty half |
| 401 | `Invalid API key` | Unknown org id, or the HMAC does not match |
| 401 | `Invalid Authorization header format. Expected "Bearer <token>".` | A scheme other than `ApiKey` or `Bearer` |
| 401 | `Token has expired. ...`, `Invalid token signature`, `Invalid token claims`, `Invalid token subject` | JWT problems |
| 401 | `Invalid API token` | API token unknown or disabled |
| 401 | `Invalid signature`, `Invalid credentials` | SigV4 exchange failed |
| 403 | `Organization account is inactive` | The org, or its parent organisation, is deactivated |
| 409 | `This account is linked to multiple organizations. Contact support to resolve it.` | API token whose account has several orgs |
| 503 | `authentication backend temporarily unavailable` | A transient lookup failure. Carries `Retry-After: 2`. Retry; the key is not invalid |

Authenticated responses are sent with `Cache-Control: private, no-store` and `Vary: Authorization, Accept-Encoding`, so a shared cache never serves one caller's answer to another.

## Members of a Business organisation

Each member of a Business or Enterprise organisation has their own org id and API key. The API resolves a member to the organisation that owns them: the plan, and every per-organisation policy, come from the parent. Deactivating the parent organisation stops every member; deactivating one member stops only that member.
