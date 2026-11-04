---
title: Host packages, SBOM and findings
description: What a sensor reports about the packages on its host, how to list them and download the host's SBOM, how they are checked for vulnerabilities, and what happens to the findings when a package is upgraded or a host is gone.
order: 9
nav: Packages and findings
sources: [vdb-site/docs/runtime-sensor-api.md, vdb-site/api/internal/handler/runtime.go, vdb-site/api/internal/handler/runtime_sbom.go, vdb-site/api/internal/handler/runtime_sbom_ingest.go, vdb-site/api/internal/handler/runtime_analysis_state.go, vdb-site/api/internal/handler/runtime_lifecycle.go, cli/internal/sensor/agent/metrics.go, cli/internal/sensor/inventory, cli/internal/sysinv, vdb-sca-match/distro.go, vdb-api-cyclonedx-uploads/internal/processor/pipeline.go, vdb-api-cyclonedx-uploads/internal/processor/retire.go, vdb-api-cyclonedx-uploads/internal/processor/confidence.go, vdb-manager/scripts/go-processors/internal/archtracker]
checked: [cli@d84127e34, vdb-site@07561f7, vdb-api-cyclonedx-uploads@a804297]
updated: 05 Nov 2026
---

A sensor reports the packages on its host when it starts, within a few minutes of a package being installed, upgraded or removed, and otherwise every `inventoryEvery` (6 hours by default): what the package manager says is installed, and which of them a running process has mapped. The site keeps the latest complete report per sensor, builds the host's SBOM from it, and checks it for vulnerabilities.

## The Packages tab

**Sensors** (`/resolve/sensor`) has a **Packages** lens. Choose a sensor to see every package, version and architecture it found, with a filter box (name, version or executable path) and a state filter:

| State | Means |
|---|---|
| In use | A running process has this package mapped |
| Needs restart | A running process has an older copy mapped: the file was replaced on disk and the process has not restarted |
| Installed | On the host, and mapped by no running process |

A row lists the executables that map the package, which is where a flaw in it can be reached, and, for a package that was checked, its open findings, linked to **Findings** scoped to the host's repository and that package. A package that was not checked says why (see [Coverage](#coverage)). Large hosts show 200 rows at a time.

Above the list:

- **The analysis**, in one line: waiting, being checked, checked N minutes ago, failed (with the reason; it is retried automatically), too large to check, or not checked. **Re-check now** checks the stored packages again without waiting for the next report, for instance after new advisories or a fix you expect to see.
- **Banners** for a host whose device was revoked, a report older than twice the reporting interval, an incomplete report (the list shown is the last complete one, with the sensor's reason), a host whose packages cannot be read at all, and the packages that need a restart.
- **Retire host**, for a host that is gone for good (see [When a host is gone](#when-a-host-is-gone)).

**Download SBOM** saves the host's CycloneDX SBOM as `<hostname>.cdx.json`. The sensor list shows the same state per host: open findings, a running or failed check, and the last self-update.

The same data is available from the API: `GET /v1/runtime/sensors/{uuid}/packages` returns the list with each package's `coverage` and `findings` and the host's `analysis` and `inventoryStatus`, and adding `?format=cyclonedx` returns the SBOM.

## The SBOM

A CycloneDX document with one component per package: the name, the version, the architecture and the package URL the sensor read from the host's package database. A host with one package installed for two architectures (`libc6` for amd64 and i386) has two components. It records no timestamp, and its serial number is derived from the contents, so an unchanged host produces the same file. The executables that map a package are carried on its component in the property `vulnetix:runtime/executables`.

## A report the site can trust

The site replaces a host's package list with each report, so a report that missed a package database would make the missing packages look fixed. Three guards stop that:

- The sensor says when a database exists but could not be read (a locked rpm database, a permission error) and marks the report incomplete. The site keeps the last complete list and shows the reason.
- A sensor too old to say so, that suddenly reports less than half of the host's installed packages, is treated the same way.
- A report that arrives after a newer one is ignored, so a slow retry cannot bring back a package the host has removed.

A host whose packages no supported database holds (NixOS, Gentoo) says so instead of reporting an empty host, and reads as not checked.

## How it is checked

After a report, the site hands the SBOM to the same CycloneDX pipeline an uploaded SBOM takes, off the request, so the sensor's report is answered as soon as the packages are stored:

- Only a changed package set is analysed, one analysis per host at a time. The state is kept on the host's record, so a restart of the site in between loses nothing: a sweeper picks up an analysis that was asked for and never handed off, and retries a failed one after 30 minutes.
- A host that goes back to a package set it had before (a rollback) is analysed again, so the findings of that set come back.
- The document handed to the pipeline is the installed package set and a repository name, nothing about what is running, so a process starting or stopping is not a new document and boxes built from one image produce the same file.
- The pipeline looks every package up before it writes anything. A lookup that fails (a database under load) fails the attempt with nothing written, and it is tried again up to three times; a failed check is never shown as a clean one.
- Findings for a host are filed under one repository with source `runtime-sensor`: the fleet name for a member of a [fleet](/virtual-patching/sensor/mdm/#autoscaled-and-short-lived-hosts), otherwise the hostname the host first reported. The name is chosen once and kept, so renaming a host does not orphan its findings, and two hosts with one hostname are told apart by their sensor id.

A package is matched against its own distribution's advisories first. A distribution backports fixes without changing the upstream version, so a Debian `libc6 2.36-9+deb12u4` can be fixed for a CVE whose upstream range still covers 2.36; matching the upstream range alone would report a flaw the distribution already closed. Where the distribution says nothing about a CVE, the upstream advisory is matched on the upstream version.

## Coverage

| Host | Matched against |
|---|---|
| Debian, Ubuntu | The distribution's advisories, for the host's release |
| Linux Mint, Pop!_OS and other Ubuntu derivatives | Ubuntu's advisories, for the Ubuntu release the derivative names (`UBUNTU_CODENAME`) |
| LMDE, Raspberry Pi OS (Raspbian) | Debian's advisories, for the Debian release |
| Alpine | The distribution's advisories |
| RHEL | The distribution's advisories |
| Amazon Linux 2 and 2023 | The fixed builds in Amazon's own `updateinfo` feed ([ALAS](https://alas.aws.amazon.com/)), for the host's release, ingested daily. An AL2023 package is never judged by an AL2 fix, or the reverse |
| Arch Linux and anything `ID_LIKE=arch` (CachyOS, Manjaro, Garuda, Artix) | The [Arch Security Tracker](https://security.archlinux.org/), ingested daily |

Rocky, AlmaLinux, Fedora, SUSE and Wolfi hosts take the same path; how much they find depends on the advisories the vulnerability database holds for them.

- **Not checked: distribution.** A package from a distribution the vulnerability database holds no advisories for (Kali, Photon, Azure Linux, Oracle Linux, and a derivative whose base release cannot be told) is not checked. It is never matched by name against upstream releases, because that reads as clean. The tab labels it, and it is not the same as clean.
- **Not checked: sensor too old.** A package is checked only if the sensor sent its distribution-qualified package URL. A sensor older than v3.165 sends none; it updates itself once it is on a recent release ([Self-update](/virtual-patching/sensor/provisioning-profiles/#self-update)).
- **AUR and other foreign packages.** The Arch tracker covers the official repositories only. An AUR package is matched on its upstream name alone.
- **Unfixed Arch issues.** The tracker's unfixed groups are matched through the upstream advisory, so an unfixed flaw with no upstream advisory is not reported.

## How far to trust a finding

Each finding the vulnerability database matched records how it was matched, and the finding page shows it when it is less than certain:

| Confidence | When | Badge |
|---|---|---|
| High | A bounded range or an exact version, from the distribution or the package's own advisory | None |
| Medium | The distribution's advisories say nothing about the CVE, so the upstream version was compared. A fix the distribution backported would not show | Upstream version match |
| Low | The advisory gives no usable version range, so this version could not be confirmed affected | Inconclusive version match |

The triage of the finding states the method, the range and the advisory source.

## When a package is upgraded or removed

Each analysis of a host compares its findings with the host's earlier analyses. A finding whose package is no longer installed at that version is resolved: `not_affected`, justification `vulnerable_code_not_present`, with the time it disappeared. A CVE that still affects the new version stays open on the new version. A repository scan that shares the host's name, and other hosts, are never compared.

If one analysis would resolve more than half of 20 or more findings at once, nothing is resolved and the run is logged for review: that is far more often a package database that was not read than a real patch.

## When a host is gone

A host that stops reporting is retired: a fleet member within minutes, any other host after 30 days without a report, or a day after its device is revoked. **Retire host** on the Packages tab does it at once. A retired host leaves the sensor list and the "in memory on your hosts" answer, and once no live sensor files findings under the same repository its open findings are resolved the same way. A retired host that reports again comes back, unless its device was revoked.

Each host keeps its latest three analysis SBOMs; older copies are deleted.

## Reachability

The analysis is asynchronous, so a host's findings appear after its packages. Every two minutes the site joins each host's packages to its findings, by name and version, and writes reachability rows (source `RUNTIME`) on them, shown on the finding's Reachability tab as "Running on the host (sensor)":

| The package is | Row | What it tells you |
|---|---|---|
| Mapped by a running process | `DIRECT`, one row per executable | The path on the host of each binary that has the vulnerable package loaded |
| Mapped by a process, but the file on disk has since been replaced | `DIRECT` | The process still runs the old copy: restart it |
| Installed and mapped by nothing | `UNREACHABLE` | Evidence only. The package is still installed and the finding stays affected; nothing is marked not affected because it is not running |

The rows follow the host: when a process starts, a package is upgraded or the analysis creates a finding later, the next pass recomputes them. A scan's own reachability on the same finding is never changed.

Processes in a container (another mount namespace) map files from the container's own root, so they are counted and not matched against the host's packages. An upgrade that renamed a shared library the process still maps (`libssl.so.3.0.11` replaced by `libssl.so.3.0.15`) still marks the owning package as needing a restart.

> [!CAREFUL] Reachability is the executable list, not a call graph
> A finding tells you which executables on the host have the vulnerable package mapped. It does not say that the vulnerable function is called.
