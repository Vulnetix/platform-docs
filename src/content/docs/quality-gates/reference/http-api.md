---
title: HTTP API
description: GET and PUT /v1/quality-gate, the organisation's Quality Gate and EOL severities over HTTP. Authentication, body fields, write semantics, errors.
order: 2
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/quality_gate.go, vdb-site/api/internal/handler/jail_policy.go, vdb-site/api/internal/handler/policy_roles.go, vdb-site/api/internal/handler/account.go, vdb-site/api/internal/handler/drift_guard.go, vdb-site/api/internal/handler/drift_guard_routes.go]
checked: [vdb-site@d2ea72f23]
updated: 04 Nov 2026
---

The Quality Gate and the EOL severities are one record per organisation, read and written at `/v1/quality-gate`. The Resolve Platform's [Quality Gate page](https://www.vulnetix.com/resolve/quality-gate) uses these routes. For automation, prefer the [`QualityGate`](/platform-iac/kinds/quality-gate/) kind with `vulnetix config apply`, which takes an API key. There is no separate EOL policy route: the EOL severities are fields of this record.

Base URL: `https://www.vulnetix.com/api/site/v1/`.

| Method | Path | Who |
|---|---|---|
| GET | `/v1/quality-gate` | any member |
| PUT | `/v1/quality-gate` | owner, admin or developer |

## Authentication

Both routes take the Resolve Platform session only: the `vdb_token` cookie, or `Authorization: Bearer <session JWT>`. An `ApiKey` header is `401` `not authenticated`.

The record belongs to the organisation, not to the caller, so every member reads and writes the same one.

## Fields

Every field and what it enforces is on [Settings](/quality-gates/gate/settings/).

| Field | Type | Values |
|---|---|---|
| `severity` | string or `null` | `low`, `medium`, `high`, `critical` |
| `exploits` | string or `null` | `poc`, `active`, `weaponized` |
| `blockMalware` | bool or `null` | |
| `blockUnpinned` | bool or `null` | |
| `blockEol` | bool or `null` | |
| `cooldown` | int or `null` | `>= 0` |
| `versionLag` | int or `null` | `>= 0` |
| `scaAutofixStrategy` | string or `null` | `latest`, `safest`, `stable`, `rolling` |
| `scaAutofixMaxMajorBump` | int or `null` | `>= 0` |
| `eolRetiredSeverity` | string | `skip`, `low`, `medium`, `high`, `critical` |
| `eolWithin30DaysSeverity` | string | as above |
| `eolThisQuarterSeverity` | string | as above |
| `eolNextQuarterSeverity` | string | as above |

The first nine are the enforcement settings. `null` means the organisation has not set it, and each pipeline's own flag or default applies.

## GET /v1/quality-gate

```bash
curl -s https://www.vulnetix.com/api/site/v1/quality-gate \
  -H "Authorization: Bearer $SESSION_JWT"
```

```json
{
  "config": {
    "eolNextQuarterSeverity": "low",
    "eolThisQuarterSeverity": "medium",
    "eolWithin30DaysSeverity": "high",
    "eolRetiredSeverity": "critical",
    "blockEol": null,
    "blockMalware": true,
    "blockUnpinned": null,
    "cooldown": 3,
    "versionLag": null,
    "scaAutofixMaxMajorBump": null,
    "exploits": null,
    "severity": "high",
    "scaAutofixStrategy": null
  }
}
```

An organisation that has never saved a quality gate gets `404` `{"error": "not found"}`. Treat it as every enforcement setting unset and the EOL defaults.

## PUT /v1/quality-gate

```bash
curl -s -X PUT https://www.vulnetix.com/api/site/v1/quality-gate \
  -H "Authorization: Bearer $SESSION_JWT" \
  -H 'Content-Type: application/json' \
  -d '{"severity": "high", "blockMalware": true, "cooldown": 3,
       "exploits": null, "blockUnpinned": null, "blockEol": null,
       "versionLag": null, "scaAutofixStrategy": null, "scaAutofixMaxMajorBump": null}'
```

Answers `200` `{"message": "config updated successfully"}`. The first save creates the record.

The two groups of fields are written differently:

| Fields | A field you leave out |
|---|---|
| The four `eol*Severity` fields | Keeps its stored value. On the first save it takes the default: retired `critical`, within 30 days `high`, this quarter `medium`, next quarter `low`. |
| The nine enforcement fields | Is written as `null`, which unsets it |

> [!CAREFUL] Send all nine enforcement fields on every PUT
> The enforcement fields are replaced as a set. A body of `{"severity": "high"}` sets the severity and unsets every other enforcement setting the organisation had. Read the record first, change what you mean to change, and send all nine. `vulnetix config set quality-gate` does this for you.

> [!WHY] Why leaving a field out unsets it
> The Resolve Platform's **Not enforced** choice stores `null`, and it saves the whole form at once. Writing every enforcement field on each save is what lets that choice clear a value. The EOL fields are never `null`, so they keep merge semantics.

## Errors

| Status | Body | When |
|---|---|---|
| `400` | `invalid request body` | The body is not JSON of this shape |
| `400` | `<field> must be one of ...`, `<field> must be >= 0` | A value is out of range; see [API validation](/quality-gates/gate/settings/#api-validation) |
| `401` | `not authenticated` | No session, or an API key |
| `403` | `only an owner, admin or developer can change this policy` | PUT by a member |
| `404` | `not found` | GET before the first save |
| `409` | `managed_by_platform_iac` | PUT while [drift protection](/platform-iac/guides/drift-protection/) is on and `QualityGate` is managed by Platform IaC. The body names `kind` and `manager`. |
| `503` | `could not resolve organization` | The caller's organisation could not be looked up |
