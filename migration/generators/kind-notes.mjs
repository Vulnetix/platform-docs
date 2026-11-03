// Per-kind notes the schema cannot carry, for kind-reference.mjs. Facts checked
// against other repositories (where a field is enforced, how to set it today,
// what apply does). Keyed by kind: `intro` follows the schema description,
// `desc` appends to a field's description, `fields` adds a CAREFUL note under the
// field table, `cel` follows the CEL variable table, `apply` is what apply does,
// `after` is Markdown placed after the examples, `sources` are added to the
// page's sources.

// ── The catalogue groups ────────────────────────────────────────────────────
// The order of the kinds in the sidebar and on the catalogue page. Editorial:
// the schemas do not say which product a kind belongs to. A kind with a schema
// that is missing here fails the generator, so a new kind cannot go unlisted.
export const GROUPS = [
  ['Org', 'Who the organization is, who is in it, and how it is told things.', ['Organization', 'Member', 'ServiceAccount', 'NotificationDefaults']],
  ['Vault', 'Secrets the organization keeps for its other settings.', ['VaultEntry']],
  ['Integrations', 'Connections to GitHub, other forges, messaging services, Wiz and your own package and container registries.', ['GitHubInstallation', 'ForgeConnection', 'MessagingConnection', 'MessagingRoute', 'MessagingTemplate', 'WizConnection', 'RegistryConnection']],
  ['Repo scope', 'Which organizations and repositories the Software Factory works on, and how.', ['FactoryManagedOrg', 'RepositorySettings']],
  ['Scanners and gates', 'What a scan must pass, and what it checks.', ['QualityGate', 'JailPolicy', 'JailExemption', 'LicensePolicy', 'LicenseExceptions', 'ScannerProfile']],
  ['Prioritisation', 'How open findings are ranked, how the CISA SSVC decision is made, and how fast findings must be fixed.', ['RiskStrategy', 'RemediationPolicy', 'SsvcPolicy']],
  ['Suppression', 'Findings that are known not to matter, and the VEX documents that say so.', ['Suppression', 'VexSource']],
  ['Campaigns', 'Time-boxed remediation work across repositories.', ['Campaign']],
  ['Package firewall', 'What the package firewall lets through.', ['PackageFirewallPolicy', 'PackageList']],
  ['AI firewall', 'What the AI firewall lets models and agents do.', ['AiFirewallPolicy', 'AiProvider', 'AiGovernanceList']],
  ['Malware', 'Indicators of compromise the organization manages.', ['MalwareIoc']],
  ['Factory', 'Software Factory settings, workflows, triggers, schedules and budgets.', ['FactorySettings', 'FactoryWorkflow', 'FactoryTrigger', 'FactorySchedule', 'FactoryBudget']],
  ['AI libraries', 'Belai agents, crews and library items.', ['AgentProfile', 'Crew', 'LibraryItem']],
  ['Pix', 'Pix sandbox launch settings and egress.', ['SandboxLaunchProfile', 'SandboxEgressPolicy']],
  ['TEA', 'Products, components and collections published through the Transparency Exchange API.', ['TeaProduct', 'TeaComponent', 'TeaCollection', 'TeaAccessPolicy', 'TeaPublicationTarget']],
  ['SIEM', 'Guardian searches, detection rules, alerts, reports and log sources.', ['SavedSearch', 'DetectionRule', 'AlertTrigger', 'ScheduledReport', 'LogSource']],
  ['Cloud', 'How Vulnetix reaches an AWS estate and what it reads there.', ['AwsConnection', 'AwsAccount', 'CloudSensors']],
  ['API inventory', 'Where OpenAPI and Swagger descriptions are read from.', ['ApiSpecSource']],
  ['Virtual patching', 'Published rule feeds and the configuration runtime sensors enroll with.', ['DetectionRuleFeed', 'RuntimeSensorPolicy']],
  ['Compliance', 'Compliance obligations measured on a cadence: report frameworks, SLSA, NIST SSDF and a cryptography policy.', ['ComplianceTarget']],
];

// Catalogue kinds with no schema yet. They appear on the catalogue page only.
export const PLANNED = [];

// ── Who acts on a kind ──────────────────────────────────────────────────────
// vdb-site api/internal/handler/config_tokens.go ownerTokenKinds: a token that
// lists one of these must have the owner role.
export const OWNER_TOKEN_KINDS = new Set(['Organization', 'Member', 'ServiceAccount', 'VaultEntry']);
// vdb-site api/internal/config/siem.go SiemKindNames: written in Guardian with
// the caller's own vmt_ token, so only a token caller can plan or apply them.
export const GUARDIAN_KINDS = new Set(['SavedSearch', 'DetectionRule', 'AlertTrigger', 'ScheduledReport', 'LogSource']);
// vdb-site api/internal/config/external.go: kinds written in a second phase,
// after the Postgres transaction commits. Each object has its own result, and
// one that fails reports phase Failed.
export const EXTERNAL_KINDS = new Set([...GUARDIAN_KINDS, 'VaultEntry']);

// What status a kind reports after apply (vdb-site docs/platform-iac-engine.md,
// config/sideeffects.go phases). A kind missing here reports Applied or
// Unchanged and nothing more.
export const STATUS = {
  Member: 'Phase `Pending`, with `invitationExpires`, until the invitation is accepted; then `principalUuid`.',
  ServiceAccount: '`status.principal`, `status.apiKey` and `status.secret`, in the apply that creates it and never again.',
  MessagingConnection: 'A Slack connection reports phase `AwaitingAuthorization` with the install URL until someone authorizes it in a browser. A webhook\'s signing secret is shown once, in the apply that creates it.',
  AwsConnection: 'With `sso`: phase `AwaitingAuthorization` with `authorizationUrl` and `userCode` while the IAM Identity Center sign-in waits, then `Authorized`, or `AuthorizationRequired` when the code expired.',
  AwsAccount: '`stackStatus`, the account\'s CloudFormation deploy.',
  LogSource: '`status.ingestToken` for an aws or events source, in the apply that creates it and never again. A failed second-phase write reports phase `Failed`.',
  VaultEntry: 'A failed second-phase write reports phase `Failed` and the entry owns nothing.',
  SavedSearch: 'A failed second-phase write reports phase `Failed` with a `message`.',
  DetectionRule: 'A failed second-phase write reports phase `Failed` with a `message`.',
  AlertTrigger: 'A failed second-phase write reports phase `Failed` with a `message`.',
  ScheduledReport: 'A failed second-phase write reports phase `Failed` with a `message`.',
  GitHubInstallation: 'Read only: the installation\'s state, account and repository selection, as GitHub reports them.',
  ForgeConnection: '`connection`, `botLogin` and `version`.',
  FactorySettings: '`revision`.',
  FactoryManagedOrg: '`installationId`, `accountType`, `repositorySelection`, `repoCount` and `installationStatus`, read only.',
  Campaign: '`uuid`, `status` and what the campaign has achieved.',
  VexSource: 'The latest fetch: status `ok`, `partial` or `error`, document, statement and suppression counts, and per-document errors.',
};

// The finding variables a jail rule's `when` may use, by rule kind (vdb-api
// internal/handler/jail_when.go jailWhenSupported). The generator checks this
// table against that file when it is given --vdb-api.
export const JAIL_VARS = {
  VULN: ['id', 'severity', 'cvss', 'kev', 'malicious', 'reachable', 'fixAvailability', 'direct', 'purl', 'ecosystem', 'labels', 'owner', 'criticality', 'now'],
  EOL: ['id', 'severity', 'eol', 'direct', 'purl', 'ecosystem', 'labels', 'owner', 'criticality', 'now'],
  HYGIENE: ['id', 'severity', 'cvss', 'labels', 'owner', 'criticality', 'now'],
  GOAL: ['id', 'labels', 'owner', 'criticality', 'now'],
};
export const jailTable = () =>
  '| Rule `kind` | Variables `when` may use |\n|---|---|\n' +
  Object.entries(JAIL_VARS).map(([k, v]) => `| \`${k}\` | ${v.map((x) => '`' + x + '`').join(', ')} |`).join('\n');

// Where each kind's CEL expression runs, and what happens when it cannot be
// evaluated. Checked against the code (read 2026-11-03, on each repository's
// main): vdb-api internal/handler/jail_when.go and jail_eval.go; vdb-site
// api/internal/handler/factory_engine_node_gate.go, risk_cel.go and
// detection_rule_feeds_selector.go; package-firewall internal/policy/condition.go;
// ai-firewall internal/policy/expr.go. The CLI imports no CEL.
export const CEL_WHERE = {
  JailPolicy: {
    where: 'by the jail evaluator in the VDB API, which `vulnetix jail` and `vulnetix scan --jail` call, and by the Software Factory gate node for its `COUNT` rules',
    fail: 'In the VDB API a rule whose `when` does not compile, or uses a variable its rule kind lacks, is skipped with a warning, and a fact the expression errors on makes the rule `indeterminate` (`vulnetix jail` exits 3). In the factory gate the rule **fails closed**: it breaches, labelled "when could not be evaluated".',
  },
  RiskStrategy: {
    where: 'by the ranking ladder in the Vulnetix site API, over the tenant\'s open findings (at most 5000, most severe first)',
    fail: '**Fails open.** A rule that does not compile matches nothing and is logged. A finding the expression errors on does not match.',
  },
  Suppression: {
    where: 'by the suppression engine, over the findings a rule\'s anchors have already matched',
    fail: '**Fails open.** A finding the expression errors on is not suppressed.',
  },
  PackageList: {
    where: 'by the package firewall proxy, for each requested version, in `evaluate()`',
    fail: 'The entry is skipped and the proxy logs it.',
  },
  AiFirewallPolicy: {
    where: 'by the AI firewall gateway, for each request',
    fail: 'The rule is skipped, named in the decision\'s skipped list, and the gateway logs it.',
  },
  SsvcPolicy: {
    where: 'by the SSVC decision in the Vulnetix site API, on every decision and summary (the summary covers at most 5000 open findings, most severe first, cached for 60 seconds), and by the VDB API for the CLI scan and the remediation plan',
    fail: 'The decision point takes its lower value and the decision is still made. An override that fails does not hold.',
  },
  ComplianceTarget: {
    where: 'by the Vulnetix site API at every run of the target, once for each component of the newest CBOM of each repository in scope (at most 20000 components)',
    fail: '**Fails closed** for `crypto.allow`: a component it cannot be evaluated for is a violation, because an unassessed algorithm must not pass a policy. A `crypto.appliesTo` that fails leaves the component in scope.',
  },
  DetectionRuleFeed: {
    where: 'by the Vulnetix site API at every publish of the feed, once for each candidate rule and CVE',
    fail: 'The pair does not match. When every pair fails, the publish is refused.',
  },
};

export function kindNotes({ ENGINE_PAGE, CLI }) {
return {
  QualityGate: {
    sources: ['cli/cmd/config.go', 'cli/cmd/scan.go', 'cli/cmd/quality_gate_enforce.go', 'cli/internal/scan/eol_severity.go', 'vdb-api/internal/handler/v2_cli_quality_gate.go', 'vdb-api/internal/handler/cli_persist_eol.go', 'saas/prisma/models/quality-gate.prisma', 'vdb-site/api/internal/config/qualitygate.go'],
    desc: {
      spec: 'The gate settings. Every field is optional.',
      'spec.eol.severities.nextQuarter': 'Severity for a dependency whose end of life falls in the next calendar quarter.',
      'spec.eol.severities.thisQuarter': 'Severity for a dependency whose end of life falls in the current calendar quarter.',
      'spec.eol.severities.within30Days': 'Severity for a dependency whose end of life is within the next 30 days.',
      'spec.eol.severities.retired': 'Severity for a dependency already past its end of life.',
    },
    intro:
      'One per tenant, so `metadata.name` is always `default`. Each `spec` field is optional: a field you leave out leaves the matching `vulnetix scan` flag in charge. A field you set overrides that flag for every authenticated scan in the organization. The engine merges: applying a document changes only the fields it sets.',
    fields: {
      'spec.versionLag':
        'The schema description says "more than this many releases behind the newest". The CLI gate does the opposite: `vulnetix scan --version-lag N` fails a dependency whose installed version is one of the N most recently published versions (`cli/cmd/scan.go`). The CLI behaviour is what runs. A schema fix is pending in `Vulnetix/config-schemas`.',
      'spec.eol.block':
        'The description is true of the CLI gate only: `vulnetix scan` reads the horizon severities only when the EOL gate is on. On the platform, once the organization has a quality gate record, uploaded scans get a synthetic `VULNETIX-EOL` finding at the horizon severity whatever `block` says (`vdb-api/internal/handler/cli_persist_eol.go`).',
      'spec.scaAutofix.maxMajorBump':
        'The `--sca-autofix-max-major-bump` scan flag also accepts a negative number, meaning no limit. The schema has `minimum: 0`, so a document cannot express "no limit"; leave the field out to keep the flag in charge.',
    },
    after: `## Imperative equivalents

The same values can also be set with the imperative commands, now deprecated aliases that send a \`QualityGate\` document to the engine as manager \`console\`. Each field maps to one flag:

| Field | Command and flag | Scan flag it overrides |
|---|---|---|
| \`spec.severity\` | \`vulnetix config set quality-gate --severity\` | \`--severity\` |
| \`spec.exploits\` | \`vulnetix config set quality-gate --exploits\` | \`--exploits\` |
| \`spec.blockMalware\` | \`vulnetix config set quality-gate --block-malware\` | \`--block-malware\` |
| \`spec.blockUnpinned\` | \`vulnetix config set quality-gate --block-unpinned\` | \`--block-unpinned\` |
| \`spec.cooldownDays\` | \`vulnetix config set quality-gate --cooldown\` | \`--cooldown\` |
| \`spec.versionLag\` | \`vulnetix config set quality-gate --version-lag\` | \`--version-lag\` |
| \`spec.eol.block\` | \`vulnetix config set quality-gate --block-eol\` | \`--block-eol\` |
| \`spec.eol.severities.nextQuarter\` | \`vulnetix config set eol-policy --next-quarter-severity\` | none |
| \`spec.eol.severities.thisQuarter\` | \`vulnetix config set eol-policy --this-quarter-severity\` | none |
| \`spec.eol.severities.within30Days\` | \`vulnetix config set eol-policy --within-30-days-severity\` | none |
| \`spec.eol.severities.retired\` | \`vulnetix config set eol-policy --retired-severity\` | none |
| \`spec.scaAutofix.strategy\` | \`vulnetix config set quality-gate --sca-autofix-strategy\` | \`--sca-autofix-strategy\` |
| \`spec.scaAutofix.maxMajorBump\` | \`vulnetix config set quality-gate --sca-autofix-max-major-bump\` | \`--sca-autofix-max-major-bump\` |

The \`strict.yaml\` example above, written with the imperative commands:

\`\`\`sh
vulnetix config set quality-gate --severity high --exploits active \\
  --block-malware true --block-unpinned true --cooldown 7 --block-eol true \\
  --sca-autofix-strategy safest --sca-autofix-max-major-bump 0
vulnetix config set eol-policy --next-quarter-severity skip --this-quarter-severity low \\
  --within-30-days-severity high --retired-severity critical
\`\`\`

\`vulnetix config get quality-gate\` shows what is stored. See [Imperative commands](/platform-iac/cli/imperative-commands/) for every flag and the \`null\` value that unsets a field.`,
  },

  AiFirewallPolicy: {
    sources: ['cli/pkg/aifirewall/policy.go', 'cli/cmd/ai_firewall_apply.go', 'vdb-site/api/internal/config/aifirewallpolicy.go', 'vdb-site/api/internal/config/aigovernance.go'],
    intro:
      'The same document is the file `.vulnetix/ai-firewall.yaml`, which `vulnetix ai-firewall apply` reconciles and `vulnetix ai-firewall export` writes. The product reference for that file, with the workflow around it, is [Policy file reference](/ai-firewall/reference/policy-file/). This page is the schema reference, and covers what the config engine does with the same document.',
    after: `## Two ways to apply it

| | \`vulnetix ai-firewall apply\` | The config engine |
|---|---|---|
| Reads | \`.vulnetix/ai-firewall.yaml\`, or \`-f <file>\` | Documents sent to [\`POST /config/plan\` and \`/config/apply\`](${ENGINE_PAGE}) |
| \`metadata.org\` | Compared with the authenticated principal | Compared with the tenant, as for every kind |
| A guardrail with no \`priority\` | Sent as \`0\` | Written at \`100\`, the column default the console uses |
| \`baselineId\` | Not stored | Stored on the guardrail row and exported, so a composed baseline rule round-trips |
| \`providers[].key\` | Read on the machine running the CLI and stored as the provider key | Not stored; the plan warns. Use [\`AiProvider\`](/platform-iac/kinds/ai-provider/) \`apiKey\` for a custom provider's key |
| An \`allow\` rule whose action is \`flag\` | Applied | Applied, with a plan warning: it refuses nothing |

Both leave guardrails and model entries the document does not mention alone unless \`spec.prune\` is \`true\`, and neither ever prunes a provider entry. Guardrail rows that belong to an [\`AiGovernanceList\`](/platform-iac/kinds/ai-governance-list/) or to \`spec.capabilities\` are never touched by \`spec.guardrails\` or its prune.

## How vulnetix ai-firewall apply behaves

- **Order.** Guardrails, then models, then providers, then keys, then settings, so tightening a policy never passes through a moment where a provider is on and its guardrails are not.
- **Org guard.** If \`metadata.org\` is set and does not match the authenticated organization, apply refuses. \`--force\` overrides.
- **Drift.** Guardrails and model entries on the server that the file does not mention are reported and left alone, unless you prune.
- **Dry run.** \`--dry-run\` prints the plan and changes nothing.
- **Export.** \`export\` writes the live policy with the baseline pinned off, so applying an export is a no-op. Provider keys are never exported.

> [!WHY] The file works in both places
> Since CLI ${CLI.firstFor('AiFirewallPolicy')} \`vulnetix config validate\`, \`plan\` and \`apply\` know this kind, and a file is a Platform IaC document by its content, not its folder. \`.vulnetix/ai-firewall.yaml\` and a document under \`.vulnetix/config\` are the same thing: define the policy in one of them. \`validate\` reads the well-known file since v3.164.0. \`plan\` and \`apply\` read the well-known file too since CLI v4.0.0 when no \`-f\` is given, so \`config apply --prune\` adopts it. \`ai-firewall apply\` and \`export\` are aliases of the config engine for this kind since v4.0.0. See [Which files are Platform IaC documents](/platform-iac/cli/validate/#which-files-are-platform-iac-documents).`,
  },

  AiGovernanceList: {
    sources: ['vdb-site/api/internal/config/aigovernance.go'],
    after: `## How it is stored

Each pattern becomes one AI Firewall guardrail row of rule type \`<family>_<list>\` (\`tool_deny\`, \`mcp_allow\` and so on), owned by the list (\`configOwner = "AiGovernanceList/<name>"\`). Removing a pattern removes its row, and rows written in the console are never touched. [\`AiFirewallPolicy\`](/platform-iac/kinds/ai-firewall-policy/) \`spec.capabilities\` writes the same kind of rows, owned by the policy.`,
  },

  AiProvider: {
    sources: ['vdb-site/api/internal/config/aiprovider.go', 'vdb-site/api/internal/handler/config_engine_kinds.go'],
    after: `## How apply treats it

- Apply runs the console's own checks: the provider validator, the reserved built-in slugs, the public-host check on \`baseUrl\` and the cap of ten custom providers per tenant.
- The console has no update. Apply rewrites the same columns in place and keeps the provider's uuid, which the stored key's encryption context is bound to.
- \`apiKey\` is a secret. The client resolves it (\`env\` or \`file\`) on its own machine and sends it once. It is encrypted with the BYOK KMS key, never read back into a spec, exported or hashed. An export writes an \`apiKey.env\` placeholder, and a plan shows the key as changed only when the value you supply differs from the stored one.
- Deleting the object revokes the vault entries filed against the slug first, as deleting the provider in the console does.
- An [\`AiFirewallPolicy\`](/platform-iac/kinds/ai-firewall-policy/) that names the provider is applied after it.`,
  },

  JailPolicy: {
    sources: ['vdb-site/api/internal/config/jail.go', 'vdb-api/internal/handler/jail_when.go'],
    after: `## How apply treats it

- A policy is addressed by \`metadata.name\`. The header fields merge: a field the document leaves out keeps its value.
- \`spec.repository\` is the scope, so leaving it out means the tenant default.
- \`spec.rules\`, when present, is the whole ordered list. Rules are matched to stored rules by \`label\` and updated in place, which keeps each rule's id (exemptions and the assessment history cite it). A label the document drops is deleted, and renaming a label is a delete and a create. Labels must be unique within a policy.
- Plan runs the console's policy and rule validators, so a policy the console refuses cannot be applied as code. A \`when\` that does not compile is reported with its rule and position.`,
    cel: `Jail evaluates \`when\` over the facts it already holds, and those do not carry every \`finding\` variable. A rule whose \`when\` names a variable its kind does not fill in is skipped with a warning when the jail gate runs, rather than counting against a zero value:

${jailTable()}

> [!CAREFUL] \`epss\` is not available to jail rules
> The \`org-default.yaml\` example below, and the \`when\` in the Advanced one, use \`epss >= 0.1\` on a \`VULN\` rule. It type-checks, so plan accepts it, but jail facts have no EPSS, so the jail gate skips that rule with a warning. Where each expression runs, and what happens when it cannot: [CEL rule expressions](/platform-iac/reference/cel/#where-each-expression-is-evaluated).`,
  },

  JailExemption: {
    sources: ['vdb-site/api/internal/config/jail.go', 'vdb-site/api/internal/config/names.go'],
    after: `## How apply treats it

- An exemption is a record of a decision, so apply never edits one. A changed document retires the old exemption and creates a new one; removing the document retires it. The retired row keeps what was waived, by whom and why. \`approvedBy\` is the principal applying.
- The objects of this kind are the tenant's active exemptions. The table has no name column, so \`metadata.name\` is kept on the ownership record. An exemption made in the console gets a name derived from its fields, so export can address it and applying that document adopts it.
- Applied after the [\`JailPolicy\`](/platform-iac/kinds/jail-policy/) it waives.`,
  },

  LicensePolicy: {
    sources: ['vdb-site/api/internal/config/licensepolicy.go', 'cli/cmd/license.go'],
    after: `## Where it takes effect

The server does not store this kind. \`vulnetix license\` and \`vulnetix scan --evaluate-licenses\` read the repository file \`.vulnetix/license-policy.yaml\` on the machine running the scan. The engine registers the kind only so that validate and plan check a document against the schema: a plan that includes one shows the warning \`not_stored\` instead of refusing the set as an unknown kind. Commit the policy to \`.vulnetix/license-policy.yaml\` in each repository.`,
  },

  MalwareIoc: {
    sources: ['vdb-site/api/internal/config/malwareioc.go', 'vdb-site/api/internal/config/names.go'],
    after: `## How apply treats it

- Only indicators the tenant manages are read or written. Scanner-found indicators, feed indicators and the global curation verdicts are never touched.
- Every apply writes the malware curation audit, as a console edit does.
- A tenant has one managed indicator per type and value. A document for a pair the console already created adopts that row.
- The spec is replaced whole: leaving \`ecosystem\` out clears it.
- The table has no name column, so \`metadata.name\` is kept on the ownership record, and an indicator made in the console exports under a name derived from its fields.`,
  },

  PackageFirewallPolicy: {
    sources: ['vdb-site/api/internal/config/pkgfirewall.go'],
    after: `## How apply treats it

- Scalars merge: a field the document leaves out keeps its value, as the console's save does.
- \`ecosystems\` and \`mirrors\`, when present, are the whole set. An ecosystem the document does not name inherits \`mode\` again, and a mirror it does not name is removed.
- Mirrors are matched by ecosystem and URL, so a priority change updates that mirror and keeps its crawl position.
- The allow and deny lists are [\`PackageList\`](/platform-iac/kinds/package-list/) objects, applied after this one.`,
  },

  PackageList: {
    sources: ['vdb-site/api/internal/config/packagelist.go', 'vdb-site/api/internal/config/purl.go'],
    after: `## How apply treats it

- A \`PackageList\` owns only the entries it declares. Entries made in the console, and entries another \`PackageList\` declares, are never changed or pruned by it.
- Entries are compared one by one, keyed by ecosystem, package name and version as the purl maps to them.
- Every write appends a package firewall list audit row in the same transaction, with the same actions the console records (create, update, move, activate, delete). The actor is the applying principal and the manager.
- Applied after the [\`PackageFirewallPolicy\`](/platform-iac/kinds/package-firewall-policy/).`,
  },

  VexSource: {
    sources: ['vdb-site/api/internal/config/vexsource.go', 'vdb-site/api/internal/vexsource/spec.go'],
    intro: 'How sources are fetched, how statements become suppressions and how a `path` source is uploaded are on [VEX documents as suppression rules](/platform-iac/guides/vex-sources/). The Advanced sample applies as written. The fields the schema accepts but plan blocks are listed under [what plan refuses](#what-plan-refuses-today), and the schema release carries them in `examples/VexSource/unsupported-features.yaml`.',
    after: `## What plan refuses today

The schema accepts these, and plan blocks them with the condition \`unsupported\`:

| Field | Why |
|---|---|
| \`spec.trust.requireSignature: true\` | The server does not verify signatures on fetched VEX documents. Narrow trust with \`trust.allowedAuthors\` instead. |
| \`spec.scope.products\` | Findings do not record the TEA product they belong to, so the scope could not be enforced. Use \`scope.repos\`. |
| \`spec.s3.endpoint\` | An S3-compatible store is not supported yet. Use \`roleArn\` on AWS. |

A \`path\` source plans with the warning \`cli_only\`: the server never fetches it. The guide has [the rest](/platform-iac/guides/vex-sources/).`,
  },

  LicenseExceptions: {
    sources: ['cli/internal/platformiac/discover.go', 'cli/internal/license/exceptions.go', 'cli/docs/platform-iac.md', 'vdb-site/api/internal/config/licenseexceptions.go'],
    intro:
      '`blanket` exceptions are checked first and the first unexpired match wins; `packages` are checked after them. See [Licence policy](/sca/license/policy/) and [Licence evaluation](/sca/license/license/).',
    after: `## Two forms

Both are valid, and a document is exactly one of them.

| Form | Where | Shape |
|---|---|---|
| Repository file | \`.vulnetix/license-exceptions.yaml\` | \`blanket\` and \`packages\` at the top level. \`metadata\` is optional. |
| Config | A document under \`.vulnetix/config\` | \`metadata\` and \`spec\` are required, and \`blanket\` and \`packages\` sit under \`spec\` |

The fields in the table are the same in both. A licence file written before documents carried \`apiVersion\` and \`kind\` is read as this kind from its well-known path, so an older repository keeps working. \`vulnetix license\` and \`vulnetix scan --evaluate-licenses\` read the file, or the document under \`.vulnetix/config\`, unless \`--exceptions-file\` names one. Defining it in both places, or twice, is an error. See [Which files are Platform IaC documents](/platform-iac/cli/validate/#which-files-are-platform-iac-documents). In GitHub Actions the [license action](/sca/github-actions/license/) reads the same files.

\`\`\`yaml
# The repository file form, .vulnetix/license-exceptions.yaml
apiVersion: vulnetix.com/v1
kind: LicenseExceptions
blanket:
  - license: EPL-2.0
    reason: Eclipse libraries are used unmodified as build-time dependencies.
packages:
  - purl: pkg:npm/%40acme/internal-fonts
    reason: Proprietary fonts licensed to ACME under contract C-2291.
\`\`\`

## Where it takes effect

Like [\`LicensePolicy\`](/platform-iac/kinds/license-policy/), the server stores nothing for this kind. The engine registers it so that validate and plan check a document, and a plan that includes one shows the warning \`not_stored\`. The CLI reads the repository file on the machine running the scan.`,
  },

  RiskStrategy: {
    sources: ['vdb-site/api/internal/config/riskstrategy.go', 'vdb-site/api/internal/handler/risk_cel.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- Rules are diffed per item, so an unchanged rule keeps its row. The rules are stored in \`RiskPrioritizationRule\`.
- \`spec.active: true\` moves the one active strategy to this one and deactivates the others.
- A rule with \`when\` is stored with metric \`CEL\` and the expression in \`RiskPrioritizationRule.expr\`.
- The expression is type-checked at plan. It is evaluated by the ranking ladder; see [where each \`when\` runs](/platform-iac/reference/cel/#where-each-expression-is-evaluated).`,
  },

  RemediationPolicy: {
    sources: ['vdb-site/api/internal/config/remediationpolicy.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

A named standard links the published policy row. Custom windows save a new row and move the \`OrgTriagePolicy\` pointer, so the object keeps its name and older rows stay as the snapshots that cite them saw them.`,
  },

  Suppression: {
    sources: ['vdb-site/api/internal/config/suppression.go', 'vdb-site/api/internal/handler/risk_cel.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- The justification (the OpenVEX vocabulary), the expiry and \`when\` (stored as \`expr\`) are stored on the suppression.
- A rule owned by a VEX document or by a [\`VexSource\`](/platform-iac/kinds/vex-source/) cannot be changed or deleted through the engine.
- \`when\` is evaluated by the suppression engine, after the rule's anchors have matched; see [where each \`when\` runs](/platform-iac/reference/cel/#where-each-expression-is-evaluated).`,
  },

  SsvcPolicy: {
    sources: ['vdb-site/api/internal/config/ssvcpolicy.go', 'vdb-site/api/internal/handler/ssvc.go', 'vdb-site/docs/ssvc.md', 'config-schemas/ssvc/policy.go', 'config-schemas/ssvc/ssvc.go'],
    after: `## How the decision is made

Vulnetix makes the [CISA SSVC](https://www.cisa.gov/stakeholder-specific-vulnerability-categorization-ssvc) decision, Track, Track*, Attend or Act, for a finding from four decision points. The decision table is the CISA Coordinator table 2.0.3 (CERT/CC) and is fixed. This kind configures how Vulnetix's signals become the four values, which table cells the organization reads differently, which findings it decides by rule, and what each outcome asks of it.

| Decision point | Values | Default |
|---|---|---|
| Exploitation | none, poc, active | active: \`kev \\|\\| exploitMaturity in ['active', 'weaponized']\`. poc: \`exploitMaturity == 'poc' \\|\\| exploitCount > 0\`. Active wins over poc. |
| Automatable | no, yes | \`cvss >= 9.0 \\|\\| epss >= 0.7\` |
| Technical impact | partial, total | total: \`cvss >= 9.0 \\|\\| malicious\` |
| Mission and well-being | low, medium, high | The repository's criticality: low, medium, high, and critical (high). A repository with no criticality is medium. |

The expressions are CEL over the \`finding\` context, so a policy can use any finding variable, including the repository's \`labels\`, \`owner\` and \`criticality\`. The defaults approximate CISA's definitions from the signals Vulnetix holds. Automatable in particular is defined by the kill chain, and the finding context carries no CVSS vector, so the default reads a critical score or a high EPSS as automatable. A tenant that holds better information tightens the expression. \`mapping[]\` reads cells of the table differently for the whole tenant (the last matching rule wins), \`overrides[]\` decides by rule after the table and the mapping (the first match wins, and the decision records which rule set it), and \`outcomes\` sets each outcome's priority and \`dueDays\` (0 is the standard update cycle).

## How apply treats it

- A singleton, named \`default\`. The engine stores only what differs from the default policy, so a document that spells a default reads back without it.
- Plan compiles every expression against the \`finding\` context and refuses unknown values. A stored policy that no longer compiles is not applied: the tenant decides with the default and the routes report a \`warning\`.
- Delete deletes the row, which returns the tenant to the default policy.
- It needs saas migration \`20261228010000_ssvc_policy\`. Until it runs, a tenant decides with the default policy, and a write or an apply is refused naming the migration.
- Decisions are made when they are read, from the same facts as the risk ranking, with the repository's asset record. Nothing is stored per finding, so a policy change shows at once. The routes are \`GET\`, \`PUT\` and \`DELETE /v1/ssvc/policy\`, \`POST /v1/ssvc/decide\` and \`GET /v1/ssvc/summary\`.

## In the CLI scan and the remediation plan

The VDB API decides with this policy in two more places: the CLI's SCA response (\`POST /v2/cli/sca\`, the \`vulnetix:ssvc\` property of each vulnerability) and the remediation plan (\`GET /v2/vuln/{id}/remediation-plan\`, \`response.ssvc\`, which takes an optional \`?repo=owner/name\`). Mission and well-being come from the repository's criticality, and a repository with no asset record is decided as medium.\n\nThe policy applies only when the tenant has stored one. With no stored policy, the community credential, a database without the \`SsvcPolicy\` table, or a stored policy that no longer compiles, both keep the decision they made before policies existed, which is simpler and ignores criticality. A decision made under a policy adds \`vulnetix:ssvc:priority\`, \`:source\`, \`:exploitation\`, \`:automatable\`, \`:technicalImpact\`, \`:missionWellBeing\`, and \`:rule\` and \`:dueDays\` when they apply, to a scanned vulnerability, and \`policy\`, \`missionWellBeing\`, \`source\`, \`rule\` and \`dueDays\` to the plan's \`ssvc\` block. The fields that existed keep their meaning.`,
  },

  ApiSpecSource: {
    sources: ['vdb-site/api/internal/config/apispecsource.go'],
    after: `## How apply treats it

A tenant declares many sources, each named. A source is small and wholly declared, so apply overwrites the whole row from the document: a field the document leaves out goes back to its default. Rows made this way are marked as managed by config, and the console shows them read only.`,
  },

  AwsConnection: {
    sources: ['vdb-site/api/internal/config/cloud.go', 'vdb-site/api/internal/handler/config_cloud_store.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Every write goes through the AWS drawer's own steps inside the apply transaction. Calls to AWS, KMS and the secrets vault are not transactional: a rolled-back apply can leave an unused OIDC client or a vault version nothing references.

- **\`sso\`.** Apply starts an IAM Identity Center device authorization when the connection is new or its \`startUrl\`, \`region\` or connector changed, and not otherwise. The object's status carries \`phase: AwaitingAuthorization\`, \`authorizationUrl\` and \`userCode\`. The instance that started it polls the device code until the operator approves (\`Authorized\`) or the code expires (\`AuthorizationRequired\`, after which the drawer or a new apply starts again). The pending sign-in is held in memory, so another instance reports \`AuthorizationRequired\` until the token lands.
- **\`iamUser\`.** Apply proves the key with \`sts:GetCallerIdentity\` and stores it when the key id is new or a different secret arrives. A new key id without its resolved secret is refused. \`secretAccessKey\` is write-only, compared by decrypting the stored key, and exported as \`{env: ...}\`.
- \`advancedNetworking\` is set on the connection and on every account, as the drawer does.
- Delete removes the row like the drawer's forced disconnect and warns that the CloudFormation stacks stay in each account.`,
  },

  AwsAccount: {
    sources: ['vdb-site/api/internal/config/cloud.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- Names live in \`ConfigManagedObject\`. An account nobody declared exports as \`aws-<id>-<hash>\`.
- \`accountId\` cannot change under a name, and one account has one name.
- \`accountName\` is compared only while the account has none, because AWS's alias replaces it.
- \`deploy: true\` queues the account's stacks when apply creates or changes it. It is never read back.
- Delete stops the sweep and warns that the stacks and findings stay.`,
  },

  CloudSensors: {
    sources: ['vdb-site/api/internal/config/cloud.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- \`account: "*"\` is the choice for every account. An account id is an override for that account, which then reads exactly its own sources.
- Only the sources in the schema are written, and only rows whose state changes.
- \`deploy: true\` queues the stacks of the accounts the document covers (\`"*"\`: every enabled account without an override).
- Deleting an override sends the account back to \`"*"\`. Deleting \`"*"\` turns every source off.
- A per-account document needs saas migration \`20261226020000_cloud_native_source_per_account\`. Until it runs, plan blocks the document with the migration's name, and \`"*"\` works as before.`,
  },

  SavedSearch: {
    sources: ['vdb-site/api/internal/config/siem_search.go', 'vdb-site/api/internal/config/guardian.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Written in Guardian, in the second phase; see [SIEM kinds](${ENGINE_PAGE}#siem-kinds-written-in-guardian). Everything can change in place. Guardian refuses to delete a search that an [\`AlertTrigger\`](/platform-iac/kinds/alert-trigger/) or a [\`ScheduledReport\`](/platform-iac/kinds/scheduled-report/) still uses.`,
  },

  DetectionRule: {
    sources: ['vdb-site/api/internal/config/siem_rule.go', 'vdb-site/api/internal/config/guardian.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Written in Guardian, in the second phase; see [SIEM kinds](${ENGINE_PAGE}#siem-kinds-written-in-guardian).

- Levers, threshold, target, suppressions, level, display name and a Sigma \`body\` change in place.
- The source (\`searchRef\`, \`countermeasure\`, \`sigmahq\`, \`ioc\`, or a body versus another form) cannot move. The plan blocks it: declare the new rule under a new name.
- \`sigmahq\` is resolved by path through Guardian's catalogue.
- \`file\` is refused, because the server never reads a path. Send the text as \`body\`.
- A \`dsl\` body is refused, because Guardian keeps a DSL rule only as a copy of a saved search. Use \`searchRef\`.
- A rule Guardian cannot compile stays off whatever \`enabled\` says, so \`enabled\` is not a change for it and the plan warns with the compile error.
- \`displayName\` and \`level\` default to Guardian's choice, so they are compared only when the document sets them.`,
  },

  AlertTrigger: {
    sources: ['vdb-site/api/internal/config/siem_trigger.go', 'vdb-site/api/internal/config/guardian.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Written in Guardian, in the second phase; see [SIEM kinds](${ENGINE_PAGE}#siem-kinds-written-in-guardian). Everything can change in place, including the source.`,
  },

  ScheduledReport: {
    sources: ['vdb-site/api/internal/config/siem_trigger.go', 'vdb-site/api/internal/config/guardian.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Written in Guardian, in the second phase; see [SIEM kinds](${ENGINE_PAGE}#siem-kinds-written-in-guardian). Everything changes in place except \`searchRef\`: Guardian cannot point a send at another search, so a \`searchRef\` change creates the new send and then removes the old one.`,
  },

  LogSource: {
    sources: ['vdb-site/api/internal/config/siem_source.go', 'vdb-site/api/internal/config/guardian.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Written in Guardian, in the second phase; see [SIEM kinds](${ENGINE_PAGE}#siem-kinds-written-in-guardian).

- Only \`label\` changes in place. Any other change blocks, because Guardian edits Logpush jobs only with the Cloudflare token, which it does not keep.
- Create returns the aws or events ingest token once, as \`status.ingestToken\` in the apply result, and never again.
- Cloudflare's \`apiToken\` (\`valueFrom\`) is used for the create call only and is never compared or exported.
- Delete revokes the ingest token. A cloudflare source's Logpush jobs stay in Cloudflare until removed there, and the plan warns.
- \`label\` and \`zoneIds\` are compared only when the document sets them.`,
  },

  DetectionRuleFeed: {
    sources: ['vdb-site/api/internal/config/detectionrulefeed.go', 'vdb-site/api/internal/handler/detection_rule_feeds_selector.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- The feed's own \`name\` is its display name and is not unique, so \`metadata.name\` lives in \`ConfigManagedObject\`. A feed nobody declared exports under a name derived from its own.
- The spec is replaced whole. Entries are a set keyed by rule table, rule type and rule, each checked to exist and to fit the format, as the console's add does.
- \`publish: true\` publishes on every apply that changes the feed. \`publish: false\` revokes a published feed. Publishing writes S3 from inside the apply transaction, after the feed's rows: a later failure in the same apply rolls the rows back but not the files, and the next publish or revoke of that feed replaces them.
- The plan gate and the per-type feed cap are the console's.
- \`selector.when\` is stored in \`DetectionRuleFeed.selector\` and evaluated at every publish; see [where each \`when\` runs](/platform-iac/reference/cel/#where-each-expression-is-evaluated). It needs saas migration \`20261226010000_detection_rule_feed_selector\`. Until it runs, plan refuses a document with a selector and names the migration.
- A \`SNORT_YARA\` feed takes entries only: the third-party catalogue has no CVE data, so plan refuses a selector on one.`,
  },

  RuntimeSensorPolicy: {
    sources: ['vdb-site/api/internal/config/runtimesensorpolicy.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- This is a [provisioning profile](/virtual-patching/sensor/provisioning-profiles/) as code. \`metadata.name\` is the profile name.
- The console's normalisation and feed reference checks run on every document, so a document is refused where the provisioning form is.
- \`feeds\` items are one of: \`feedRef\` (a [\`DetectionRuleFeed\`](/platform-iac/kinds/detection-rule-feed/), stored as its \`https://vulnetix.com/feeds/<org>/<feed>\` URL, which must be published when the policy is applied; a feed in the same apply is published first), \`sensorFeed\` (an indicator feed, stored as \`org:<uuid>\`), or an https URL (a published Vulnetix rule feed or a catalogue feed, stored as \`catalog:<id>\`). Read renders each stored reference back in that order. Left out, \`feeds\` are the catalogue defaults, as for a console-created profile.
- A profile with enrolled, unrevoked devices cannot be deleted or pruned. Plan blocks it and names the count.`,
  },

  Organization: {
    sources: ['vdb-site/api/internal/config/organization.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- \`driftProtection\` is the [Drift protection](/platform-iac/guides/drift-protection/) switch. It always reads back (\`false\` before the server's migration), \`true\` is refused until that migration is applied, and the setting is never refused by Drift protection itself, so an owner or admin can always turn it off. Turning it on makes the console and the legacy APIs answer \`409 managed_by_platform_iac\` to a write to a managed kind.
- A singleton that merges: a field left out is left as it is.
- Domains are written with the account page's writer on the tenant row. Before the column's migration they read as absent and a write is refused.
- The display name is patched on the Authentik group \`org-<slug>\` (attribute \`display_name\`). That write registers an undo that puts the old name back when the apply does not commit.
- Owner or admin only. Delete lets go: the tenant is never deleted.

> [!CAREFUL] Per principal or per tenant
> \`companyEmailDomain\` is per principal on the account page, while the factory delivery sweep reads the tenant row. The engine writes the tenant row. In a single-person organization they are the same row.`,
  },

  Member: {
    sources: ['vdb-site/api/internal/config/member.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- Applies the members page's writers and its role rules (\`internal/orgroles\`). A new member is an invitation: the status phase is \`Pending\` with \`invitationExpires\` until it is accepted. A role change on an invitation revokes and re-invites.
- The member's email is the object's identity. An undeclared member exports under a name derived from the email, and a document for an existing email adopts that person (plan warns).
- Plan blocks: a caller below admin, granting owner as an admin, granting admin, an email change, two documents for one email, and any plan that leaves no owner. Apply refuses removing the person applying.
- Every Authentik write registers its undo for an apply that does not commit.
- Delete revokes the invitation, or deactivates the principal (kept for the access log) and strips its groups.`,
  },

  ServiceAccount: {
    sources: ['vdb-site/api/internal/config/serviceaccount.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- The spec is empty. The account is always a member.
- Apply returns \`status.principal\`, \`status.apiKey\` and \`status.secret\` once. Plan, export and later applies never show them. Store them as the apply returns them.
- A name that belonged to a deleted account is refused, active or not.
- A create that rolls back deletes the Authentik user it made. A deactivation that rolls back reactivates it.
- Delete deactivates. Secret rotation is not declarable yet: the console's rotate endpoint stays the way to rotate.
- Owner or admin only. A token for this kind needs the owner role.`,
  },

  NotificationDefaults: {
    sources: ['vdb-site/api/internal/config/notificationdefaults.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- A singleton that replaces: written through the same function as the tenant defaults form, so each change is a factory setting event and an audit entry. Validated like the form.
- Delete removes the setting, so the catalogue defaults apply.
- It does not include the \`notify.events\` preset, which is a [\`FactorySettings\`](/platform-iac/kinds/factory-settings/) field. \`FactorySettings\` must not also manage \`notify.push.defaults\`, or the two kinds would fight over it.`,
  },

  VaultEntry: {
    sources: ['vdb-site/api/internal/config/vaultentry.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- The vault lives wholly outside Postgres, so this kind is written in the second phase. After the Postgres transaction commits, each entry is a compare-and-swap of the record inside a small transaction that records its ownership. Its undo puts the entry back (also a compare-and-swap, refused if someone changed it since) when that cannot be recorded.
- A failed entry is reported with phase \`Failed\` and owns nothing.
- The value is a \`valueFrom\` secret, required to create, never read back, exported or shown in a plan. The same value again is no change.
- The vault service checks the document, so it is refused for the reasons the vault page refuses it.
- The entry keeps the \`metadata.name\` it was applied under. An undeclared entry is listed under a name derived from its id, type and provider or variable. The type cannot change.
- Delete revokes the entry, keeping the stub and history. AI firewall and sandbox derives run after the write, in the background, one at a time per tenant.
- Owner only: a token for this kind needs the owner role.`,
  },

  GitHubInstallation: {
    sources: ['vdb-site/api/internal/config/githubinstallation.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Adopt only, by \`spec.installationId\`. The Vulnetix GitHub App is installed on GitHub, not by this kind. Plan blocks an installation the tenant does not have, and names the App's install URL. Status reports the account and repository selection, read only. Delete lets go and never uninstalls the App.`,
  },

  ForgeConnection: {
    sources: ['vdb-site/api/internal/config/forgeconnection.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

The console's create and update writers, now transaction scoped. A bot token or a GitHub Enterprise Server App key is a \`valueFrom\` secret, kept as the console keeps it. GitHub.com is refused: use [\`GitHubInstallation\`](/platform-iac/kinds/github-installation/).`,
  },

  RegistryConnection: {
    sources: ['vdb-site/api/internal/config/registryconnection.go', 'vdb-site/api/internal/handler/config_scanregistry_store.go', 'vdb-site/api/internal/handler/scan_registries.go', 'vdb-site/api/internal/scanregistry/scanregistry.go', 'vdb-site/docs/scan-registries.md', 'saas/prisma/migrations/20261228020000_scan_registry_connection/migration.sql'],
    after: `## How apply treats it

- A connection is a \`ScanRegistryConnection\` row, unique by \`metadata.name\`. It is not the Integrations page's paid container registry login, which the crawler uses.
- The credential is \`spec.secret\`, a \`valueFrom\` the client reads and sends once. It is stored in the secrets vault as a connector entry and referenced from the row, never kept in the table, exported or shown in a plan. Left out on a later apply, the stored credential is kept.
- A new or changed credential, URL or username is checked with the registry first, and a login the registry refuses is stored by neither the console nor the engine. The check is made with a client that dials public addresses only.
- The URL and scope read back canonical: an OCI host lower-cased, the other registries \`https\` with a lower-case host and a trailing slash, the scope sorted without repeats.
- Each vault write registers its undo: a created entry is revoked, a rotated one is put back, a deleted one is restored. Deleting the document revokes the credential.
- It needs the registry credentials plan feature and saas migration \`20261228020000_scan_registry_connection\`. Until it runs, plan refuses a document, naming the migration.

## How a scan uses it

The connection chosen for a host and a package or repository is an enabled one whose scope serves the name, the most specific scope first. Two consumers read it. The manifest curator sends the organization's own npm, PyPI and Maven connections to the lock runner with each job, only those matching the job's dependencies plus at most one unscoped default, never to Poetry or pip-tools, and needs the registry credentials plan feature; a login that cannot be opened fails the job instead of running anonymously, and it is never stored in the plan or the result. The runner takes them only when its operator enabled it. \`vulnetix image\` asks for a short-lived pull token for one repository (CLI releases after v4.5.0), which needs an owner, admin or member and the plan feature, and falls back to \`docker login\` for a registry with no token service or a bearer-secret connection. Every vault read is recorded in the vault activity log. Dependency fetches by the SCA processors are not wired to it yet. The behaviour, the limits and what has not been verified against a real registry are in the [private registries guide](/organization/integrations/private-registries/#how-a-scan-uses-a-connection).`,
  },

  ComplianceTarget: {
    sources: ['vdb-site/api/internal/config/compliancetarget.go', 'vdb-site/api/internal/compliancetarget/compliancetarget.go', 'vdb-site/api/internal/handler/compliance_targets.go', 'vdb-site/api/internal/handler/compliance_report_create.go', 'vdb-site/docs/compliance-targets.md', 'saas/prisma/migrations/20261228040000_compliance_target/migration.sql'],
    after: `## How apply treats it

- A report framework (\`eu_ai_act\`, \`nist_ai_rmf\`, \`iso_42001\`, \`owasp_top_10\`, \`pci_dss\`, \`coverage\`, \`exposure\`, \`eu_cra\`, \`iso_27001\`, \`owasp_dsomm\`) creates a compliance report on each run, through the code a report made by hand uses, scoped to \`scope.repositories\`. The OSCAL export and the evidence are unchanged.
- \`slsa\`, \`ssdf\` and \`crypto-policy\` make no report: each run stores an evaluation with its checks, and the history is kept.
- The spec reads back with \`cadence\` and \`enabled\` written and the blocks of other frameworks absent, the repositories lower-cased and sorted.
- A new target is due at once. Each run schedules the next one cadence later, a failed run is tried again in an hour, and a changed cadence moves the next run. Delete removes the target and its runs and keeps the reports it created.
- It needs the compliance reports plan feature and saas migration \`20261228040000_compliance_target\`. Until it runs, plan refuses a document, naming the migration, and nothing runs.

## The evaluations

- **slsa.** Level 1 asks for build provenance; level 2 adds verified provenance and signed published artifacts; level 3 adds witnessed signatures and verified attestations. Each level also checks the Software Factory's \`security.slsa_min\`. A pass means the evidence a hardened build platform leaves is there, since Vulnetix cannot inspect the platform.
- **ssdf.** Fourteen NIST SP 800-218 practices Vulnetix holds evidence for, in the groups PO, PS, PW and RV. A practice with no evidence is not counted. \`minMet\` is the percentage of counted practices that must be met. It is not a conformance claim.
- **crypto-policy.** \`crypto.allow\` is evaluated for each component of the newest CBOM of each repository in scope that \`crypto.appliesTo\` selects. A component it is false for, or cannot be evaluated for, is a violation, so the policy fails closed. A run with nothing to judge is \`unknown\`.`,
  },

  WizConnection: {
    sources: ['vdb-site/api/internal/config/wizconnection.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

One per tenant. The console only creates and deletes a Wiz connection, so a change replaces it through those writers. The client secret is a \`valueFrom\` secret.`,
  },

  MessagingConnection: {
    sources: ['vdb-site/api/internal/config/messagingconnection.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- Created, updated and deleted through the messaging centre's writers, now transaction scoped. The URL and the Jira token are \`valueFrom\` secrets kept in the vault as the console keeps them. Each vault write registers its undo.
- A Slack connection is created paused with no credential and reports \`AwaitingAuthorization\` with the install URL until someone authorizes it in a browser.
- A webhook's signing secret is shown once, in the apply that creates it.
- The type cannot change. Names live in \`ConfigManagedObject\`.`,
  },

  MessagingRoute: {
    sources: ['vdb-site/api/internal/config/messagingroute.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Connections are referenced by the \`metadata.name\` of a [\`MessagingConnection\`](/platform-iac/kinds/messaging-connection/). Plan blocks a connection the tenant does not have.`,
  },

  MessagingTemplate: {
    sources: ['vdb-site/api/internal/config/messagingtemplate.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

The template is compiled at plan with the messaging centre's template compiler, so an error shows before anything is written. Every change saves a new version.`,
  },

  FactorySettings: {
    sources: ['vdb-site/api/internal/config/factorysettings.go', 'vdb-site/api/internal/handler/factory_settings_code.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- A singleton. Every writable key of the factory settings table is a nested field (\`autonomy.max\` is \`spec.autonomy.max\`), except the keys other kinds own and the read-only keys (\`forge.polling.forbidden\`, \`firewall_enabled\`, \`systemone.min_confidence.adapter\`).
- Replace semantics: a field left out is the default. Read returns only the settings that differ from the default, so exports are compact.
- Validation is the console's key table. Plan runs the read-only cross-key rules, including the \`forge.check_runs\` permission.
- Apply writes through the same function as the settings page: a revision bump, the write-through hooks such as the tenant Factory budget, and one setting event and audit entry per changed key. The status reports \`revision\`.
- Delete resets its keys to the defaults. The document stays.

### Which kind owns which key

[\`ScannerProfile\`](/platform-iac/kinds/scanner-profile/) owns the four \`security.*\` scanner keys, [\`FactoryManagedOrg\`](/platform-iac/kinds/factory-managed-org/) owns \`scope.orgs\`, [\`NotificationDefaults\`](/platform-iac/kinds/notification-defaults/) owns \`notify.push.defaults\`, and \`FactorySettings\` owns the rest. A \`FactorySettings\` apply never writes a key it does not own, so the kinds cannot undo each other.

> [!CAREFUL] Not everything the console does after a save happens
> The post-commit nudges the console save sends (seeding the default workflows when \`defaults.enabled\` changes, engine state and budget nudges, and the work after managing an organization) are not sent after an engine apply. The scheduler and the next event pick the changes up.

### Export and import of the settings page

\`GET /v1/factory/settings?format=yaml|hcl|sh\` renders the \`FactorySettings\`, \`ScannerProfile\` and \`FactoryManagedOrg\` documents with the engine's export. \`PUT /v1/factory/settings\` with \`Content-Type: application/yaml\` takes either these documents or the old flat export (read-only keys dropped, \`github.*\` renamed, the \`scope.orgs\` list turned into \`FactoryManagedOrg\` documents), then plans and applies them as manager \`console\`. \`?dryRun=true\` returns the plan.`,
  },

  ScannerProfile: {
    sources: ['vdb-site/api/internal/config/factorysettings.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

A singleton over the factory settings keys \`security.scanners\`, \`security.scanners.custom\`, \`security.slsa_min\` and \`security.evidence\`, all filled with defaults on read. It uses the same writer as [\`FactorySettings\`](/platform-iac/kinds/factory-settings/), and the two kinds own disjoint keys. Delete resets the four keys.`,
  },

  FactoryManagedOrg: {
    sources: ['vdb-site/api/internal/config/factorymanagedorg.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- \`metadata.name\` is derived from \`spec.account\` (lower case, runs of other characters become one hyphen). A document whose name is not derived from its account is refused, because read finds the row by it.
- \`spec.account\` is the login (\`host/account\` for a forge connection), lower-cased. Plan needs the account to be connected and active.
- Apply writes the row, \`scope.orgs\` in the settings document, and a setting event. The status reports the installation id, account type, repository selection, repository count and installation status. Which repositories the GitHub App reaches stays on GitHub and is read only here.
- Delete switches management off. The row is kept.`,
  },

  RepositorySettings: {
    sources: ['vdb-site/api/internal/config/repositorysettings.go', 'vdb-site/api/internal/config/repoasset.go', 'vdb-site/docs/repository-assets.md', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- \`metadata.name\` is derived from \`spec.repository\`, as for [\`FactoryManagedOrg\`](/platform-iac/kinds/factory-managed-org/), and a name that does not match is refused.
- \`autonomy\` is required. Other fields default.
- Plan refuses a repository the factory does not see, an \`autonomy\` above \`autonomy.max\`, and \`protectedBranches: false\` from a caller who is not an owner or admin.
- Apply also writes the repository's token cap budget row for \`monthlyTokenCap\` and the Kanban binding mode.
- Delete marks the row deleted, so the repository runs at \`autonomy.default\`. It removes the cap budget, clears the asset record and records an audit entry.

### Asset labels, owner and criticality

\`labels\`, \`owner\` and \`criticality\` are the repository's asset record: how the business sees it. A document owns them, so a field left out clears it. They are also set on the Repositories page, and rules select on them: they are variables of the CEL \`finding\` context, so the same finding can be urgent in one repository and routine in another; see [where each expression is evaluated](/platform-iac/reference/cel/#where-each-expression-is-evaluated). The record is stored apart from the factory settings row, so classifying a repository never creates one.

- At most 50 labels. A key is lower case letters, digits and \`. _ / -\`, at most 63 characters, starting and ending with a letter or digit. A value is at most 256 characters.
- An owner has a kind (\`team\`, \`user\`, \`email\`) and a name of at most 320 characters. An email owner must be a bare address and is stored lower case.
- They need saas migration \`20261228000000_repository_asset\`. Until it is applied they read as empty, and plan refuses a document that sets one and names the migration.`,
  },

  FactoryWorkflow: {
    sources: ['vdb-site/api/internal/config/factoryworkflow.go', 'vdb-site/api/internal/handler/factory_workflow_graph.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- The graph is checked by the console's graph validator.
- A change saves the next version. With \`publish: true\` it also publishes that version through the console's publish, which reconciles the trigger rows and their schedules in the apply transaction. A published version is never edited.
- The trigger nodes that [\`FactoryTrigger\`](/platform-iac/kinds/factory-trigger/) and [\`FactorySchedule\`](/platform-iac/kinds/factory-schedule/) own are left out of the workflow's document, and kept by its graph changes.

### GitOps from a repository

A workflow node, \`config-apply\`, lets a config repository manage the tenant. Trigger it on a \`push\` webhook to the repository's default branch.

- It reads every \`.yaml\` and \`.yml\` file under the node's \`path\` (default \`.vulnetix/config\`) at the pushed commit, through the forge's git API (at most 4 MiB).
- It plans them as manager \`gitops:<owner/repo>\`, with prune on unless the node sets \`prune: false\`. The plan is the step's artifact.
- Blocking conditions fail the step with \`config_plan_blocked\`. No changes: the step succeeds and applies nothing.
- Otherwise, unless \`approval: none\`, the step asks for a person through the gate node's human approval, carrying the plan hash. Approved, it applies with that hash. A plan that moved since fails with \`config_plan_changed\` and applies nothing. Rejected or expired, the step fails.
- External objects that fail in the second phase fail the step with their count. Plan again to see what is left.`,
  },

  FactoryTrigger: {
    sources: ['vdb-site/api/internal/config/factorytrigger.go', 'vdb-site/api/internal/handler/factory_trigger_conditions.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Written as the Schedules tab writes them: the engine edits the workflow's published graph and publishes it. It is checked by the graph validator's trigger rules and by the typed condition checks. It references its [\`FactoryWorkflow\`](/platform-iac/kinds/factory-workflow/) by name.

> [!CAREFUL] Conditions are typed, not CEL
> Trigger conditions are typed fields in the document. The CEL \`event\` context exists in the CEL package, but no released kind has a CEL field in it. See [CEL rule expressions](/platform-iac/reference/cel/).`,
  },

  FactorySchedule: {
    sources: ['vdb-site/api/internal/config/factoryschedule.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

A cron expression and time zone for a [\`FactoryWorkflow\`](/platform-iac/kinds/factory-workflow/), stored as a cron trigger node and written the same way as [\`FactoryTrigger\`](/platform-iac/kinds/factory-trigger/).`,
  },

  FactoryBudget: {
    sources: ['vdb-site/api/internal/config/factorybudget.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Through the budgets API's validator and writers, so a budget declared as code gets the same row, event and audit entry. The tenant's Factory budget belongs to [\`FactorySettings\`](/platform-iac/kinds/factory-settings/) (\`budget.*\`) and a repository's token cap to [\`RepositorySettings\`](/platform-iac/kinds/repository-settings/) (\`monthlyTokenCap\`). Neither is listed here, and a document for a scope and provider that one already covers is refused. Delete soft-deletes the row.`,
  },

  AgentProfile: {
    sources: ['vdb-site/api/internal/config/agentprofile.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- The profile is identified by the id in the definition's front matter, which cannot change under a name.
- The definition is checked by the shared library validator (\`internal/libraryitem\`).
- Apply saves a new version with its files. An unchanged body is no new version.
- Delete hides the profile. Versions and files stay.`,
  },

  Crew: {
    sources: ['vdb-site/api/internal/config/crew.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

The canonical crew JSON is saved as a new version. Display names are unique in the library, and a document for a crew nobody declared adopts it. Members are checked by the host at install. Delete hides the crew.`,
  },

  LibraryItem: {
    sources: ['vdb-site/api/internal/config/libraryitem.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- Every type is checked by the one library validator that the console, the Belai handlers and the engine share.
- The item's type and name, read from its body, cannot change under a \`metadata.name\`.
- Only a hook carries files.
- Apply saves a new version. A version object written by an apply that does not commit is removed.
- Delete hides the item.`,
  },

  SandboxLaunchProfile: {
    sources: ['vdb-site/api/internal/config/sandboxlaunchprofile.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- One per sandbox. The sandbox itself is bought in the console.
- The draft is checked by the launch page's own preparation and validation, and saving it marks the sandbox for relaunch. The egress mode, providers, provisioning and models are left as stored.
- Owner or admin only. Delete resets the managed fields to inherit.`,
  },

  SandboxEgressPolicy: {
    sources: ['vdb-site/api/internal/config/sandboxegresspolicy.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- The mode plus hostname allow and deny lists. A host is a DNS name or a \`*.\` wildcard, never an address.
- A host decided in the console and left out of the document goes back to undecided. A system host cannot be declared.
- Owner or admin only. Delete resets the mode and every decision.`,
  },

  TeaProduct: {
    sources: ['vdb-site/api/internal/config/tea.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Through the publisher API's validators and writers. The uuid is derived from the name as the publisher API derives it, so an object CI already created is adopted. Releases and artifacts stay runtime data that CI publishes: an object with published releases is let go on delete, never deleted. See [TEA](/tea/).`,
  },

  TeaComponent: {
    sources: ['vdb-site/api/internal/config/tea.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

As for [\`TeaProduct\`](/platform-iac/kinds/tea-product/): the uuid is derived from the name, an object CI already created is adopted, and one with published releases is let go on delete, never deleted.`,
  },

  TeaCollection: {
    sources: ['vdb-site/api/internal/config/tea_records.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

This is the collection of a release that CI has published, declared so that a [\`TeaAccessPolicy\`](/platform-iac/kinds/tea-access-policy/) can name it. Plan refuses a release that does not exist.`,
  },

  TeaAccessPolicy: {
    sources: ['vdb-site/api/internal/config/tea_records.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

Set as the publisher API sets it, refusing a policy wider than its parent enforces. Grants are replaced.`,
  },

  TeaPublicationTarget: {
    sources: ['vdb-site/api/internal/config/tea_records.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

The bearer credential is a \`valueFrom\` secret, encrypted under a key bound to the organization and the target.`,
  },

  Campaign: {
    sources: ['vdb-site/api/internal/config/campaign.go', 'vdb-site/docs/platform-iac-engine.md'],
    after: `## How apply treats it

- The console's create, update and archive writers and its scope and done validator. The plan's campaign cap applies.
- Contributors are diffed per item.
- Delete archives the campaign. An archived campaign is not listed.
- Only an active campaign can be re-scoped.
- Names live in \`ConfigManagedObject\`.`,
  },
};
}
