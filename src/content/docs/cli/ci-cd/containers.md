---
title: Docker, Podman and Kubernetes
nav: Containers
description: Build an image with the Vulnetix CLI, run it against a mounted project with Docker or rootless Podman, and run scans as Kubernetes Jobs and CronJobs.
order: 9
sources: [cli/install.sh, cli/Dockerfile, cli/internal/config/config.go, cli/cmd/memory_limit.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

Vulnetix does not publish a CLI container image. The repository's `Dockerfile` builds from source, which needs access to a private module, so build an image from the release binary instead.

## An image with the CLI

```dockerfile
FROM alpine:3.20
ARG VULNETIX_VERSION=v3.154.0
RUN apk add --no-cache ca-certificates curl git \
 && curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir /usr/local/bin --version "${VULNETIX_VERSION}" \
 && adduser -D -u 10001 scanner
USER scanner
WORKDIR /workspace
ENTRYPOINT ["vulnetix"]
```

```sh
docker build -t registry.example.com/ci/vulnetix:3.154.0 .
```

The install step verifies the binary against the release checksums. Rebuild to update; `vulnetix update` inside a container is pointless, and the update check does not run there.

## Docker

```sh
docker run --rm \
  -e VULNETIX_ORG_ID -e VULNETIX_API_KEY \
  -v "$PWD:/workspace" \
  registry.example.com/ci/vulnetix:3.154.0 \
  scan --fail-on high -o /workspace/dist/sbom.cdx.json
```

`-e NAME` with no value passes the variable through from your shell, so the key does not appear in the command. Results land in `./.vulnetix/` and `./dist/` on the host. The files are owned by UID 10001; add `--user "$(id -u):$(id -g)"` to own them yourself.

Inside a container the CLI reports its platform as `docker` (from `/.dockerenv`), turns off update checks, and attributes results from the mounted git checkout.

## Podman

Rootless Podman runs the same image. On SELinux hosts, label the mount:

```sh
podman run --rm \
  -e VULNETIX_ORG_ID -e VULNETIX_API_KEY \
  -v "$PWD:/workspace:Z" \
  --userns=keep-id \
  registry.example.com/ci/vulnetix:3.154.0 \
  scan --fail-on high
```

`--userns=keep-id` maps your UID into the container so the results are yours. Use `:z` (lower case) when several containers share the directory.

## Kubernetes

A Job that clones and scans, with the key from a Secret and a read-only root filesystem:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vulnetix
type: Opaque
stringData:
  org-id: 8ff8f1e4-0000-4000-8000-000000000000
  api-key: replace-me
---
apiVersion: batch/v1
kind: Job
metadata:
  name: vulnetix-scan
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      securityContext: { runAsNonRoot: true, runAsUser: 10001, fsGroup: 10001 }
      initContainers:
        - name: clone
          image: alpine/git:2.45.2
          args: ["clone", "--depth=1", "https://github.com/acme/api.git", "/workspace"]
          volumeMounts: [{ name: workspace, mountPath: /workspace }]
      containers:
        - name: vulnetix
          image: registry.example.com/ci/vulnetix:3.154.0
          args: ["scan", "--path", "/workspace", "--fail-on", "high"]
          env:
            - name: HOME
              value: /tmp
            - name: VULNETIX_ORG_ID
              valueFrom: { secretKeyRef: { name: vulnetix, key: org-id } }
            - name: VULNETIX_API_KEY
              valueFrom: { secretKeyRef: { name: vulnetix, key: api-key } }
            - name: VULNETIX_NAMESPACE
              valueFrom: { fieldRef: { fieldPath: metadata.namespace } }
          resources:
            limits: { memory: 2Gi }
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities: { drop: ["ALL"] }
          volumeMounts:
            - { name: workspace, mountPath: /workspace }
            - { name: tmp, mountPath: /tmp }
      volumes:
        - { name: workspace, emptyDir: {} }
        - { name: tmp, emptyDir: {} }
```

- `HOME=/tmp` on an `emptyDir` gives the CLI a writable home for its caches with a read-only root.
- The CLI sets a soft Go memory limit at 75% of the container's cgroup limit, so set a memory limit rather than relying on node memory. An explicit `GOMEMLIMIT` overrides it.
- `VULNETIX_NAMESPACE`, `VULNETIX_CLUSTER` and `VULNETIX_ENVIRONMENT` label the results; `POD_NAMESPACE` is also read. See [scan](/cli/commands/scan/#deployment-context-and-bom-identity).
- For a schedule, wrap the same pod spec in a `CronJob` (`schedule: "0 3 * * *"`, `concurrencyPolicy: Forbid`).
