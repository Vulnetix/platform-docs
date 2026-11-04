---
title: Drift protection
nav: Drift protection
description: The organisation setting that makes the console and the legacy APIs refuse changes to settings managed by Platform IaC, what counts as managed, what is refused with HTTP 409 and what always passes, how an owner or admin switches it, and what it does not cover.
order: 2
sources: ["vdb-site/docs/platform-iac-engine.md", "vdb-site/api/internal/handler/drift_guard.go", "vdb-site/api/internal/handler/drift_guard_routes.go", "vdb-site/api/internal/handler/drift_guard_exempt.go", "vdb-site/api/internal/handler/drift_protection.go", "config-schemas/schemas/Organization.schema.json", "website/.repo/platform-iac-indicator.md", "website/src/shared/platform-iac-pages.ts", "website/src/components/platform-iac/PlatformIacIndicator.vue", "website/src/components/platform-iac/DriftProtectionSwitch.vue", "website/src/stores/platform-iac.ts"]
checked: ["config-schemas@v1.15.0", "vdb-site@cca0d31", "website@b548e4c"]
updated: 03 Nov 2026
---

Drift protection is an organisation setting that decides whether settings managed by Platform IaC can still be changed from the console and the legacy APIs. It is a single boolean, `driftProtection`, and it is `false` by default.

| Setting | Behaviour |
|---|---|
| Off (the default) | Advisory only. Nothing is refused. The console shows which settings are managed as code, and [`vulnetix config plan`](/platform-iac/cli/plan/) reports an outside edit as drift. |
| On | Enforced. A write that does not come from Platform IaC, to a kind that is managed, is refused with HTTP 409. |

It needs `config-schemas` v1.15.0 for the `Organization` field, and a database migration on the server (see [Before the migration](#before-the-migration)).

## What managed means

An object is **managed by Platform IaC** when it has an ownership record whose manager is `terraform` or `gitops:<repo>`. An object whose manager is `console`, which is what the imperative CLI commands and the console use, is not managed. See [who manages an object](/platform-iac/reference/engine/#who-manages-an-object).

A **kind is managed** when any object of it is. One Terraform-managed `QualityGate` makes `QualityGate` managed for the organisation. A kind with no managed object is never affected, whatever the switch says, so turning Drift protection on in an organisation that manages nothing as code changes nothing.

## What is refused

With the switch on, a `POST`, `PUT`, `PATCH` or `DELETE` to a route that writes a managed kind is answered `409`:

```json
{
  "error": "managed_by_platform_iac",
  "kind": "QualityGate",
  "manager": "terraform",
  "message": "These settings are managed by Platform IaC (terraform). Change them there, or ask an owner to turn off Drift protection."
}
```

`kind` is the first kind of that endpoint that has a managed object, and `manager` is who manages it. The guard covers the routes the console and the legacy APIs use to write each kind: the [route to kind table](#route-to-kind-table) lists them. This applies whoever calls: a person in the console, an API key or a legacy endpoint.

If the guard cannot read the setting or the ownership records, it refuses the write with `503` rather than letting it through.

## What always passes

| Always allowed | Why |
|---|---|
| `/v1/config/*`: plan, apply, export, the object routes and the Drift protection setting itself | The way to change a managed setting. The engine's own apply never goes through HTTP. |
| Every read, every export, Download as code and the ownership listing | Only the four write methods are looked at. |
| A write to a kind with no managed object, and every write while the switch is off | Nothing to protect. |
| The switch | Drift protection never blocks itself, so an owner or admin can always turn it off. |

## Switching it

An owner or admin can turn it on or off at any time, in either direction. Setting the value it already has writes nothing.

| How | Who |
|---|---|
| `driftProtection: true` on the [`Organization`](/platform-iac/kinds/organization/#spec-driftProtection) document, applied with `vulnetix config apply`, Terraform or the config API | An owner: a person, or an owner service account. A `developer` service account cannot apply `Organization`. |
| `PUT /v1/config/drift-protection` with `{"enabled": true}` | An owner |
| `GET /v1/config/drift-protection` | Any member session |

`GET` and `PUT` answer the same object:

```json
{
  "enabled": true,
  "available": true,
  "managed": [
    { "kind": "QualityGate", "manager": "terraform", "count": 1 },
    { "kind": "PackageList", "manager": "gitops:acme/platform", "count": 14 }
  ]
}
```

`managed` lists, per kind and manager, the objects that are not `console`-managed, which is what the guard would protect. The `PUT` body takes `enabled` and nothing else. Every change is recorded in the config audit log (kind `Organization`, name `default`, field `spec.driftProtection`) with who made it and which token.

The console switch is described under [In the console](#in-the-console). A signed-in session also learns the setting from `GET /v1/account`, which carries `driftProtection`. If that read fails, the setting reads as off.

```yaml
apiVersion: vulnetix.com/v1
kind: Organization
metadata:
  name: default
spec:
  driftProtection: true
```

The `Organization` document is a singleton that merges: a document without `driftProtection` leaves the setting as it is. Because the CLI embeds one release of the schemas, `vulnetix config validate`, `plan` and `apply` refuse the field until a CLI release embeds `config-schemas` v1.15.0 or later; CLI v4.9.1 embeds v1.14.0. Use the config API or Terraform for it until then.

## Before the migration

The setting is stored on the tenant row by a database migration, `20261229050000_drift_protection`. Until the server has applied it, the setting reads as off and `available` is `false`. Turning it off is accepted. Turning it on is refused:

```json
{"error":"drift_protection_unavailable","message":"... the database migration 20261229050000_drift_protection has not been applied."}
```

with HTTP 409. An `Organization` document with `driftProtection: false` is in step, and one with `true` fails the apply naming the migration.

## In the console

Since the console release of 3 November 2026, the console shows which pages are managed as code and, with Drift protection on, makes them read only. The server stays the authority: it refuses a write to a managed kind with 409 whatever the page shows.

### The indicator

A console page that edits a kind Platform IaC can manage shows a small branch icon in the top-right of its header, beside the **?** help icon (on its own where the page has no **?**). A page that edits no such kind shows nothing. The page-to-kinds map is fixed in the console: for example Quality gate is `QualityGate`, Jail is `JailPolicy` and `JailExemption`, Integrations is the GitHub, forge, Wiz and AWS kinds, and Members is `Member` and `ServiceAccount`.

| State | When | Hover text |
|---|---|---|
| Hidden | The page edits no Platform IaC kind | None |
| Unlit (dimmed) | The page can be managed as code and none of its kinds has a managed object | `Not managed by Platform IaC` |
| Advisory (warning colour) | A kind of the page is managed and Drift protection is off | `Managed by Platform IaC (<manager>). Drift protection is off, so changes here may be overwritten at the next apply.` |
| Enforced (primary colour, check icon) | A kind of the page is managed and Drift protection is on | `Managed by Platform IaC (<manager>). Drift protection is on: change these settings in code.` |

`<manager>` is `Terraform` or `GitOps · <repo>`, and several are joined with a comma. The hover text appears after a short delay and is also the icon's accessible label.

Clicking the icon opens a menu with the same sentence, then the page's managed kinds, each with its manager, `<n> objects` when there is more than one, and the `sourceRef` (the commit the last apply came from) when the server sends one. Below are links to the Platform IaC overview and to the page of each kind the page edits, and, for the switch, the **Drift protection** toggle.

### Where to switch it

- In the indicator's menu, on any page that has one.
- On **Account** › **Profile** (`/resolve/account`), in the card **Platform IaC drift protection**. It explains the setting and shows the same switch, with the line `On. Settings that Platform IaC manages are read only here, and the server refuses a change made in the console. Change them in code.` or `Off. Settings that Platform IaC manages can still be edited here, and the next apply may overwrite the change.`

An organisation owner or admin can switch it at any time. Anyone else sees the state, the switch is disabled, and it says `Only an organisation owner or admin can switch Drift protection.` The switch takes effect at once and is written to the config audit log like an API change.

### What locked means

On a page whose indicator is **enforced**, the console is read only for the kinds that are managed:

- Fields are read only, and save, delete, add, edit, pause and rotate actions are disabled.
- Tabs, filters, search, pagination, expanding and collapsing, **Download as code**, copy buttons and links keep working.
- If a write still reaches the server, for example from a page that had not yet loaded the state, the server's 409 message is shown as a toast and the console reads the state again, so the page turns read only.

The lock is per kind on a page that edits several: the Messaging page locks the connections, routes or templates that are managed and leaves the others editable.

### Limits of the console

The console behaves as follows, and has not been exercised against the live backend by the team that built it, so check it on your own organisation before relying on it.

- **Managed is per kind, not per object.** If any repository's settings are managed as code, the repository settings page lights up and locks, including repositories that are not managed. The server guards the same way.
- **Some pages are only partly read only.** The write actions are disabled but some fields can still be edited, though nothing saves: the Software Factory workflow canvas, the new-campaign wizard, the Belai host launch fields, and AWS onboarding on the Integrations page.
- **Cloudflare connect and device enrollment are not Platform IaC kinds,** so they are not locked.
- **SIEM pages.** The console map includes the Guardian pages (saved searches, detection rules, alert triggers, scheduled reports, log sources), but the server does not guard those kinds, so a lock there is only the console's.
- **A failed read means nothing is managed.** If the console cannot read `GET /v1/config/drift-protection`, every indicator stays unlit and no page is locked, rather than showing a lock the server would not enforce. The state is read once per session, and again after a switch change or a refused write.

## What it does not cover

Drift protection stops the console and the legacy APIs from changing a managed kind. It is not an access control, and it has these edges:

- **Only `/v1/config/*` bypasses it.** A credential that can apply is the key to every managed setting, but it passes only on the config routes. The same ApiKey sent to a console route is refused like anyone else. See [credentials for automation](/platform-iac/reference/config-api/#credentials-for-automation).
- **The factory kill switch is exempt.** `POST /factory/stop`, `/factory/resume` and `/factory/a2a/blackout` are emergency controls and must work when everything else is blocked.
- **Credential rotations are guarded.** Rotating a `ServiceAccount` key or a `VaultEntry` secret from the console is refused while that kind is managed.
- **Finding triage is not guarded.** Marking a finding a false positive can leave a console `Suppression` rule as a side effect, and that is not blocked. Only `POST /findings/bulk/suppress`, which exists to write rules, is guarded.
- **The SIEM kinds are not covered yet.** `SavedSearch`, `DetectionRule`, `AlertTrigger`, `ScheduledReport` and `LogSource` are written in Guardian, not in the site API, so the guard never sees their writes.
- **A person's own state is not guarded:** their password, MFA, API key, identity links and notification preferences.
- **Tests, previews, dry runs, syncs and refreshes change nothing a kind declares,** so they pass. So do legacy tables no kind writes, and `/admin/*`, which is Vulnetix staff tooling.
- **`PUT /v1/account` is guarded only when its body carries `companyEmailDomain`.** The rest of that route is the person's own profile.
- **`LicensePolicy` and `LicenseExceptions` are validate only,** and `VexSource` and `TeaPublicationTarget` are written only through the engine, so there is no console write to guard.

## Route to kind table

A write to one of these routes (under `/v1`) is refused when any of the kinds in the left column is managed.

| Kinds | Routes |
|---|---|
| `AgentProfile` | `POST /belai/library/profiles`, `DELETE /belai/library/profiles/{id}`, `POST /belai/library/profiles/{id}/versions`, `DELETE /belai/library/profiles/{id}/versions/{v}`, `POST /belai/library/profiles/{id}/rewind`, `POST /belai/hosts/{hostId}/library/backups`, `PUT /belai/hosts/{hostId}/library/sync/profiles/{id}` |
| `AgentProfile`, `Crew`, `LibraryItem` | `POST /belai/hosts/{hostId}/library/imports` |
| `AiFirewallPolicy` | `PUT /ai-firewall/settings`, `PUT /ai-firewall/hold-policy`, `POST /ai-firewall/models/policy`, `DELETE /ai-firewall/models/policy/{modelUuid}` |
| `AiFirewallPolicy`, `AiGovernanceList` | `POST /ai-firewall/guardrails`, `PUT /ai-firewall/guardrails/{uuid}`, `DELETE /ai-firewall/guardrails/{uuid}`, `POST /ai-firewall/capabilities/review` |
| `AiFirewallPolicy`, `AiProvider` | `POST /ai-firewall/providers/{uuid}/policy`, `DELETE /ai-firewall/providers/{uuid}/policy` |
| `AiProvider` | `POST /ai-firewall/providers`, `DELETE /ai-firewall/providers/{uuid}`, `PUT /ai-firewall/providers/{uuid}/key`, `DELETE /ai-firewall/providers/{uuid}/key` |
| `ApiSpecSource` | `POST /api-spec-sources`, `POST /api-spec-sources/cloudflare`, `DELETE /api-spec-sources/{uuid}` |
| `AwsAccount` | `POST /integrations/aws/accounts`, `PATCH /integrations/aws/accounts/{accountId}`, `POST /integrations/aws/sso/accounts/{accountId}/deploy-role`, `DELETE /integrations/aws/sso/accounts/{accountId}/deploy-role` |
| `AwsAccount`, `CloudSensors` | `POST /integrations/aws/native/{source}/deploy` |
| `AwsConnection` | `PATCH /integrations/aws/advanced`, `POST /integrations/aws/sso/start` |
| `AwsConnection`, `AwsAccount` | `DELETE /integrations/aws`, `POST /integrations/aws/iam-user`, `POST /integrations/aws/sso/poll`, `POST /integrations/aws/connect`, `POST /integrations/aws/provision` |
| `Campaign` | `POST /campaigns`, `PATCH /campaigns/{id}`, `DELETE /campaigns/{id}`, `PUT /campaigns/{id}/contributors` |
| `CloudSensors` | `PUT /integrations/aws/native/accounts/{accountId}`, `DELETE /integrations/aws/native/accounts/{accountId}`, `POST /integrations/aws/native/{source}` |
| `ComplianceTarget` | `PUT /compliance-targets/{name}`, `DELETE /compliance-targets/{name}` |
| `Crew` | `POST /belai/library/crews`, `DELETE /belai/library/crews/{id}`, `POST /belai/library/crews/{id}/versions`, `DELETE /belai/library/crews/{id}/versions/{v}`, `POST /belai/library/crews/{id}/rewind`, `POST /belai/hosts/{hostId}/library/crew-backups`, `PUT /belai/hosts/{hostId}/library/sync/crews/{id}` |
| `DetectionRuleFeed` | `POST /detection-rule-feeds`, `PATCH /detection-rule-feeds/{uuid}`, `DELETE /detection-rule-feeds/{uuid}`, `POST /detection-rule-feeds/{uuid}/entries`, `DELETE /detection-rule-feeds/{uuid}/entries/{id}`, `PATCH /detection-rule-feeds/{uuid}/entries/{id}`, `POST /detection-rule-feeds/{uuid}/publish`, `POST /detection-rule-feeds/{uuid}/revoke` |
| `FactoryBudget` | `POST /factory/budgets`, `PUT /factory/budgets/routing`, `PUT /factory/budgets/providers/{id}`, `PUT /factory/budgets/{id}`, `DELETE /factory/budgets/{id}` |
| `FactoryManagedOrg` | `PUT /factory/orgs/{installationId}` |
| `FactorySchedule` | `POST /factory/schedules`, `PATCH /factory/schedules/{id}`, `DELETE /factory/schedules/{id}` |
| `FactorySettings`, `ScannerProfile`, `FactoryManagedOrg`, `NotificationDefaults` | `PUT /factory/settings` |
| `FactoryTrigger`, `FactoryWorkflow` | `POST /factory/workflows/{id}/triggers/{triggerId}/enable`, `POST /factory/workflows/{id}/triggers/{triggerId}/disable` |
| `FactoryWorkflow` | `POST /factory/workflows`, `PUT /factory/workflows/{id}`, `DELETE /factory/workflows/{id}`, `DELETE /factory/workflows/{id}/draft`, `POST /factory/workflows/{id}/publish`, `POST /factory/workflows/{id}/enable`, `POST /factory/workflows/{id}/disable`, `POST /factory/templates/{id}/use` |
| `ForgeConnection` | `POST /integrations/forges`, `DELETE /integrations/forges/{uuid}`, `PUT /integrations/forges/{uuid}/oauth` |
| `GitHubInstallation` | `DELETE /integrations/github/{id}`, `POST /integrations/github/claim` |
| `JailExemption` | `POST /jail/exemptions`, `DELETE /jail/exemptions/{uuid}` |
| `JailPolicy` | `PUT /jail`, `POST /jail/rules`, `PUT /jail/rules/order`, `PUT /jail/rules/{uuid}`, `DELETE /jail/rules/{uuid}` |
| `LibraryItem` | `POST /belai/library/items/{kind}`, `DELETE /belai/library/items/{kind}/{id}`, `POST /belai/library/items/{kind}/{id}/versions`, `DELETE /belai/library/items/{kind}/{id}/versions/{v}`, `POST /belai/library/items/{kind}/{id}/rewind`, `POST /belai/library/repositories/catalogue`, `POST /belai/hosts/{hostId}/library/item-backups`, `PUT /belai/hosts/{hostId}/library/sync/items` |
| `MalwareIoc` | `POST /malware/iocs`, `PATCH /malware/iocs/{uuid}`, `DELETE /malware/iocs/{uuid}` |
| `Member` | `POST /org/members/{principalUuid}/role`, `DELETE /org/members/{principalUuid}`, `POST /org/invitations`, `DELETE /org/invitations/{pk}`, `POST /org/pending/{userPk}/approve`, `POST /org/pending/{userPk}/deny` |
| `MessagingConnection` | `POST /messaging/connections`, `PATCH /messaging/connections/{id}`, `DELETE /messaging/connections/{id}`, `POST /messaging/connections/{id}/rotate-secret` |
| `MessagingRoute` | `POST /messaging/routes`, `PATCH /messaging/routes/{id}`, `DELETE /messaging/routes/{id}` |
| `MessagingTemplate` | `POST /messaging/templates`, `PATCH /messaging/templates/{id}`, `DELETE /messaging/templates/{id}`, `POST /messaging/templates/{id}/restore/{v}` |
| `NotificationDefaults` | `PUT /notifications/tenant-defaults` |
| `Organization` | `PUT /account` (only with `companyEmailDomain` in the body) |
| `PackageFirewallPolicy` | `PUT /package-firewall`, `PUT /package-firewall/ecosystem-policy`, `POST /package-firewall/mirrors`, `PUT /package-firewall/mirrors/{id}`, `DELETE /package-firewall/mirrors/{id}` |
| `PackageFirewallPolicy`, `PackageList` | `POST /package-firewall/exceptions`, `DELETE /package-firewall/exceptions/{id}` |
| `PackageList` | `POST /package-firewall/list`, `PATCH /package-firewall/list/{id}`, `DELETE /package-firewall/list/{id}`, `POST /package-firewall/list/bulk` |
| `QualityGate` | `PUT /quality-gate` |
| `RegistryConnection` | `PUT /scan-registries/{name}`, `DELETE /scan-registries/{name}` |
| `RemediationPolicy` | `PUT /triage-policy` |
| `RepositorySettings` | `PUT /repositories/asset`, `DELETE /repositories/asset`, `PUT /factory/repos/{owner}/{name}/settings`, `POST /factory/repos/bulk` |
| `RiskStrategy` | `POST /risk-strategies`, `PUT /risk-strategies/{id}`, `DELETE /risk-strategies/{id}`, `PUT /risk-strategies/{id}/rules` |
| `RuntimeSensorPolicy` | `POST /runtime/provisioning/profiles`, `PUT /runtime/provisioning/profiles/{uuid}`, `DELETE /runtime/provisioning/profiles/{uuid}` |
| `SandboxEgressPolicy` | `PATCH /belai/sandboxes/{id}/egress/{host}` |
| `SandboxLaunchProfile`, `SandboxEgressPolicy` | `PUT /belai/sandboxes/{id}/launch-config` |
| `ServiceAccount` | `POST /org/service-accounts`, `POST /org/service-accounts/{principalUuid}/rotate`, `DELETE /org/service-accounts/{principalUuid}` |
| `SsvcPolicy` | `PUT /ssvc/policy`, `DELETE /ssvc/policy` |
| `Suppression` | `POST /suppressions`, `PATCH /suppressions/{uuid}`, `DELETE /suppressions/{uuid}`, `POST /findings/bulk/suppress` |
| `VaultEntry` | `POST /vault/entries`, `PATCH /vault/entries/{id}`, `DELETE /vault/entries/{id}`, `POST /vault/entries/{id}/rotate` |
| `WizConnection` | `POST /integrations/wiz`, `DELETE /integrations/wiz` |

The TEA publisher API (`/tea/v1`, `/tea/v0.4.0`) is guarded too: `POST`, `PATCH` and `DELETE /product` is `TeaProduct`, the same on `/component` is `TeaComponent`, `PUT /productRelease/{uuid}/collection` and `PUT /componentRelease/{uuid}/collection` are `TeaCollection`, and `PUT /accessPolicy/{uuid}` is `TeaAccessPolicy`. Releases, distributions and artifacts are runtime data that CI publishes, and are not guarded.

## When you get the 409

`managed_by_platform_iac` means the setting is managed as code. Change it where it is declared: edit the document or the Terraform resource and apply it. To make an urgent change in the console, ask an owner or admin to turn Drift protection off first, and expect the next apply from `kind`'s `manager` to put the declared value back and report the console edit as drift. To find what is managed, read `managed` from `GET /v1/config/drift-protection` or `GET /v1/config/ownership`. See [GitOps from a repository](/platform-iac/reference/engine/#gitops-from-a-repository) and the [Config API](/platform-iac/reference/config-api/#drift-protection).
