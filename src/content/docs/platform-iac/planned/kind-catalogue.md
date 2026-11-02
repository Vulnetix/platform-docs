---
title: "Planned: kind catalogue"
nav: Kind catalogue
description: Planned, not available. The config kinds intended to cover every tenant setting, grouped by product, with the phase each is planned in.
order: 2
sources: [config-schemas/schemas/QualityGate.schema.json]
checked: [config-schemas@9bda9e1]
updated: 02 Nov 2026
---

> [!CAREFUL] Planned
> Only `QualityGate` has a released schema, and no kind can be applied through the config engine yet. `AiFirewallPolicy` exists as a CLI-applied file (see [AiFirewallPolicy](/platform-iac/kinds/ai-firewall-policy/)). Everything else in this table is a plan, and names and fields may change.

All kinds use `apiVersion: vulnetix.com/v1`. A kind ships only after its schema is in a `config-schemas` release.

| Group | Kinds | Notes |
|---|---|---|
| Org | `Organization` (one per tenant), `Member`, `ServiceAccount`, `NotificationDefaults` | Applying a `Member` sends an invite. A service account secret is returned once. |
| Vault | `VaultEntry` | Provider keys, environment values and management credentials, with grants per surface. |
| Integrations | `GitHubInstallation` (adopt an existing install), `ForgeConnection`, `MessagingConnection` (Slack, Teams, Discord, Google Chat, Jira, webhook), `MessagingRoute`, `MessagingTemplate`, `WizConnection`, `RegistryConnection` | Registry connections need a backend first. |
| Repo scope | `FactoryManagedOrg`, `RepositorySettings` | GitHub App repository selection stays on GitHub. |
| Assets | `RepositorySettings.labels`, `owner`, `criticality` | Needs new product features first. |
| Scanners and gates | `QualityGate` (released schema), `JailPolicy`, `JailExemption`, `LicensePolicy`, `ScannerProfile` | `LicensePolicy` also stays a repository file with the same schema. |
| Prioritisation | `RiskStrategy`, `RemediationPolicy` | Remediation SLAs per band, or a named standard: `nist-800-40`, `fedramp`, `essential8`, `cisa-bod-19-02`. |
| Suppression | `Suppression`, `VexSource` | Suppressions use the OpenVEX justification vocabulary. See [VEX sources](/platform-iac/planned/vex-sources/). |
| Campaigns | `Campaign` | Deleting archives. |
| Package firewall | `PackageFirewallPolicy`, `PackageList` | Entries are purls. Lists and ecosystem modes are console-only today. |
| AI firewall | `AiFirewallPolicy` (existing file, to be extended), `AiProvider`, `AiGovernanceList` | The existing `.vulnetix/ai-firewall.yaml` keeps working. |
| Malware | `MalwareIoc` (organization-managed IOCs) | Curation verdicts are global and stay out of tenant config. |
| Factory | `FactorySettings`, `FactoryWorkflow`, `FactoryTrigger`, `FactorySchedule`, `FactoryBudget` | Adds the YAML import that is missing today. |
| AI libraries | `AgentProfile`, `Crew`, `LibraryItem` | Library item bodies (`SKILL.md`, MCP JSON, hooks) are referenced as files. |
| Pix | `SandboxLaunchProfile`, `SandboxEgressPolicy` | Hostname-only egress. |
| TEA | `TeaProduct`, `TeaComponent`, `TeaCollection`, `TeaAccessPolicy`, `TeaPublicationTarget` | Releases and artifacts stay CI-published data. |
| SIEM | `SavedSearch`, `DetectionRule` (Sigma or the native DSL), `AlertTrigger`, `ScheduledReport`, `LogSource` | |
| Cloud | `AwsConnection`, `AwsAccount`, `CloudSensors` | Per-account sensor opt-in needs a write path first. |
| Compliance | `ComplianceTarget` | SLSA, SSDF, crypto policy and AI Act targets need product features first. |
| Virtual patching | `DetectionRuleFeed`, `RuntimeSensorPolicy` | Feeds are consumed by WAFs, IDS and the runtime sensor. |

## Planned order

| Phase | Kinds |
|---|---|
| P0 | Foundations: the engine, the schema pipeline (`config-schemas` `v1.0.0` is released), CLI v4, the provider skeleton. |
| P1 | Security policy: `QualityGate`, `JailPolicy`, `JailExemption`, `PackageFirewallPolicy`, `PackageList`, `AiFirewallPolicy`, `AiProvider`, `AiGovernanceList`, `RiskStrategy`, `RemediationPolicy`, `Suppression`, `VexSource`, `LicensePolicy`, `MalwareIoc`. |
| P2 | Org and integrations. |
| P3 | Factory, AI libraries, Pix, TEA, `Campaign`. |
| P4 | SIEM, cloud, detection rule feeds and the runtime sensor. |
| P5 | Kinds that need product features first: asset labels, `ComplianceTarget`, registry connections, per-account sensor opt-in. |
