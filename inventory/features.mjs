// features.mjs: the exhaustive list of Software Factory features.
//
// Every atom in inventory/atoms.json (an API route, console page, settings
// key, enum value, CLI flag, TUI command, handler file...) must match at least
// one feature's `match` patterns, and every feature must name the docs page
// that covers it. scripts/inventory-check.mjs enforces both, so a feature that
// lands upstream without docs fails CI here.
//
// Patterns are regular expressions tested against the atom id, which is
// `<kind>:<value>`, for example `route:GET /v1/factory/state`,
// `setting:autonomy.max`, `enum:factoryNodeTypes=gate`, `cli-flag:kanban -json`.
//
// status: todo -> drafted (page written) -> verified (page checked against the
// code at the lock SHA). foundIn: "lock" for the initial pass, or the date a
// feature was added while reading code.

const F = [];
/**
 * @param {string} id
 * @param {string} area
 * @param {string} page   docs page path under src/content/docs/software-factory, without .md
 * @param {string} title
 * @param {string[]} match
 * @param {object} [opt]
 */
function f(id, area, page, title, match, opt = {}) {
  F.push({ id, area, page, title, match, status: 'todo', foundIn: 'lock', ...opt });
}
const r = (path) => `^route:\\w+ /v1/${path}`; // route prefix
const g = (stem) => `^gofile:${stem}$`; // one handler file
const gp = (prefix) => `^gofile:${prefix}`; // handler files by prefix
const e = (set) => `^enum:${set}=`; // a whole enum set
const pkg = (...names) => `^belai-pkg:(${names.join('|')})$`;
const doc = (...names) => `^doc:(${names.join('|')})$`;
const ts = (...names) => `^tsfile:(${names.join('|')})$`;
const con = (...names) => `^console:/resolve/(${names.join('|')})$`;
const cfg = (...files) => `^belai-config:(${files.join('|')})\\.`;
const tui = (...cmds) => `^tui-cmd:/(${cmds.join('|')})$`;
const flags = (set) => `^cli-flag:${set}( [a-z-]+)? +-`; // flag sets may be named "agent " or "crew log"
const sub = (cmd) => `^cli-sub:${cmd} `;
const set = (prefix) => `^setting:${prefix.replace(/\./g, '\\.')}`;

// ── Get started ────────────────────────────────────────────────────────────
f('overview', 'get-started', 'get-started/overview', 'Overview', [doc('vdb-site/factory\\.md', 'website/software-factory\\.md', 'website/software-factory-marketing\\.md')]);
f('access', 'get-started', 'get-started/overview', 'Who can use the factory: plans and Pix Sandboxes', ['^route:GET /v1/factory/access$', g('factory_access'), doc('vdb-site/factory-access\\.md')], { status: 'verified', foundIn: '2026-11-03' });
f('concepts', 'get-started', 'get-started/concepts', 'Concepts', [gp('factory_core_'), g('factory_common'), g('factory_wiring')]);
f('quickstart', 'get-started', 'get-started/quickstart', 'Quickstart: manage an org and run a workflow', []);
f('never-does', 'get-started', 'get-started/what-the-factory-never-does', 'What the factory never does', []);
f('glossary', 'get-started', 'get-started/glossary', 'Glossary', []);
f('forges', 'get-started', 'get-started/forges', 'Supported forges: GitHub, GHES, Gitea, Forgejo and GitLab', [doc('belai/forges\\.md')], { foundIn: '2026-10-28' });
f('architecture', 'get-started', 'get-started/architecture', 'How the pieces fit: console, API, hosts, sandboxes and Belai', [doc('belai/architecture\\.md', 'vdb-site/factory-operations\\.md'), g('belai_client'), g('belai_store')]);

// ── Control ────────────────────────────────────────────────────────────────
f('managed-scope', 'control', 'control/managed-scope', 'Managed orgs and repositories', [r('factory/orgs'), r('factory/repos(/\\{|$| )'), r('factory/repos/bulk'), gp('factory_orgs'), gp('factory_repos'), g('factory_scope'), con('factory-repos'), set('scope.'), '^model:(FactoryManagedOrg|FactoryRepoSettings|FactoryRepoProfile|OrgKnownPackage)$', e('factoryVisibility')]);
f('forge-connections', 'control', 'control/forge-connections', 'Forge connections', [r('integrations/forges'), '^route:POST /v1/webhooks/\\{kind\\}', g('forge_connections'), g('forge_schema'), g('forge_oauth'), g('forge_webhooks'), g('factory_engine_forge'), g('belai_github_forge'), g('pulls_conflicts_forge'), '^gofile:forge/', e('fcSettingAliases'), '^model:(ForgeConnection|ForgeRepoHook|ForgeLabelState|ForgeOAuthIdentity|GitHubCommitStatus)$', doc('vdb-site/forge-connections\\.md', 'website/forge-connections\\.md')], { foundIn: '2026-10-28' });
f('forge-capabilities', 'reference', 'reference/forge-capabilities', 'Forge capabilities', ['^gofile:forgecap/'], { foundIn: '2026-10-28' });
f('repo-profiles', 'control', 'control/repository-profiles', 'Repository profiles', [g('factory_repo_profile')], { foundIn: '2026-10-28' });
f('issue-mirroring', 'control', 'control/issue-mirroring', 'Issue mirroring', [r('factory/repos/mirroring')]);
f('autonomy', 'control', 'control/autonomy', 'Autonomy levels', [set('autonomy.'), '^code:autonomy_above_max$']);
f('kill-switch', 'control', 'control/pause-and-stop', 'Pause, stop and resume', [r('factory/(state|stop|resume)'), g('factory_state'), e('fwPauseFrom'), e('fwCancelFrom')]);
f('holds', 'control', 'control/holds-and-blackouts', 'Holds, maintenance windows and blackouts', [set('schedules.'), '^setting:pix\\.maintenance$']);
f('settings-document', 'control', 'control/settings-document', 'The settings document', [r('factory/settings'), g('factory_settings_store'), con('factory-settings'), '^model:FactorySettings$', '^code:revision_conflict$', '^code:version_conflict$', '^code:workflows_published$']);
f('settings-reference', 'reference', 'reference/settings', 'Settings reference', ['^setting:']);

// ── Workflows ──────────────────────────────────────────────────────────────
f('workflow-graphs', 'workflows', 'workflows/graphs', 'Workflow graphs, versions and publishing', [r('factory/workflows'), gp('factory_workflows'), g('factory_workflow_graph'), con('factory-workflows'), '^model:(FactoryWorkflow|FactoryWorkflowVersion)$', e('factoryNodeTypes'), e('factoryFieldLabels')], { refOnly: ['^enum:factoryFieldLabels='] });
f('builder-palette', 'workflows', 'workflows/builder', 'The workflow builder', [g('factory_palette')]);
f('node-trigger', 'workflows', 'workflows/nodes/trigger', 'Trigger node', [e('factoryTriggerKinds')]);
f('node-scan', 'workflows', 'workflows/nodes/scan', 'Scan node', [g('factory_engine_node_scan'), e('factoryScanSources'), e('factoryFailOn'), e('factorySBOMFormats'), e('factoryNewToScopes'), '^code:new_to_package_only$']);
f('node-decision', 'workflows', 'workflows/nodes/decision', 'Decision node', [g('factory_engine_node_decision'), e('factoryBelowThreshold'), e('factoryOnAbstain'), '^code:(threshold_required|threshold_adapter_missing|invalid_outcome|adapter_unavailable)$']);
f('node-crew', 'workflows', 'workflows/nodes/crew', 'Crew node', [g('factory_engine_node_crew'), g('factory_engine_handoff'), e('factoryCrewModes'), e('factoryShowInternal'), e('factoryRunOnKinds'), e('factoryRunOnFall'), e('factoryTestsOnFail'), e('factoryTestsPostEnd'), '^code:(crew_not_found|runs_on_invalid)$']);
f('node-gate', 'workflows', 'workflows/nodes/gate', 'Gate node', [g('factory_engine_node_gate'), e('factoryGateProfiles'), e('factoryGateOnFail'), e('factoryReleaseJail')]);
f('node-human', 'workflows', 'workflows/nodes/human', 'Human node', [g('factory_engine_node_human'), e('factoryHumanTimeout'), e('factoryApproverKinds'), '^code:(approver_missing|fork_pr_needs_human)$']);
f('node-output', 'workflows', 'workflows/nodes/output', 'Output node', [g('factory_engine_node_output'), g('factory_engine_mail'), e('factoryOutputKinds'), e('factoryAttach'), e('factoryNoBranch'), e('factoryPRStates'), e('factoryTeaWhen'), e('factoryReviewers'), '^code:invalid_base$']);
f('node-state', 'workflows', 'workflows/nodes/state', 'State node', [g('factory_engine_node_common'), e('factoryStateKinds')]);
f('triggers', 'workflows', 'workflows/triggers', 'Triggers and webhook conditions', [gp('factory_trigger'), g('factory_triggers_store'), '^model:FactoryTrigger$', e('factoryConditionKeys'), e('factoryDraftModes'), e('factoryAlertSeverities'), '^webhook-event:', e('factoryConclusions'), e('factoryConclusionEvents'), e('factoryAuthorTypes'), e('factoryReviewStates'), e('factorySeverities'), e('factoryPackageTypes'), e('factoryWebhookRefs'), e('factoryOriginModes'), e('factorySubjectModes'), e('factoryDeployStates'), '^code:(action_conflict|unknown_condition|paths_need_push|invalid_glob|conclusion_unsupported_event|environment_unsupported_event|review_state_unsupported_event|severity_unsupported_event|package_type_unsupported_event)$', r('webhooks/github')]);
f('source-events', 'workflows', 'workflows/source-events', 'Source events and firewall triggers', [gp('factory_sources'), doc('website/factory-firewall-sources\\.md'), '^model:(FactorySourceEvent|FactorySourceCursor)$', e('factorySourceEventTypes'), e('factoryCapabilityKinds'), '^code:firewall_condition_unsupported_source$']);
f('label-dispatch', 'workflows', 'workflows/labels-and-commands', 'sf: labels and /sf commands', [g('factory_label_dispatch'), g('factory_labels'), r('factory/labels'), '^sf-label:']);
f('schedules', 'workflows', 'workflows/schedules', 'Schedules', [r('factory/schedules'), e('factoryRunsOnValues'), g('factory_cron'), g('factory_cron_stagger'), g('factory_scheduler'), gp('factory_schedules'), e('factoryOverlaps'), '^code:tz_invalid$']);
f('internal-fire', 'workflows', 'workflows/schedules', 'How schedulers fire runs (internal endpoints)', [r('factory/internal'), r('internal/factory'), g('factory_internal')]);
f('templates', 'workflows', 'workflows/templates', 'Templates', [r('factory/templates'), g('factory_templates'), '^template:', con('factory-templates'), '^model:FactoryTemplateDismissal$']);
f('template-search', 'workflows', 'workflows/templates', 'Event templates, variants and ranking', [gp('factory_templates_'), e('fwAxis\\w+')], { foundIn: '2026-10-28' });
f('defaults', 'workflows', 'workflows/default-workflows', 'Default workflows', [r('factory/defaults'), gp('factory_defaults'), '^default:', e('factoryDefaultKeys')]);
f('validation-codes', 'reference', 'reference/validation-codes', 'Validation and API error codes', ['^code:', doc('vdb-site/factory-validation\\.md', 'website/software-factory-validation\\.md')]);
f('graph-limits', 'workflows', 'workflows/graphs', 'Graph limits', ['^code:(too_many_nodes|too_many_edges|too_many|too_long|cycle|duplicate_edge|duplicate_id|unknown_node|no_trigger|invalid_loop|github_calls_exceed_run_cap|out_of_range|required|invalid_enum|invalid_type|invalid_id|invalid_repo|scope_unmanaged_repo)$']);

// ── Runs ───────────────────────────────────────────────────────────────────
f('runs', 'runs', 'runs/runs-and-steps', 'Runs and steps', [r('factory/runs'), g('factory_runs'), g('factory_runs_store'), g('factory_runs_actions'), g('factory_run_detail'), con('factory-runs', 'factory-run'), '^model:(FactoryRun|FactoryRunStep)$', e('fwRunStatuses'), e('factoryActiveRunStatuses'), e('fwRetryFrom'), '^code:bad_state$']);
f('run-artifacts', 'runs', 'runs/artifacts', 'Run artifacts', [g('factory_runs_artifacts')]);
f('engine', 'runs', 'runs/how-the-engine-runs', 'How the engine walks a graph', [g('factory_engine'), gp('factory_engine_(walker|exec|run|state|record|context|ports|adapters|route|capacity|attribution)'), doc('vdb-site/factory-engine\\.md')]);
f('no-host', 'runs', 'runs/waiting-for-a-machine', 'Waiting for a machine', [g('factory_engine_nohost')]);
f('sessions', 'runs', 'runs/sessions', 'Sessions', [r('factory/sessions'), r('belai/sessions'), gp('factory_session'), g('factory_sessions_aggregate'), g('belai_session_finished'), g('belai_timeline'), con('factory-session'), e('fcSessionSources'), e('fcAggregateGroupBys'), doc('website/session-trigger\\.md')]);
f('session-trigger', 'runs', 'runs/sessions', 'What started a session', [g('belai_trigger'), e('belaiClientTriggerSources')]);
f('handoffs', 'runs', 'runs/handoffs', 'Handoffs between agents', [r('factory/handoffs')]);
f('pr-checker', 'runs', 'runs/pull-request-checks', 'Pull request checks and rechecks', [g('factory_pr_checker'), e('factoryCheckSources'), g('factory_engine_review')]);

// ── Decisions and review ───────────────────────────────────────────────────
f('systemone', 'decisions', 'decisions/system-one', 'System One decisions', [r('factory/(systemone|decisions)'), r('internal/decisions'), g('factory_systemone'), g('factory_decisions_store'), '^gofile:systemone/', '^model:(FactoryDecision|FactoryDecisionDay)$', set('systemone.'), e('fcAdapters'), e('factoryRetention'), doc('vdb-site/factory-systemone\\.md'), g('factory_session_decision_events')]);
f('approvals', 'decisions', 'decisions/human-approval', 'Human approval', [r('factory/approvals'), gp('factory_approvals'), g('factory_engine_approval'), g('factory_engine_approve'), '^model:(FactoryApproval|FactoryHumanAction)$', e('fwApprovalDecidedStates'), '^code:already_decided$']);
f('checkpoints', 'decisions', 'decisions/checkpoints', 'Checkpoints and Needs you', [r('factory/(checkpoints|needs)'), g('factory_checkpoints'), g('factory_checkpoints_store'), g('factory_checkpoints_pulls'), con('factory-checkpoints'), e('fcNeedKinds'), e('fcpKindOrder'), doc('website/factory-checkpoints\\.md', 'website/belai-checkpoints\\.md')]);
f('merge-conflicts', 'decisions', 'decisions/merge-conflicts', 'Merge conflicts', [g('factory_checkpoints_conflicts'), g('factory_engine_conflicts'), con('factory-conflicts'), r('pulls'), g('pulls_conflicts'), g('belai_github_merge'), pkg('mergefix'), doc('belai/merge-conflicts\\.md', 'website/conflict-editor\\.md')]);
f('signing', 'decisions', 'decisions/commit-signing', 'Commit signing', [g('factory_signing'), set('signing.'), r('signing'), gp('signing_'), doc('vdb-site/signing\\.md', 'website/commit-signing\\.md', 'website/pix-sandbox-git-signing\\.md'), ts('sandbox/git-sign', 'sandbox/kms')]);

// ── Workforce ──────────────────────────────────────────────────────────────
f('agents', 'workforce', 'workforce/agents', 'Agents and agent profiles', [r('factory/(agents|workforce)'), doc('belai/guardian\\.md'), g('factory_workforce'), con('factory-workforce'), e('factoryBuiltinProfiles'), e('factoryWorkerProfiles'), pkg('agentprofile', 'profiles', 'agentstore', 'agentscan'), doc('belai/agent-profiles\\.md', 'belai/agent-stores\\.md'), '^cli-cmd:agent$', sub('agent'), flags('agent'), tui('agent', 'agents', 'profile'), cfg('profiles', 'agents')]);
f('agent-builder', 'workforce', 'workforce/agent-builder', 'The agent builder and drafts', [r('belai/(agent-creators|agent-drafts|ai-drafts|ai)( |/|$)'), g('belai_ai'), g('belai_ai_draft'), g('belai_drafts'), con('factory-agent'), pkg('agentdraft')]);
f('agent-import', 'workforce', 'workforce/agent-import', 'Importing agents and agent files', [pkg('agentimport', 'agentfiles'), sub('agentfiles'), doc('belai/agent-import\\.md')]);
f('avatars', 'workforce', 'workforce/avatars', 'Agent avatars', [r('belai/ai-avatars'), g('belai_ai_avatar'), gp('belai_avatar'), pkg('avatar', 'pix')]);
f('crews', 'workforce', 'workforce/crews', 'Crews', [gp('belai_crews'), g('belai_rc_crewruns'), e('belaiCrewControlOps'), e('belaiPoolPhases'), e('belaiRunEditors'), e('belaiRunStates'), pkg('crewlog', 'agentpool', 'bgagent'), '^cli-cmd:crew$', flags('crew'), tui('crew'), sub('crew')]);
f('role-manager', 'workforce', 'workforce/crews', 'Role manager', [pkg('rolemanager'), doc('belai/role-manager\\.md')]);
f('hosts', 'workforce', 'workforce/hosts-and-placement', 'Hosts and placement', [r('factory/(hosts|fleet)'), r('belai/(hosts|repo-hosts)'), g('factory_host_select'), g('factory_hosts_eligibility'), g('belai_repo_hosts'), g('belai_rc_fleet'), g('factory_summary_hosts'), con('belai-hosts'), set('hosts.'), '^model:(FactoryHostCapability|FactoryHostTag|FactoryHostToolUsage|FactoryPlacementNeed)$', e('belaiWorkerStates'), pkg('fleet', 'machineprobe'), doc('belai/fleet\\.md'), tui('fleet')]);
f('host-attention', 'workforce', 'workforce/hosts-and-placement', 'Host attention', [g('belai_host_attention'), r('belai/attention'), doc('vdb-site/belai-host-attention\\.md'), pkg('attention')]);
f('sandboxes', 'workforce', 'workforce/pix-sandboxes', 'Pix Sandboxes', [r('belai/sandboxes'), r('admin/pix-sandboxes'), gp('pix_sandbox_'), '^model:FactorySandboxWake$', set('pix.'), '^tsfile:sandbox/', doc('website/sandbox-worker/.*', 'belai/pix-sandbox\\.md', 'vdb-site/pix-sandbox-safe-harbour\\.md'), e('pixEgressModes'), e('pixEgressDecision'), e('pixVersionStrategies'), e('pixExtensionModes'), e('pixRepoSources'), e('pixItemKinds'), e('pixTelemetrySignals'), e('pixEventAudiences'), e('pixUsageStatuses'), e('pixForbiddenHeaders'), e('pixClassifiers'), e('pixDefaultClassifiers'), e('belaiLaunch\\w+'),]);
f('builtin-models', 'workforce', 'workforce/built-in-models', 'Built-in models, quota and windows', [gp('pix_builtin_'), doc('vdb-site/pix-builtin-models\\.md', 'website/pix-builtin-routing\\.md', 'vdb-site/belai-workers-ai\\.md'), g('belai_rc_models')]);
f('board', 'workforce', 'workforce/board', 'The board', [r('belai/kanban'), gp('belai_kanban'), g('factory_kanban'), con('factory-board'), e('belaiKanbanLists'), e('belaiKanbanListOrder'), pkg('kanban', 'todos'), doc('belai/kanban\\.md', 'belai/bkan\\.md', 'vdb-site/belai-kanban-classify\\.md'), '^cli-cmd:kanban$', sub('kanban'), sub('kanbanassign'), flags('kanban'), tui('kanban', 'todos'), cfg('kanban')]);
f('ticket-standard', 'workforce', 'workforce/ticket-standard', 'The ticket standard for cards', [g('factory_ticket'), pkg('ticketrules')], { foundIn: '2026-10-28' });
f('assignment', 'workforce', 'workforce/board', 'Assigning cards to people and agents', [r('belai/assignees'), g('belai_assignees'), doc('vdb-site/belai-assignment-mail\\.md')]);
f('github-sync', 'workforce', 'workforce/github-sync', 'Issue and label sync with your forge', [gp('belai_github'), e('belaiGHLabelColors'), e('belaiGHListLabels'), doc('vdb-site/belai-github-sync\\.md', 'website/belai-github-sync\\.md')]);
f('memory', 'workforce', 'workforce/memory', 'Agent and repository memory', [r('factory/memory'), r('belai/memory'), g('belai_memory'), con('factory-memory'), pkg('repomemory')]);
f('a2a', 'workforce', 'workforce/a2a-messaging', 'A2A messaging and blackout', [r('factory/a2a'), r('belai/a2a'), g('belai_a2a'), pkg('a2a', 'a2alink'), doc('belai/a2a\\.md', 'website/a2a-messaging\\.md')]);
f('forge', 'workforce', 'workforce/forge-requests', 'Forge requests', [g('belai_forge'), e('belaiForge\\w+'), e('belaiSteerEvents'), pkg('forge'), doc('vdb-site/belai-forge-requests\\.md')]);
f('library', 'workforce', 'workforce/library', 'The library: skills, prompts, commands, processes, repos and more', [r('belai/(library|prompts)'), gp('belai_library'), gp('belai_items'), con('belai-library'), e('belai(RedirectModes|Skill\\w+|Prompt\\w+|CommandFieldNames|Process\\w+|Repo\\w+|Rewrite\\w+|Hook\\w+|MCP\\w+|Budget\\w+|ScanNoteKinds|ScanVerdicts)'), pkg('libitem', 'libstore', 'libscan', 'libinstall', 'promptlib', 'commandlib', 'processlib', 'filelib', 'skills'), doc('belai/library-items\\.md', 'belai/skills\\.md', 'vdb-site/belai-library-items\\.md', 'vdb-site/belai-library-settings\\.md', 'belai/harnesses\\.md'), sub('lib'), flags('library'), flags('repo'), sub('repo'), '^cli-cmd:(skill|prompt|command|process|repo|budget|rewrite|provider|mcp|library)$', tui('skills', 'prompts', 'commands', 'processes'), cfg('gitrepos')]);
f('providers', 'workforce', 'workforce/providers-and-keys', 'Providers, keys and secrets', [g('belai_provider_keys'), g('belai_mcp_secrets'), e('belaiProvider\\w+'), e('belaiProfileFields'), e('belaiModelFields'), e('belaiSurfaces'), e('belaiBuiltinProviders'), e('belaiForbiddenFirewallHeaders'), pkg('provider', 'credentials', 'vaultenv', 'copilotauth', 'kiroauth', 'kiromodels'), doc('belai/vault-env\\.md', 'belai/kiro\\.md'), cfg('providers'), tui('providers')]);
f('asks', 'workforce', 'workforce/questions-and-permissions', 'Agent questions, answers and permission offers', [r('belai/answers'), g('belai_answers'), g('belai_open_asks'), g('belai_permission_offers'), e('belaiAnswerKinds'), e('belaiAskKindText'), pkg('clarify', 'webask', 'permissions'), doc('belai/firewall-permissions\\.md'), cfg('permissions'), tui('permissions', 'inbox'), g('factory_events_unanswered')]);
f('web-controls', 'workforce', 'workforce/remote-control', 'Session controls from the web', [r('belai/commands'), g('belai_commands'), e('belaiPrefOrigins'), e('belaiCommandKeys'), pkg('sessionctl')], { foundIn: '2026-10-27' });
f('messaging', 'workforce', 'workforce/messaging-centre', 'The messaging centre: connections, routes and templates', [r('messaging'), gp('messaging_'), set('notify.')], { foundIn: '2026-10-28' });
f('dispatches', 'workforce', 'workforce/dispatches', 'Dispatching work to hosts', [r('belai/dispatches'), e('belaiDispatchModes')]);
f('notifications', 'workforce', 'workforce/notifications', 'Notifications', [r('notifications'), r('push'), gp('notify'), g('push_subscriptions'), g('belai_notify'), g('factory_notify'), g('factory_notify_failure'), g('factory_wiring_notify'), e('factoryNotify\\w+'), pkg('notify'), doc('belai/notifications\\.md')]);
f('remote-control', 'workforce', 'workforce/remote-control', 'Remote control and connected hosts', [g('belai_rc'), g('belai_rc_knowledge'), pkg('rc'), doc('belai/remote-control\\.md'), flags('rc'), flags('rc-session'), sub('rc'), '^cli-cmd:rc$', tui('rc')]);
f('teleport', 'workforce', 'workforce/teleport', 'Teleport: move a session between hosts', [gp('belai_teleport'), pkg('teleport'), doc('belai/teleport\\.md')]);
f('host-shell', 'workforce', 'workforce/host-shell-and-web', 'Host shell, git and web sessions', [g('belai_shell'), g('belai_web'), g('belai_git'), e('belaiGitOutcomes')]);
f('host-schedules', 'workforce', 'workforce/host-schedules', 'Host schedules', [r('belai/schedules'), gp('belai_schedules'), e('belaiScheduleStatuses'), pkg('schedule', 'cron')]);
f('session-sync', 'workforce', 'workforce/session-sync', 'Session sync and object storage', [g('belai_sync'), g('belai_nul'), g('belai_objectstore'), pkg('sessionsync'), doc('belai/session-sync\\.md'), tui('sync')]);
f('analytics', 'evidence', 'evidence/analytics', 'Analytics', [r('belai/analytics'), gp('belai_analytics'), doc('vdb-site/belai-analytics\\.md', 'belai/git-directories-analytics\\.md')]);
f('knowledge', 'workforce', 'workforce/knowledge', 'Knowledge', [pkg('knowledge'), doc('belai/knowledge\\.md'), tui('knowledge'), cfg('knowledge')]);

// ── Cost ───────────────────────────────────────────────────────────────────
f('budgets', 'cost', 'cost/budgets', 'Budgets', [r('factory/budgets'), gp('factory_budgets'), g('factory_engine_budget'), con('factory-budgets'), '^model:(FactoryBudget|FactoryBudgetLedger)$', set('budget.'), e('fcBudgetActions'), '^code:budget_exceeds_parent$']);
f('agent-budgets', 'cost', 'cost/budgets', 'Per-agent and per-card limits', [g('factory_agent_budget'), set('agents.')]);
f('model-routing', 'cost', 'cost/model-routing', 'Model routing and the Pix allowance', [r('factory/budgets/routing'), '^gofile:tenantmodel/', e('fcRouteKeys'), e('fcRouteDefaults'), ts('sandbox/model-routing'), doc('website/tenant-model-labels\\.md'), set('providers.')]);
f('usage', 'cost', 'cost/usage', 'Usage and spend', [r('factory/budgets/usage'), r('factory/workforce/usage'), g('factory_summary_usage')]);
f('github-quota', 'cost', 'cost/github-quota', 'Forge quota and the data plane', [r('factory/quota'), gp('factory_quota'), g('factory_engine_quota'), '^model:(FactoryGithubCall|FactoryGithubQuota)$', set('forge.'), set('github.'), set('githubdata.'), e('factoryOnQuotaLow'), '^code:github_rate_limited$']);

// ── Evidence ───────────────────────────────────────────────────────────────
f('cockpit', 'evidence', 'evidence/cockpit', 'The cockpit', [r('factory/summary'), g('factory_summary'), g('factory_summary_store'), '^console:/resolve/factory$', e('fcSignal\\w+')]);
f('trust', 'evidence', 'evidence/trust-and-slsa', 'Trust and SLSA', [r('factory/trust'), gp('factory_trust'), con('factory-trust'), set('security.'), set('tea.'), set('jail.'), e('factoryScanners'), e('fcScanner\\w+'), e('factoryFirewallEcosystems'), '^code:custom_required$']);
f('firewalls', 'evidence', 'evidence/firewalls', 'Package and AI firewalls on factory work', ['^setting:firewall_enabled$', '^model:(AiFirewallHold|AiFirewallHoldPolicy)$', r('ai-firewall/(hold|capabilities)'), g('ai_firewall_hold'), pkg('firewall', 'netguard'), doc('belai/firewall\\.md'), e('belaiFirewall\\w+'), e('belaiInstanceFields'), tui('firewall'), cfg('firewall'), '^cli-flag:belai -firewall']);
f('audit', 'evidence', 'evidence/audit-ledger', 'The audit ledger', [r('factory/audit'), r('belai/audit'), gp('factory_audit'), gp('belai_audit'), con('factory-audit'), set('audit.'), '^model:(FactoryAuditEvent|FactoryAuditStream)$', e('fcAudit\\w+'), e('belaiAudit\\w+'), pkg('audit'), doc('belai/audit\\.md')]);
f('events', 'evidence', 'evidence/event-stream', 'The event stream', [r('factory/events'), gp('factory_events'), g('factory_engine_events'), con('factory-events'), '^model:FactoryEvent$', e('factoryEvent\\w+'), doc('vdb-site/factory-events\\.md')]);
f('facts', 'evidence', 'evidence/facts', 'Facts', [r('factory/facts'), g('factory_facts'), gp('belai_facts'), '^gofile:facts/', '^model:Fact$', doc('vdb-site/belai-session-facts\\.md'), pkg('factspec')]);
f('lifecycle', 'evidence', 'evidence/lifecycle-and-flow', 'Lifecycle and flow', [r('factory/(lifecycle|flow)'), gp('factory_lifecycle'), '^gofile:lifecycle/', '^model:FactoryLifecycle$', doc('vdb-site/factory-lifecycle\\.md', 'website/factory-lifecycle\\.md')]);
f('delivery', 'evidence', 'evidence/delivery', 'Delivery', [r('factory/delivery'), gp('factory_delivery'), g('forge_profile'), con('factory-delivery-decisions', 'factory-people', 'factory-contributors', 'factory-contributor', 'factory-outcome'), '^model:(FactoryOutcome|FactoryOutcomeModel|FactoryPerson|FactoryCommit)$', set('delivery.'), doc('vdb-site/factory-delivery-api\\.md', 'vdb-site/factory-delivery-capture\\.md', 'website/factory-delivery\\.md')], { refOnly: ['^setting:delivery\\.(roles|kinds|sources)\\.'] });
f('sightings', 'evidence', 'evidence/sightings', 'Sightings and detections', [r('factory/sightings'), gp('factory_sighting'), g('factory_links'), '^model:(FactorySighting|FactoryDetectionRun|FactoryDetectionStep|FactoryTag)$']);
f('attribution', 'evidence', 'evidence/attribution', 'Bot attribution', [g('belai_github_attribution'), pkg('attribution'), doc('belai/bot-attribution\\.md')]);
f('vex', 'evidence', 'evidence/vex-and-tea', 'VEX and TEA publishing', [pkg('vex')]);

// ── Pix calls ──────────────────────────────────────────────────────────────
f('pix-call', 'pix', 'pix/calling-pix', 'Calling Pix', ['^console:/call$', '^tsfile:call/', r('internal/pix-commander'), g('pix_commander'), e('pixCommanderEfforts'), doc('website/pix-call\\.md', 'website/pix-personal-assistant-marketing\\.md', 'vdb-site/pix-commander\\.md')]);
f('voice-tools', 'pix', 'pix/voice-tools', 'Voice tools', ['^voice-tool:']);
f('call-history', 'pix', 'pix/call-history', 'Call history, memory and review', [r('pix-call'), r('factory/call-log'), gp('pix_call_'), '^model:PixCallLog$', doc('vdb-site/pix-call-history\\.md')]);
f('pix-ask', 'pix', 'pix/pix-buttons', 'Pix buttons in the console', [doc('website/pix-ask\\.md', 'website/belai-console\\.md')]);
f('stops', 'pix', 'pix/stopping-work', 'Stopping work: the five stops', []);

// ── Belai CLI and TUI ──────────────────────────────────────────────────────
f('belai-install', 'belai', 'belai/install-and-sign-in', 'Install, update and sign in', ['^cli-cmd:login$', flags('login'), sub('login'), pkg('selfupdate', 'version', 'vulnetixcreds', 'vulnetixenroll', 'config', 'desktop'), cfg('paths', 'fleetpaths')]);
f('belai-session-flags', 'belai', 'belai/cli-reference', 'Top-level flags', [flags('belai'), '^cli-cmd:belai$']);
f('belai-modes', 'belai', 'belai/modes-and-plans', 'Modes, plan mode and goals', [pkg('modes', 'plans', 'planest', 'goals'), doc('belai/plan-mode-tuning\\.md'), tui('mode', 'handoff', 'execute', 'refine', 'yolo')]);
f('belai-sessions', 'belai', 'belai/sessions', 'Sessions: resume, export, compact and rename', [pkg('session', 'sessionctl', 'sessionmeasure', 'transcript', 'turnlog', 'inputhistory', 'offload'), doc('belai/session-controls\\.md', 'belai/session-measures\\.md', 'belai/session-assessment\\.md', 'belai/context-offload\\.md'), tui('resume', 'export', 'compact', 'rename', 'clear', 'exit', 'tree'), cfg('offload')]);
f('belai-models', 'belai', 'belai/models', 'Choosing providers and models', [pkg('models', 'modelfetch', 'modelinfo', 'modelselect', 'modeltest', 'localinfer'), tui('model')]);
f('belai-tools', 'belai', 'belai/tools', 'Built-in tools', [pkg('tools', 'codemode', 'explore', 'locate', 'repomap', 'readindex', 'repoindex', 'proc', 'bgproc', 'httpclient', 'workdiff', 'filediff', 'imageguard', 'svgguard', 'clipboard'), doc('belai/code-mode\\.md', 'belai/web-fetch\\.md', 'belai/diff\\.md', 'belai/image-attachments\\.md', 'belai/bash-rewrite\\.md'), tui('locate', 'diff', 'paste-image', 'add-dir'), cfg('codemode', 'bashrewrite')]);
f('belai-safety', 'belai', 'belai/guardrails', 'Guardrails, classifier, sandbox and trust', [pkg('sanitize', 'mlclassify', 'shellsafe', 'trustgate', 'posture', 'sandbox', 'delimiters', 'nonce', 'deciderserver', 'decisionserver', 'decisions', 'clefmcp'), doc('belai/sanitization\\.md', 'belai/sandbox\\.md', 'belai/nonce-endpoint-spec\\.md', 'belai/jev-jobs\\.md'), tui('trusted', 'sandbox'), cfg('jev', 'jevthresholds')]);
f('belai-mcp', 'belai', 'belai/mcp', 'MCP servers', [pkg('mcp'), doc('belai/mcp\\.md'), tui('mcp'), cfg('mcp'), '^cli-cmd:mcp$']);
f('belai-hooks', 'belai', 'belai/hooks', 'Hooks', [pkg('hooks'), doc('belai/hooks\\.md'), cfg('hooks')]);
f('belai-plugins', 'belai', 'belai/plugins', 'Plugins', [pkg('plugins'), doc('belai/plugins\\.md'), sub('plugin'), flags('plugin'), '^cli-cmd:plugin$', tui('plugin')]);
f('belai-acp', 'belai', 'belai/editors-acp', 'Editors over ACP', [pkg('acp', 'jsonrpc', 'wire'), doc('belai/acp(-\\w+)?\\.md'), flags('acp'), '^cli-cmd:acp$']);
f('belai-lsp', 'belai', 'belai/lsp', 'Language servers', [pkg('lsp'), doc('belai/lsp\\.md'), tui('lsp'), cfg('lsp')]);
f('belai-voice', 'belai', 'belai/voice-and-tts', 'Voice input and speech', [pkg('voice', 'voicecmd', 'tts'), doc('belai/voice\\.md', 'belai/tts\\.md'), tui('voice', 'tts')]);
f('belai-git', 'belai', 'belai/git', 'Git sync and repository info', [pkg('gitsync', 'gitinfo', 'repos', 'projectregistry'), doc('belai/git-sync\\.md'), tui('gitsync'), cfg('projectprefs', 'projectprefs_keys')]);
f('belai-budgets', 'belai', 'belai/token-budgets', 'Token budgets and session intelligence', [pkg('budget'), doc('belai/token-budgets\\.md'), tui('budgets', 'intel'), cfg('budgets'), sub('budget')], { foundIn: '2026-10-28' });
f('belai-quality', 'belai', 'belai/tests-and-lint', 'Tests, lint and build detection', [pkg('testdetect', 'testrun', 'testpass', 'lintdetect', 'builddetect', 'quality', 'proserules', 'depwatch'), doc('belai/lint\\.md', 'belai/testing\\.md')]);
f('belai-vulnetix', 'belai', 'belai/vulnetix', 'Vulnetix scanning inside sessions', [pkg('vulnetixcli', 'vulnid', 'scanartifacts'), doc('belai/vulnetix\\.md', 'belai/vulnetix-review\\.md', 'belai/vuln-row\\.md'), tui('vulnetix')]);
f('belai-telemetry', 'belai', 'belai/telemetry', 'Telemetry and tracing', [pkg('otel', 'trace', 'calltrace', 'activity'), doc('belai/telemetry\\.md')]);
f('belai-tui', 'belai', 'belai/tui', 'The terminal UI', [pkg('tui'), doc('belai/tui-design\\.md', 'belai/screenshots\\.md'), '^tui-key:', tui('help', 'welcome', 'settings', 'fuzzy'), pkg('fuzzy'), doc('belai/settings\\.md')]);
f('belai-tui-commands', 'belai', 'belai/tui-commands', 'TUI slash commands reference', ['^tui-cmd:']);
f('belai-config', 'belai', 'belai/settings-file', 'Belai settings file reference', ['^belai-config:']);
f('belai-headless', 'belai', 'belai/headless', 'Headless and one-shot runs', [pkg('headless', 'run', 'harness', 'prompt', 'commands'), flags('belai')]);
f('belai-agent-loop', 'belai', 'belai/how-a-turn-runs', 'How a turn runs: the agent loop', [pkg('agent')]);
f('belai-resilience', 'belai', 'belai/resilience', 'Retries, resilience and performance', [pkg('resilience'), doc('belai/resilience\\.md', 'belai/performance\\.md', 'belai/benchmarks\\.md')]);
f('belai-repo-memory', 'belai', 'belai/sessions', 'Todos and per-repo memory in the TUI', [pkg('todos')]);
f('belai-docs-tooling', 'belai', 'belai/contributing', 'Developing Belai', [pkg('docparity', 'docsuite', 'gittest'), doc('belai/development\\.md', 'belai/README\\.md', 'belai/site\\.md')]);

// ── Outside the Software Factory ───────────────────────────────────────────
// The CLI's commands, the Platform IaC kinds and config routes, and Guardian's
// console API. A page that starts with "/" is relative to the docs root, and
// `pages` lists more pages whose text counts. Each feature enters as drafted.
const cmd = (...tops) => `^cli-command:(${tops.join('|')})( |$)`;
// Commands with no docs yet. They match the `cli-undocumented` feature (todo)
// and are kept out of their group's pattern by NOT_YET.
const UNDOCUMENTED = ['gha publish', 'gha publish code-scanning', 'gha publish dependency-graph', 'gha publish release-assets', 'api', 'api discover', 'api upload', 'surface', 'surface liveness', 'pix install', 'triage status', 'package-firewall alpine', 'package-firewall debian', 'package-firewall rpm'];
const NOT_YET = `(?!(${UNDOCUMENTED.join('|')})$)`;
const cmdx = (...tops) => `^cli-command:${NOT_YET}(${tops.join('|')})( |$)`;
const cliF = (id, page, title, match, pages = []) => f(id, 'cli', page, title, match, { status: 'drafted', foundIn: '2026-11-03', pages });

cliF('cli-agent', '/pix/reference/commands', 'vulnetix agent', [cmd('agent')]);
cliF('cli-ai-firewall', '/ai-firewall/cli/commands', 'vulnetix ai-firewall', [cmd('ai-firewall')]);
cliF('cli-auth', '/cli/authentication/overview', 'vulnetix auth', [cmd('auth')]);
cliF('cli-scan', '/cli/commands/scan', 'vulnetix scan and the per-scanner commands', [cmd('scan', 'defend', 'sca', 'sast', 'secrets', 'iac', 'containers', 'malscan', 'cbom', 'aibom', 'image', 'fix', 'report')], ['/cli/commands/analyze', '/cli/ci-cd/overview', '/cli/ci-cd/gitlab-ci', '/ai-firewall/cli/wiring-clients', '/browser-extension/using/sidebar', '/cli/ci-cd/local']);
cliF('cli-analyze-upload', '/cli/commands/analyze', 'vulnetix analyze and upload', [cmd('analyze', 'upload')], ['/cli/commands/upload']);
cliF('cli-utilities', '/cli/commands/utilities', 'vulnetix env, version, update, completion and lsp', [cmd('env', 'version', 'update', 'completion', 'lsp')], ['/cli/commands/completion', '/cli/get-started/install']);
cliF('cli-gha', '/cli/commands/gha', 'vulnetix gha', [cmdx('gha')], ['/cli/ci-cd/gha-command']);
cliF('cli-attest', '/attestation/get-started/overview', 'vulnetix attest and cdx', [cmd('attest', 'cdx')]);
cliF('cli-bom', '/sbom/read/import-and-validate', 'vulnetix bom', [cmd('bom')], ['/sbom/read/corpus-queries']);
cliF('cli-config', '/platform-iac/cli/imperative-commands', 'vulnetix config', [cmd('config')], ['/cli/get-started/overview', '/quality-gates/reference/commands', '/platform-iac/planned/roadmap', '/ai-firewall/cli/commands', '/ai-firewall/policy/providers', '/platform-iac/cli/validate', '/platform-iac/cli/plan', '/platform-iac/cli/apply', '/platform-iac/cli/export']);
cliF('cli-ignore', '/iac-scanning/guides/suppression', 'vulnetix ignore', [cmd('ignore')]);
cliF('cli-jail', '/quality-gates/reference/commands', 'vulnetix jail', [cmd('jail')]);
cliF('cli-license', '/sca/license/policy', 'vulnetix license', [cmd('license')]);
cliF('cli-package-firewall', '/package-firewall/clients/go-dev', 'vulnetix package-firewall', [cmdx('package-firewall')], ['/cli/authentication/netrc', ...['arch', 'conan', 'maven', 'cargo', 'chef', 'composer', 'conda', 'cran', 'docker', 'helm', 'hex', 'homebrew', 'julia', 'nuget', 'pub', 'pypi', 'rubygems', 'terraform'].map((c) => `/package-firewall/clients/${c}`)]);
cliF('cli-pix', '/cli/get-started/overview', 'vulnetix pix and skills', [cmdx('pix', 'skills')], ['/pix/get-started/install']);
cliF('cli-tea', '/tea/cli/publishing', 'vulnetix tea', [cmd('tea')], ['/tea/cli/reading']);
cliF('cli-triage', '/pix/skills/attestations', 'vulnetix triage', [cmdx('triage')]);
cliF('cli-vdb', '/vdb-api/cli/commands', 'vulnetix vdb', [cmd('vdb')]);
cliF('cli-vex', '/vex/commands/ls-validate-merge', 'vulnetix vex', [cmd('vex')], ['/vex/get-started/overview']);
f('cli-undocumented', 'cli', '/cli/get-started/overview', 'CLI commands not documented yet', [`^cli-command:(${UNDOCUMENTED.join('|')})$`], { foundIn: '2026-11-03' });

f('iac-kinds', 'platform-iac', '/platform-iac/planned/kind-catalogue', 'Platform IaC kinds', ['^iac-kind:'], { status: 'drafted', foundIn: '2026-11-03' });
f('iac-config-api', 'platform-iac', '/platform-iac/reference/config-api', 'Config engine API and management tokens', ['^config-route:'], { status: 'drafted', foundIn: '2026-11-03' });
f('guardian-api', 'siem', '/siem/reference/api', 'Guardian console API', ['^guardian-route:'], { status: 'drafted', foundIn: '2026-11-03' });

// ── Status ─────────────────────────────────────────────────────────────────
// todo -> drafted (the page is written from the code) -> verified (the page
// was re-read against the code at the commit in its `checked` list).
const STATUS = {
  drafted: [],
  verified: [
    'settings-reference', 'triggers', 'source-events', 'label-dispatch', 'schedules', 'internal-fire',
    'templates', 'template-search', 'defaults', 'validation-codes', 'belai-session-flags', 'belai-tui-commands',
    'belai-config', 'workflow-graphs', 'builder-palette', 'node-trigger', 'node-scan', 'node-decision',
    'node-crew', 'node-gate', 'node-human', 'node-output', 'node-state', 'graph-limits', 'analytics', 'budgets',
    'agent-budgets', 'model-routing', 'usage', 'github-quota', 'cockpit', 'trust', 'firewalls', 'audit', 'events',
    'facts', 'lifecycle', 'delivery', 'sightings', 'attribution', 'vex', 'overview', 'concepts', 'quickstart',
    'never-does', 'glossary', 'architecture', 'managed-scope', 'repo-profiles', 'issue-mirroring', 'autonomy',
    'kill-switch', 'holds', 'settings-document', 'memory', 'a2a', 'forge', 'library', 'providers', 'asks',
    'web-controls', 'messaging', 'dispatches', 'notifications', 'remote-control', 'teleport', 'host-shell',
    'host-schedules', 'session-sync', 'knowledge', 'runs', 'run-artifacts', 'engine', 'no-host', 'sessions',
    'session-trigger', 'handoffs', 'pr-checker', 'systemone', 'approvals', 'checkpoints', 'merge-conflicts',
    'signing', 'belai-install', 'belai-modes', 'belai-sessions', 'belai-models', 'belai-tools', 'belai-safety',
    'belai-mcp', 'belai-hooks', 'belai-plugins', 'belai-acp', 'belai-lsp', 'belai-voice', 'belai-git',
    'belai-budgets', 'belai-quality', 'belai-vulnetix', 'belai-telemetry', 'belai-tui', 'belai-headless',
    'belai-agent-loop', 'belai-resilience', 'belai-repo-memory', 'belai-docs-tooling', 'agents', 'agent-builder',
    'agent-import', 'avatars', 'crews', 'role-manager', 'hosts', 'host-attention', 'sandboxes', 'builtin-models',
    'board', 'ticket-standard', 'assignment', 'github-sync', 'pix-call', 'voice-tools', 'call-history', 'pix-ask',
    'stops', 'forges', 'forge-connections', 'forge-capabilities',
  ],
};
for (const [status, ids] of Object.entries(STATUS)) {
  for (const id of ids) {
    const ft = F.find((x) => x.id === id);
    if (!ft) throw new Error(`STATUS names unknown feature ${id}`);
    ft.status = status;
  }
}

export default F;
