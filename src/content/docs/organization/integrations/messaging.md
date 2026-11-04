---
title: Messaging
description: Send scan findings, uploads, Pix Sandbox and agent activity, factory and Belai events, Guardian alerts and sensitive account activity to Slack, Microsoft Teams, Discord, Google Chat, Jira, GitHub Issues or a signed webhook. Connections, events, routes, digests, templates and delivery.
order: 2
sources: [vdb-site/docs/messaging.md, vdb-site/api/internal/handler/messaging_handlers.go, vdb-site/api/internal/handler/messaging_dispatcher.go, vdb-site/api/internal/handler/messaging_send.go, vdb-site/api/internal/handler/messaging_store.go, vdb-site/api/internal/messaging/catalogue.go, vdb-site/api/internal/messaging/match.go, cli/website/content/docs/enterprise/messaging.md]
checked: [vdb-site@1a06d67, cli@4c8c3b7]
updated: 02 Nov 2026
---

The messaging centre (**Configuration › Messaging**, `/resolve/messaging`) sends Vulnetix events to the tools your team uses. A **connection** is one destination. A **route** says which events go to which connections, who is mentioned and which **template** words the message.

Messaging is Pro and above. Members can read every tab; owners create and change connections, routes and templates, send tests, retry deliveries, and see sensitive events.

## Connections

| Provider | How it connects | What it sends |
|---|---|---|
| Slack | **Add to Slack** on Integrations, then choose a channel | A message with blocks, buttons and mentions. One message per factory run, with later events in its thread. |
| Microsoft Teams | A Workflows "When a Teams webhook request is received" URL | An Adaptive Card 1.4 with mention entities |
| Discord | A channel webhook URL | An embed. Mentions are limited to the people you chose, so `@everyone` never fires. |
| Google Chat | A space webhook URL | A card |
| Jira Cloud | `https://<site>.atlassian.net`, an account email and an API token | An issue; a repeat comments on the open issue |
| GitHub Issues | The Vulnetix GitHub App, installed from Integrations | An issue with labels; a repeat comments on the open issue |
| Signed webhook | Any public https endpoint | JSON signed per [Standard Webhooks](https://www.standardwebhooks.com/). See [Signed webhooks](/organization/integrations/signed-webhooks/). |

Slack and GitHub connections come from Integrations. The others are added on the Connections tab (`POST /v1/messaging/connections` with `provider`, `label`, `url`, or `jira: {siteUrl, email, apiToken, defaultProjectKey, defaultIssueType}`).

| Provider | URL host must be |
|---|---|
| Discord | `discord.com` or `discordapp.com` |
| Google Chat | `chat.googleapis.com` |
| Teams | `*.logic.azure.com`, `*.environment.api.powerplatform.com` or `*.webhook.office.com` |
| Signed webhook | any public https host |

Every URL you give is fetched over https only, with no redirects, and only to public addresses. A Jira connection is saved only after Jira accepts the email and token.

Every credential (bot token, webhook URL, API token, signing secret) is stored in the [secrets vault](/organization/security/secrets-vault/) as a connector entry. It is never shown again after you save it, and only Vulnetix's own services open it. Removing a connection revokes its vault entry.

## Events

Event types are `<domain>.<entity>.<verb>`. A route listens for one type, a family (`pix.agent.*`) or everything (`*`).

| Category | Events |
|---|---|
| Scans and findings | `scan.completed`, `scan.build_broken` (a quality gate failed the build), `findings.auto_resolved`, `scan.ingested` |
| Uploads | `upload.processed`: an SBOM or results file finished processing |
| Pix Sandbox | `pix.<kind>`, such as `pix.egress.blocked`, `pix.forge.pr`, `pix.launch.state` |
| Pix agent activity | `pix.agent.<kind>`, such as `pix.agent.worker.started`, `pix.agent.finding.carded` |
| Belai | `belai.<kind>`, `belai.dispatch.<state>`, `belai.session.ended.<outcome>`, `belai.session.ask.<kind>`, `belai.draft.done`, `belai.draft.refused`, `belai.host.attention.<kind>`, `belai.host.rc_online`, `belai.host.rc_offline`, `belai.card.assigned`, `belai.checkpoint.waiting`, `belai.checkpoint.decided`, `belai.github.conflict.escalated` |
| Software Factory | `factory.approval.requested`, `factory.approval.overdue`, `factory.run.*`, `factory.nohost.*`, `factory.crew.unclaimed`, `factory.card.blocked`, `factory.gate.failed`, `factory.pr.opened`, `factory.budget.*`, `factory.quota.low`. See [the factory's messaging page](/software-factory/workforce/messaging-centre/). |
| Guardian | `siem.alert.<level>`, `siem.rule.*`, `siem.source.*`, `siem.usage.*`, `siem.trigger.fired`, `siem.report`. See [/siem/](/siem/). |
| Sensitive account activity | `security.mfa.enrolled`, `.removed`, `.reset_by_admin`; `security.password.changed`, `.reset_by_admin`; `security.member.invited`, `.invite_revoked`, `.approved`, `.denied`, `.role_changed`, `.removed`, `.api_key_viewed`, `.api_key_rotated`; `security.service_account.created`, `.rotated`, `.deleted`; `security.org_key.created`; `security.org_secret.regenerated` |
| Secrets vault | `vault.entry.created`, `.value_replaced`, `.revoked`, `.rotated`, `.rotation_failed`, `.expiring` |
| Messaging | `messaging.connection.created`, `.removed`, `.broken`, `.credential_revoked`; `messaging.route.changed` |

`GET /v1/messaging/catalogue` lists every type with its category, default severity, whether it is sensitive, its fields and its default template.

**Sensitive events** (`security.*`, `vault.*` and the admin-only sandbox events):

- They show a reduced form: the action, who it was about and when. Email addresses are masked unless the route includes personal data (`includePII`).
- They go to a GitHub repository only if Vulnetix knows it is private.
- They go to a signed webhook only if the route sets `allowSensitiveWebhook`.
- Only owners can route them or see them in the activity log.
- They are recorded even with no route, because they are also your history of sensitive activity, and are kept 180 days.

A field whose name looks like a secret (token, password, key material, fingerprint, last four, IP, user agent, prompt) is dropped from every payload.

## Routes

| Field | Values |
|---|---|
| `name` | 1 to 120 characters |
| `eventTypes` | 1 to 50 types or families |
| `minSeverity` | `info`, `notice`, `warning`, `critical` |
| `filters.scope` | `appName`, `appVersion`, `uploadUuid`, `repo` |
| `filters.findings` | For scan and upload events: `cvssThreshold`, `cvssSeverities`, `epssThreshold`, `cessThreshold`, `isMalware`, `isExploitable`, `hasExploits`, `exploitThreshold`, `newOnly`, `ignoreTest`. A scan is reported only when at least one finding meets every threshold you set. |
| `actorFilter` | `{mode: "any" \| "include" \| "exclude", principals, kinds}`: who caused the event |
| `mentionPrincipals` | Up to 25 members to mention, wherever they have an id on that provider |
| `targets` | Up to 20 of your connections, each once. A GitHub target needs `owner` and `repo`; a Jira target needs a `projectKey`, its own or the connection's default. Options: `channelId` (Slack), `labels`, `issueType`, `setPriority`, `assignMentions`. |
| `templateId` or `templateSystemKey`, `templateVersion` | The template. Unset uses the event type's default. |
| `digest` | See below |
| `maxPerHour` | 1 to 10000, default 60. Past it, the rest of the hour becomes one digest. |
| `mode` | `live` or `shadow` (logged on the Activity tab, never sent) |

> [!CAREFUL] Four finding filters match nothing
> `isReachable: true`, `isEol: true`, `onlyProduction` and `onlyDirect` are accepted, but reachability, EOL, production and direct-dependency are not recorded on the findings a scan event reports. A route that requires any of them never fires. Leave them unset.

**Findings reports.** For a scan event the route reads up to 2000 of the scan's findings with their latest triage. Findings triaged as not affected, false positive or resolved are left out. Severity comes from CVSS (9 critical, 7 high, 4 medium, above 0 low; malware with no score is critical). Exploitable means CISA KEV or a recorded exploit. The message counts findings by severity and lists the 20 worst the route accepts: malware first, then severity, exploitable, CVSS.

### Digests and tiers

| `digest.mode` | Sends |
|---|---|
| `immediate` | each event at once |
| `window` with `minutes` 15 or 60 | one message per window |
| `daily` with `hour` (0 to 23) and `tz` (IANA) | one message a day |

Every event is in a **tier**: `needs_you` (an approval requested or overdue, a blocked card, a spent budget, a paused run, a session waiting on a person), else `error` (critical), `warning`, or `info` (notice and info). `digest.tiers` sends each tier `instant`, `digest` or `off`:

```json
{"mode": "window", "minutes": 60, "tiers": {"needs_you": "instant", "error": "instant", "info": "off"}}
```

A tier you do not name follows `mode`. A digest lists up to 50 events and says how many more there were; on Slack it is grouped by cause instead, with "Needs you" items first.

### Dry run

`POST /v1/messaging/routes/{id}/dry-run {eventId}` shows whether the route would take a stored event, why not, and what each target would receive. Nothing is sent. `POST /v1/messaging/routes/{id}/test` sends a sample to every target.

## Templates

Copy a system template (`copyFrom: "system:<key>"`) to change its title, body, fields, buttons, issue wording or digest lines. System templates: `findings.report`, `scan.build_broken`, `pix.event`, `agent.activity`, `belai.dispatch`, `belai.session`, `notice`, `security.alert`, `vault.alert`, `messaging.alert`, `siem.alert`, `siem.report`, `generic`.

Fields are Go templates: `{{.event.title}}`, `{{.data.repo}}`, `{{range .findings.top}}...{{end}}`.

- `call`, `printf`, `template`, `define`, `block`, and `range` over anything but a list are refused.
- Every value is escaped, so event data cannot add formatting, links or mentions.
- A `link` must be https.
- Each field is at most 16 KiB of source and 32 KiB of output.

**Preview** (`POST /v1/messaging/templates/preview`) renders a sample or a stored event for every provider with the same engine that sends, and reports compile errors with field, line and column. **Saving** adds a version; an old version can be restored. A template in use cannot be deleted unless you pass `?reassign=system`.

A route picks its template in this order: its own template at the pinned version or the latest, its system key, the event type's default, `generic`.

## People

The **People** tab (`/v1/messaging/identities`) records who each member is on each provider, for mentions. **Look up by email** (`POST /v1/messaging/identities/auto-link`) finds members on Slack and Jira; it never overwrites an identity set by hand.

## Delivery

| Provider answer | Result |
|---|---|
| Success | `sent`, with a link to the message or issue |
| Network error, 5xx, 408, 429 | `failed`, retried after 30 s, then ×4 each time (±20%, at most 6 h), honouring `Retry-After`; `dead` after 8 attempts. A 429 also holds the whole connection until `Retry-After`. |
| 401, 403, 404, 410, or a revoked vault entry | `dead`, and the connection's failure count goes up |
| Any other 4xx, or a template that fails to render | `dead` |

- **Broken connections.** The third credential failure in a row marks the connection `broken` and emits `messaging.connection.broken`, which is never sent to the connection it describes. A success resets the count. Fix it on the Connections tab.
- **Order.** One connection's deliveries go one at a time, in order.
- **Duplicates.** Delivery is at least once. Webhooks carry `webhook-id`; GitHub and Jira keep one issue per event type and repository, and comment on it.
- **Activity.** Every delivery, its outcome and a link is on the Activity tab. `POST /v1/messaging/deliveries/{id}/retry` makes a failed or dead delivery due again.
- **Retention.** Deliveries 90 days, digests 30, events 30 (sensitive and messaging events 180).

## API

| Method | Path |
|---|---|
| GET | `/v1/messaging/catalogue` |
| GET, POST | `/v1/messaging/connections` |
| PATCH, DELETE | `/v1/messaging/connections/{id}` |
| POST | `/v1/messaging/connections/{id}/test`, `/v1/messaging/connections/{id}/rotate-secret` |
| GET, POST | `/v1/messaging/routes` |
| PATCH, DELETE | `/v1/messaging/routes/{id}` |
| POST | `/v1/messaging/routes/{id}/test`, `/v1/messaging/routes/{id}/dry-run` |
| GET, POST | `/v1/messaging/templates` |
| POST | `/v1/messaging/templates/preview` |
| GET, PATCH, DELETE | `/v1/messaging/templates/{id}` |
| GET | `/v1/messaging/templates/{id}/versions/{v}` |
| POST | `/v1/messaging/templates/{id}/restore/{v}` |
| GET | `/v1/messaging/events`, `/v1/messaging/deliveries` (50 a page, `cursor`) |
| POST | `/v1/messaging/deliveries/{id}/retry` |
| GET | `/v1/messaging/identities` |
| POST | `/v1/messaging/identities/auto-link` |
| PUT, DELETE | `/v1/messaging/identities/{principalUuid}/{provider}` |

These routes take the Resolve Platform session only, not an API key. Request bodies are at most 256 KiB.

| Limit per organisation | Value |
|---|---|
| Connections | 100 |
| Routes | 200 |
| Templates | 200 |

## Related

- [Signed webhooks](/organization/integrations/signed-webhooks/)
- [Notifications](/organization/integrations/notifications/) for push to browsers and phones
- [Integrations](/organization/integrations/integrations/)
