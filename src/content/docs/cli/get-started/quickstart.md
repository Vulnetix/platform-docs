---
title: Quickstart
description: Scan a project, read the result, replay it offline, and turn it into a failing check, in five commands.
order: 3
sources: [cli/cmd/scan.go, cli/cmd/report.go, cli/internal/scanopts/surface.go, cli/cmd/exit_codes.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

## 1. Install

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh
```

Other methods are on [Install](/cli/get-started/install/).

## 2. Sign in (optional)

```sh
vulnetix auth login
```

This opens a browser, asks you to approve a code, and stores an API key for your organisation. Skip it and the CLI uses the shared community credential: lookups work, but nothing is stored in Vulnetix and no snapshot links are printed. A free Community plan gives you your own quota: [register](https://www.vulnetix.com/resolve/register), then log in.

## 3. Scan

From the project root:

```sh
vulnetix scan
```

`scan` walks the directory to depth 3, parses every manifest and lockfile it recognises, runs the SAST, secrets, container, IaC, licence and malware passes, and asks the VDB about every package version. On a one-dependency project the result looks like this:

```text
Querying VDB via /v2/cli.sca: 1 unique package(s) in 1 batch(es)...
vulnetix scan: FINDINGS  5 advisories, 1 package, 1 need action

NEEDS ACTION
  CRITICAL  lodash 4.17.20 -> 4.18.0   CVE-2021-23337 +4   KEV weaponized SSVC-act   ./package-lock.json

vulnetix scan: CLEAN  no sast findings
  [OK] BOM:      .vulnetix/sbom.cdx.json
  [OK] Memory:   .vulnetix/memory.yaml
```

The unit is the package: `lodash 4.17.20 -> 4.18.0` is the one upgrade that clears all five advisories. Groups (`NEEDS ACTION`, `CAN WAIT`, `UNVERIFIED`, `PROTECTED`, `MONITORED`, `NOT AFFECTED`) say what to do, not how severe something is. They are explained in [scan: reading the output](/cli/commands/scan/#reading-the-output).

The results stay in `.vulnetix/` in the project. Add it to `.gitignore`.

## 4. Look again without rescanning

```sh
vulnetix report                       # offline replay of .vulnetix/sbom.cdx.json
vulnetix report --view findings       # one line per advisory
vulnetix report --fresh-exploits      # stored findings, current exploit intelligence
```

## 5. Fail on what matters

Without a gate, `scan` exits `0` whatever it finds. Add `--fail-on`:

```sh
vulnetix scan --fail-on high              # exit 1 on any high or critical finding
vulnetix scan --fail-on kev,malware       # exit 1 on an actively exploited or malicious package
echo $?
```

Exit `1` means a gate breached or the command failed. The full list, including `3` for a jail gate that could not decide, is on [Exit codes](/cli/reference/exit-codes/).

## Next

- [Run it in CI](/cli/ci-cd/overview/)
- [Every scan flag](/cli/commands/scan/)
- [Dependency analysis in depth](/sca/)
