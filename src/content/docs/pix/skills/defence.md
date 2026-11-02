---
title: Detection and exploit-test skills
nav: Detection and exploit tests
description: detection-rules writes Snort, Suricata, YARA and Nuclei content for a CVE you cannot patch yet; exploit-test builds a command to prove a fix against a target you authorise. Neither runs anything.
order: 5
sources: [pix-ai-coding-assistant/skills/detection-rules/SKILL.md, pix-ai-coding-assistant/skills/exploit-test/SKILL.md, cli/internal/agent/capabilities.go]
checked: [pix-ai-coding-assistant@7aebf02, cli@4c8c3b7]
updated: 02 Nov 2026
---

Both skills fetch content and write files. You run the engine or the command.

## detection-rules

Detection content for a CVE when a patch is not available or not deployed yet.

| | |
|---|---|
| Arguments | `<vuln-id>` |
| Runs | `vulnetix vdb snort-rules`, `vulnetix vdb traffic-filters`, `vulnetix vdb yara-rules`, `vulnetix vdb nuclei` |
| Grants | `Write` |
| Writes | `.vulnetix/detection/<VULN_ID>/`: `snort.rules`, `suricata.rules`, `vuln.yar`, `nuclei-<id>.yaml` |

Only the families in `derived.detection_stack` of [`capabilities.yaml`](/pix/reference/repository-files/#capabilitiesyaml) are fetched; the stack lists whichever of `nuclei`, `semgrep`, `yara`, `snort` and `suricata` are on `PATH`. With none installed it asks whether to fetch Snort, YARA and Nuclei anyway. A CVE with no rules in any family means no community detection content exists, not a failure.

Traffic filters are Snort-format rules tagged for Suricata compatibility; check Suricata accepts each before deploying. YARA rules with hash matchers need YARA built with the hash module.

## exploit-test

A runnable command that shows whether a vulnerability path still responds, against a target you name.

| | |
|---|---|
| Arguments | `<vuln-id> [--target URL]` |
| Runs | `vulnetix vdb exploits`, `vulnetix vdb ai-assisted-exploits get`, `vulnetix vdb nuclei get --format yaml` |
| Grants | `Bash(nuclei:*)` |
| Writes | `.vulnetix/exploit-test/<VULN_ID>.yaml` (Nuclei template) or `.py` (demo script) |

It picks the highest-fidelity option available:

| Order | Option | Needs |
|---|---|---|
| 1 | `nuclei -t .vulnetix/exploit-test/<VULN_ID>.yaml -u "$TARGET"` | `nuclei` on `PATH` |
| 2 | `msfconsole -q -x "use <module>; set RHOSTS <target>; run; exit"` | A Metasploit module id and `msfconsole` |
| 3 | `uv run --with requests .vulnetix/exploit-test/<VULN_ID>.py "$TARGET"` | An AI-assisted demo script |
| 4 | A `curl` proof of concept from the exploit references | Nothing |

> [!CAREFUL] Authorised targets only
> The skill writes a `--target` placeholder when you give none and will not run a command against any target without your explicit confirmation. Run it only against systems you are authorised to test. Proof-of-concept code is never executed by the skill, and no credential or token is stored under `.vulnetix/exploit-test/`.

Use it after `fix` to compare behaviour before and after with the same payload, or to hand QA a reproducible check.
