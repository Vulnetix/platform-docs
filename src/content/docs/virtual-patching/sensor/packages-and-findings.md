---
title: Host packages, SBOM and findings
description: What a sensor reports about the packages on its host, how to list them and download the host's SBOM, and how they are checked for vulnerabilities.
order: 9
nav: Packages and findings
sources: [vdb-site/docs/runtime-sensor-api.md, vdb-site/api/internal/handler/runtime_sbom.go, vdb-site/api/internal/handler/runtime_sbom_ingest.go, cli/internal/sensor/agent/metrics.go, cli/internal/sysinv, vdb-sca-match/distro.go, vdb-api-cyclonedx-uploads/internal/processor/pipeline.go, vdb-manager/scripts/go-processors/internal/archtracker]
checked: [cli@3a217f87a]
updated: 03 Nov 2026
---

Every `inventoryEvery` (6 hours by default, and once at start) a sensor reports the packages on its host: what the package manager says is installed, and which of them a running process has mapped. The site keeps the latest report per sensor, builds the host's SBOM from it, and checks it for vulnerabilities.

## The Packages tab

**Sensors** (`/resolve/sensor`) has a **Packages** lens. Choose a sensor to see every package and version it found, with a filter box (name, version or executable path) and a state filter:

| State | Means |
|---|---|
| In use | A running process has this package mapped |
| Needs restart | A running process has an older copy mapped: the file was replaced on disk and the process has not restarted |
| Installed | On the host, and mapped by no running process |

A row lists the executables that map the package, which is where a flaw in it can be reached. **Download SBOM** saves the host's CycloneDX SBOM as `<hostname>.cdx.json`. A package the site cannot check is marked "not checked" (see [Coverage](#coverage)).

The same data is available from the API: `GET /v1/runtime/sensors/{uuid}/packages` returns the list, and adding `?format=cyclonedx` returns the SBOM.

## The SBOM

A CycloneDX document with one component per package: the name, the version and the package URL the sensor read from the host's package database. It records no timestamp, and its serial number is derived from the contents, so an unchanged host produces the same file. The executables that map a package are carried on its component in the property `vulnetix:runtime/executables`.

## How it is checked

After a report, the site hands the SBOM to the same CycloneDX pipeline an uploaded SBOM takes, off the request, so the sensor's report is answered as soon as the packages are stored:

- Only a changed package set is sent. An unchanged host is recognised by the SBOM's checksum and queues nothing, and one sensor sends at most one SBOM every 10 minutes.
- The document handed to the pipeline is the installed package set and a repository name, nothing about what is running, so a process starting or stopping is not a new document and boxes built from one image produce the same file.
- The pipeline looks each package up and stores findings and VEX records, as for any other SBOM. Findings for a host are filed under one repository with source `runtime-sensor`: the fleet name for a member of a [fleet](/virtual-patching/sensor/mdm/#autoscaled-and-short-lived-hosts), otherwise the hostname the host first reported. The name is chosen once and kept, so renaming a host does not orphan its findings, and two hosts with one hostname are told apart by their sensor id.

A package is matched against its own distribution's advisories first. A distribution backports fixes without changing the upstream version, so a Debian `libc6 2.36-9+deb12u4` can be fixed for a CVE whose upstream range still covers 2.36; matching the upstream range alone would report a flaw the distribution already closed. Where the distribution says nothing about a CVE, the upstream advisory is matched on the upstream version.

## Coverage

| Host | Matched against |
|---|---|
| Debian, Ubuntu | The distribution's advisories, for the host's release |
| Alpine | The distribution's advisories |
| RHEL | The distribution's advisories |
| Amazon Linux 2 and 2023 | The fixed builds in Amazon's own `updateinfo` feed ([ALAS](https://alas.aws.amazon.com/)), for the host's release, ingested daily. An AL2023 package is never judged by an AL2 fix, or the reverse |
| Arch Linux (and derivatives on `pacman`) | The [Arch Security Tracker](https://security.archlinux.org/), ingested daily |

Rocky, AlmaLinux, Fedora, SUSE and Wolfi hosts take the same path; how much they find depends on the advisories the vulnerability database holds for them.

- **Not checked.** A package is checked only if the sensor sent its distribution-qualified package URL. A sensor older than v3.165 sends none, so the tab says none of its packages are checked; it updates itself once it is on a recent release ([Self-update](/virtual-patching/sensor/provisioning-profiles/#self-update)). A package is never checked with a guessed URL, because that reads as clean.
- **AUR and other foreign packages.** The Arch tracker covers the official repositories only. An AUR package is matched on its upstream name alone.
- **Unfixed Arch issues.** The tracker's unfixed groups are matched through the upstream advisory, so an unfixed flaw with no upstream advisory is not reported.

## Reachability

The analysis is asynchronous, so a host's findings appear after its packages. Every two minutes the site joins each host's packages to its findings, by name and version, and writes reachability rows (source `RUNTIME`) on them:

| The package is | Row | What it tells you |
|---|---|---|
| Mapped by a running process | `DIRECT`, one row per executable | The path on the host of each binary that has the vulnerable package loaded |
| Mapped by a process, but the file on disk has since been replaced | `DIRECT` | The process still runs the old copy: restart it |
| Installed and mapped by nothing | `UNREACHABLE` | Evidence only. The package is still installed and the finding stays affected; nothing is marked not affected because it is not running |

The rows follow the host: when a process starts, a package is upgraded or the analysis creates a finding later, the next pass recomputes them. A scan's own reachability on the same finding is never changed.

> [!CAREFUL] Reachability is the executable list, not a call graph
> A finding tells you which executables on the host have the vulnerable package mapped. It does not say that the vulnerable function is called.
