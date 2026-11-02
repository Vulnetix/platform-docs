---
title: Repository files (.vulnetix/)
nav: Repository files
description: What the Pix hooks, skills and subagents read and write under .vulnetix/, with the memory.yaml and capabilities.yaml schemas as the CLI defines them.
order: 1
sources: [cli/internal/memory/memory.go, cli/internal/agent/capabilities.go, cli/internal/agent/policy.go, cli/cmd/agent.go, pix-ai-coding-assistant/skills/*/SKILL.md, pix-ai-coding-assistant/skills/fix/references/memory-yaml-schema.md, pix-ai-coding-assistant/vulnetix/agents/*.md]
checked: [cli@4c8c3b7, pix-ai-coding-assistant@7aebf02]
updated: 02 Nov 2026
---

## Layout

| Path | Written by | Holds |
|---|---|---|
| `.vulnetix/agent.yaml` | You | The [hook policy](/pix/hooks/policy-file/) |
| `.vulnetix/license-policy.yaml` | You | A licence allowlist for `license-check` |
| `.vulnetix/memory.yaml` | `vulnetix scan`, triage, skills | The last scan, history and per-finding triage ([below](#memoryyaml)) |
| `.vulnetix/capabilities.yaml` | `vulnetix agent capabilities` | Tools on this machine and markers in this repository ([below](#capabilitiesyaml)) |
| `.vulnetix/sast.<ts>.sarif`, `.vulnetix/sast/<branch>.summary.yaml` | `sast-scan` | SAST results and counts |
| `.vulnetix/secrets.<ts>.json`, `.vulnetix/secrets/<ts>.summary.yaml` | `secret-scan` | Findings and counts, never values |
| `.vulnetix/iac.<ts>.json`, `.vulnetix/iac/<ts>.summary.yaml` | `iac-scan` | IaC results |
| `.vulnetix/containers.<ts>.json`, `.vulnetix/containers/` | `container-scan` | Container results, Trivy, Grype and Syft output |
| `.vulnetix/licenses.<ts>.spdx.json`, `.vulnetix/licenses/<ts>.summary.yaml` | `license-check` | Licence results |
| `.vulnetix/sboms/<ts>/` | `sbom-generate` | `sbom.cdx.json`, `sbom.spdx.json`, signature bundles |
| `.vulnetix/vex/<ts>.vex.json` | `vex-publish`, `incident-responder` | VEX statements |
| `.vulnetix/detection/<VULN_ID>/` | `detection-rules`, `incident-responder` | Snort, Suricata, YARA and Nuclei content |
| `.vulnetix/exploit-test/<VULN_ID>.yaml`, `.py` | `exploit-test` | A Nuclei template or demo script |
| `.vulnetix/iocs/<VULN_ID>.stix.json` | `incident-responder` | A STIX 2.1 bundle |
| `.vulnetix/review/` | `pr-security-reviewer` | Per-scanner output and `<ts>.summary.md` |
| `.vulnetix/upgrade/inventory.json` | `dep-upgrade-orchestrator` | The upgrade queue |
| `.vulnetix/compliance/<ts>/` | `compliance-bundler` | The audit bundle and `manifest.json` |
| `<manifest>.vulnetix-backup` | `fix` | Copies of manifests and lockfiles before an edit |

`<ts>` is a UTC timestamp. Timestamped directories are never overwritten. Commit `agent.yaml` and `license-policy.yaml`; the rest is local working state. Add the others to `.gitignore`:

```gitignore
.vulnetix/*
!.vulnetix/agent.yaml
!.vulnetix/license-policy.yaml
```

## memory.yaml

The CLI defines this file (`cli/internal/memory`). Top-level keys:

| Key | Type | Holds |
|---|---|---|
| `version` | string | `"1"` |
| `last_scan` | object | The most recent scan record |
| `history` | list | Earlier scan records, newest first, at most 20 |
| `findings` | map, keyed by vulnerability id | Triage state per vulnerability |
| `sast_findings` | map, keyed by fingerprint | SAST finding state: `rule_id`, `severity`, `first_seen`, `last_seen`, `status` (`open`, `resolved`, `suppressed`) |
| `suppressions` | list | Ignore rules written by `vulnetix ignore` and synced with the console |
| `environment` | object | Git and platform context of the last query |
| `vdb_queries` | list | The last 50 VDB queries: `timestamp`, `command`, `args` |

### Scan record (`last_scan`, `history[]`)

`timestamp`, `path`, `git_branch`, `git_commit`, `git_remote`, `files_scanned`, `packages`, `vulns`, `critical`, `high`, `medium`, `low`, `sbom_path`, `scope_breakdown`, `ids_rules_path`, `ids_rules_count`, `sast_rules_loaded`, `sast_finding_count`, `sarif_path`. [Session context](/pix/hooks/session-context/) reads this.

### Finding record (`findings.<id>`)

| Field | Holds |
|---|---|
| `aliases`, `package`, `ecosystem` | Identity |
| `tool` | `sca`, `sast`, `iac`, `secrets`, `container`, `quality`, `license`, `cbom`, `aibom`, `malscan` |
| `source` | `vulnetix-sca` or `github` |
| `discovery` | `date`, `source` (`scan`, `hook`, `user`, `vulnetix-triage`, `github-triage`), `file`, `sbom` |
| `versions` | `current`, `current_source`, `fixed_in`, `fix_source` |
| `severity`, `scores` | Severity, and `cvss_score`, `epss_score`, `epss_percentile`, `coalition_ess`, `ssvc_decision`, `threat_exposure`, `max_severity` and their severities |
| `status` | `not_affected`, `affected`, `fixed`, `under_investigation`, or `inventory` for something the project contains rather than a flaw |
| `justification`, `action_response` | VEX justification and response |
| `decision` | `choice` (one of the nine [decision values](/pix/skills/vulnerabilities/#decision-values)), `reason`, `date`, `actor` |
| `cwss` | `score`, `priority`, `factors` |
| `threat_model` | `techniques`, `tactics`, attack vector and complexity, `reachability`, `exposure`, `reachability_evidence` |
| `exploits` | `exploit_count`, `sources`, `has_weaponized`, `highest_maturity` |
| `remediation` | `fix_availability` (`available`, `partial`, `no_fix`), `fix_version`, `actions` |
| `is_malicious`, `in_cisa_kev`, `in_eu_kev`, `confirmed`, `affected_range`, `safe_harbour` | Flags and scores |
| `source_files`, `path_count`, `introduced_paths` | Where it comes from in the dependency graph |
| `locations` | `file`, `start_line`, `end_line`, `start_col`, `end_col`, `snippet` |
| `last_seen_branch`, `last_seen_at` | The last scan that saw it |
| `history` | Events (`date`, `event`, `detail`), at most 50 per finding |

> [!CAREFUL] The CLI rewrites memory.yaml with only these keys
> Each `vulnetix scan` loads the file into this structure and writes it back, so a key outside it is dropped. Two skills, `fix` and `dashboard`, still follow an older plugin schema with `schema_version`, `manifests:` and a `vulnerabilities:` list; what they write there does not survive the next scan, and `dashboard` reads those sections. A file that does not parse is replaced by an empty one on the next write, without warning. Keep a copy before editing it by hand.

## capabilities.yaml

Written by `vulnetix agent capabilities`; skills read it to scope themselves to what is installed.

```bash
vulnetix agent capabilities            # refresh if older than 24 hours
vulnetix agent capabilities --force    # refresh now
vulnetix agent capabilities --root ../other-repo
```

| Key | Type | Holds |
|---|---|---|
| `schema_version` | int | `1` |
| `detected_at` | RFC 3339 | When detection ran |
| `binaries.<name>` | bool | Whether each tool resolves on `PATH`: `brew`, `bundler`, `cargo`, `composer`, `cosign`, `curl`, `docker`, `dotnet`, `gh`, `git`, `go`, `gradle`, `grype`, `helm`, `jq`, `kubectl`, `mvn`, `nix`, `node`, `npm`, `nuclei`, `pip`, `pipx`, `pnpm`, `podman`, `python`, `python3`, `scoop`, `semgrep`, `snort`, `suricata`, `syft`, `terraform`, `tofu`, `trivy`, `uv`, `vulnetix`, `wget`, `yara`, `yarn`, `yq` |
| `repo.<marker>` | bool | Project markers: `bun_lock`, `cargo_toml`, `compose`, `composer`, `containerfile`, `csproj`, `docker_compose`, `dockerfile`, `flake_nix`, `gemfile_lock`, `gh_workflows` (a `.yml` or `.yaml` in `.github/workflows`, not the bare directory), `gitlab_ci`, `go_mod`, `gradle`, `package_json`, `package_lock`, `pipfile_lock`, `pnpm_lock`, `poetry_lock`, `pom_xml`, `pyproject`, `requirements`, `semgrep_config`, `snort_rules`, `terraform`, `opentofu`, `uv_lock`, `yara_rules_yar`, `yara_rules_yara`, `yarn_lock` |
| `derived.primary_package_manager` | string | The first marker found in this order: `go`, `cargo`, `bun`, `pnpm`, `yarn`, `npm` (lockfile, then `package.json`), `poetry`, `uv`, `pipenv`, `python`, `pip`, `bundler`, `composer`, `maven`, `gradle`, `dotnet` |
| `derived.has_containers` | bool | A Dockerfile, Containerfile or compose file |
| `derived.has_iac` | bool | A `*.tf` or `*.tofu` file |
| `derived.has_ci` | bool | GitHub workflows or `.gitlab-ci.yml` |
| `derived.detection_stack` | list | The installed engines of `nuclei`, `semgrep`, `yara`, `snort`, `suricata` |
| `derived.sbom_stack` | list | The installed tools of `syft`, `grype`, `trivy`, `cosign` |
| `derived.soar` | string | `stix` |
| `derived.auth_status` | string | `authenticated`, `community` or `unauthenticated` |
