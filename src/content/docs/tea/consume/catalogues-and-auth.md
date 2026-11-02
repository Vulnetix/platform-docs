---
title: Catalogues and authentication
nav: Catalogues and auth
description: The first-party and open source TEA catalogues Vulnetix serves, what an anonymous caller sees, the accepted credential schemes, and why private objects answer 404.
order: 3
sources: [vdb-site/api/internal/handler/tea_routes.go, vdb-site/api/internal/handler/tea_v1_routes.go, vdb-site/api/internal/handler/tea_published_index.go, vdb-site/api/internal/handler/tea_repo_visibility.go, vdb-site/docs/tea/repo-visibility.md, cli/cmd/tea.go, cli/pkg/tea/client.go]
checked: [vdb-site@1a06d67, cli@4c8c3b71c]
updated: 02 Nov 2026
---

## Two catalogues

| | First party | Open source |
|---|---|---|
| Root (1.0.0) | `https://www.vulnetix.com/tea/v1.0.0` | `https://www.vulnetix.com/tea/public/v1.0.0` |
| Root (0.4.0) | `https://www.vulnetix.com/tea/v0.4.0` | `https://www.vulnetix.com/tea/public/v0.4.0` |
| Holds | Vulnetix's own products, and your organisation's scans and publications | The most-starred GitHub projects, at most 1,500 |
| Anonymous request | Public objects only | `401` |
| Plan to read | None | None; any valid API key, including a community-tier key |
| Identifiers | TEI and PURL | A TEI and a `pkg:github/owner/repo` PURL only |
| Accepts publication | Yes, at `/tea/v1` and `/tea/v0.4.0` | No |
| CLI | `vulnetix tea products` | `vulnetix tea --catalogue public products` |

A `pkg:npm/...` or `pkg:pypi/...` purl finds nothing in the open source catalogue: its projects carry GitHub purls only.

## What a credential changes

A credential only ever widens what you see: objects your organisation published or scanned, and objects shared with it, in addition to the public ones. It is never needed to read public records from the first-party root.

If you send a credential it must be valid. An unrecognised one is refused with `401`, not downgraded to anonymous, so a stale key fails loudly instead of silently hiding releases.

| Scheme | Header |
|---|---|
| Bearer token | `Authorization: Bearer <token>` (from `POST /token` on 1.0.0) |
| API key | `Authorization: ApiKey <orgId>:<hmac>` |
| Basic | `Authorization: Basic base64(<orgId>:<hmac>)` |

```bash
curl -s -H "Authorization: ApiKey $VULNETIX_ORG_ID:$VULNETIX_API_KEY" \
  'https://www.vulnetix.com/tea/public/v1.0.0/products?idType=PURL&idValue=pkg%3Agithub%2Fprefix-dev%2Fpixi'
```

## What you will not find

| Request | Answer | Why |
|---|---|---|
| A private object, or one shared with someone else | `404 OBJECT_UNKNOWN` | Saying an object exists but is not yours is itself a disclosure. It also stops a caller probing another tenant's UUIDs. |
| An unknown path | `404 OBJECT_UNKNOWN` | The error shape a TEA client can parse |
| Another tenant's scan-derived records | absent | An inference drawn from scanning someone's code is not published |

The 1.0.0 specification asks for `401` with a Bearer challenge when an anonymous caller asks for an object it may not read. The Vulnetix server answers `404` instead, and declares that deviation in its conformance report.

## Scan-derived records

The first-party root also projects your own scan history into TEA objects. These have no access policy of their own: their visibility is the visibility of the git repository they describe.

| What CI last reported for the repository | Visibility |
|---|---|
| `public` | `public` |
| `private`, `internal`, nothing, or any other value | `private` |

The CLI reads `repository.visibility` from the GitHub Actions event and sends it with every scan. The latest report wins. A local run that reports nothing is skipped rather than read as unknown.

> [!CAREFUL] Public scan-derived records are not yet served anonymously
> A public repository's scan-derived records are labelled `public`, but the anonymous catalogue still serves published objects only. To make a release readable without a credential today, publish it with [`tea release`](/tea/cli/release/) and `--visibility public`.

## CLI credential rules

- Stored credentials always win: environment variables, then credential files, then netrc.
- With none stored, the CLI sends the shared community credential to the open source root only. It never sends it to the first-party root, where it would return the community organisation's own catalogue instead of the public records.
- `-v` prints `tea: using the community credential` on stderr.
- `--server` and `--catalogue` together are an error.
- A `401` is explained: for the open source root, whether your stored key or the built-in credential was refused; for any other server, that it requires credentials. Each says to run `vulnetix auth login`.
- `--catalogue public` is read-only. The publishing commands refuse it.
