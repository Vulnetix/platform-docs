---
title: Docker and OCI images
nav: Docker and OCI
description: Pull container images through the Package Firewall's OCI registry endpoint, and why a daemon registry mirror is not enough on its own.
order: 18
sources: [package-firewall/internal/ecosystem/oci/oci.go, package-firewall/internal/ecosystem/ecosystem.go, package-firewall/internal/upstream/mirror.go, package-firewall/internal/handler/ecosystem_handler.go]
checked: [package-firewall@333285f]
updated: 02 Nov 2026
---

| | |
|---|---|
| Registry host | `packages.vulnetix.com` (OCI API under `/v2`) |
| Ecosystem ID | `oci` |
| Plan | Enterprise |
| Mode | filter for `tags/list`; gate for manifests requested by tag; blobs and digest manifests streamed unchanged |
| Cooldown | no |
| Default mirror | `https://registry-1.docker.io` |
| Automatic setup | none: `vulnetix package-firewall docker` exits 1 |

A manifest pulled by tag is checked as `<repository>@<tag>`, for example `library/nginx@1.27`. A manifest or blob pulled by digest is checked against the known-bad digest set only.

## Pull by registry host

Log in once, then name the firewall as the registry:

```bash
printf '%s' "$VULNETIX_API_KEY" | docker login packages.vulnetix.com -u "$VULNETIX_ORG_ID" --password-stdin
docker pull packages.vulnetix.com/library/nginx:1.27
```

Docker Hub official images need the `library/` prefix. In a Dockerfile:

```dockerfile
FROM packages.vulnetix.com/library/python:3.13-slim
```

The same works with Podman, containerd (`nerdctl`), Buildah and Kubernetes image pull secrets, because it is a normal authenticated registry.

## Daemon registry mirror

```json
{ "registry-mirrors": ["https://packages.vulnetix.com"] }
```

in `/etc/docker/daemon.json`, then `sudo systemctl restart docker` and `docker info | grep -A1 'Registry Mirrors'`.

> [!CAREFUL] A refused mirror falls back to Docker Hub
> When a registry mirror fails, dockerd pulls from Docker Hub directly. That covers both a policy block and a mirror that rejects the daemon's credentials, so a mirror-only setup can be silently bypassed. A mirror also only applies to Docker Hub images. Prefer pulling by the `packages.vulnetix.com` host, and check the [decision log](/package-firewall/operations/decision-log/) for `oci` entries to confirm pulls are reaching the firewall.

## Other registries

The upstream is whatever `oci` mirror your organization has active, `registry-1.docker.io` by default. To front a different registry, add it as an `oci` [mirror](/package-firewall/operations/mirrors/). Mirrors are tried in priority order for every pull, so one firewall endpoint fronts one registry chain, not several registries side by side.
