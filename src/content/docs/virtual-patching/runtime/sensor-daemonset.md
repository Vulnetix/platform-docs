---
title: Sensor as a DaemonSet
description: Run vulnetix-sensor on every Kubernetes node beside Tetragon, to check every process start against the feeds' hashes, Sigma and YARA rules.
order: 3
nav: DaemonSet (Tetragon)
sources: [cli/deploy/sensor/kubernetes-node-daemonset.yaml, cli/deploy/sensor/README.md, cli/cmd/vulnetix-sensor/main.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

One sensor per node reads [Tetragon](https://tetragon.io)'s event log. For each process start it hashes the new executable from the host filesystem and checks it against the feeds' `STIX` and `OPENIOC` hashes, the `SIGMA` `process_creation` rules and the `YARA` rules.

This path **detects and reports**. It does not stop the process: the sensor reports `ebpf` on and `bpfLsm` off, so the Resolve Platform says it cannot block there. To refuse execs in the kernel, see [Tetragon and BPF LSM](/virtual-patching/runtime/tetragon/).

## 1. Install Tetragon

```bash
helm repo add cilium https://helm.cilium.io
helm install tetragon cilium/tetragon -n kube-system
```

Tetragon writes its events to `/var/run/cilium/tetragon/tetragon.log` on each node.

## 2. Credentials

```bash
kubectl -n kube-system create secret generic vulnetix-sensor \
  --from-literal=VULNETIX_ORG_ID=<org-uuid> \
  --from-literal=VULNETIX_API_KEY=<hmac>
```

## 3. The DaemonSet

Build and push the image as on the [sidecar page](/virtual-patching/runtime/sensor-sidecar/), then:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: vulnetix-sensor
  namespace: kube-system
spec:
  selector:
    matchLabels: { app: vulnetix-sensor }
  template:
    metadata:
      labels: { app: vulnetix-sensor }
    spec:
      containers:
        - name: vulnetix-sensor
          image: <registry>/vulnetix-sensor:v3.154.0
          args:
            - --mode=monitor
            - --tetragon-export=/var/run/cilium/tetragon/tetragon.log
            - --host-root=/host
            - --feed=https://vulnetix.com/feeds/<org-uuid>/<sigma-feed-uuid>
            - --feed=https://vulnetix.com/feeds/<org-uuid>/<stix-feed-uuid>
            - --state-dir=/state
          envFrom:
            - secretRef: { name: vulnetix-sensor }
          resources:
            requests: { cpu: 20m, memory: 32Mi }
            limits: { memory: 256Mi }
          securityContext:
            # Reads binaries any user on the node can execute; nothing more.
            runAsUser: 0
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities: { drop: [ALL], add: [DAC_READ_SEARCH] }
          volumeMounts:
            - { name: tetragon, mountPath: /var/run/cilium/tetragon, readOnly: true }
            - { name: host, mountPath: /host, readOnly: true }
            - { name: state, mountPath: /state }
      volumes:
        - name: tetragon
          hostPath: { path: /var/run/cilium/tetragon, type: Directory }
        - name: host
          hostPath: { path: /, type: Directory }
        - name: state
          hostPath: { path: /var/lib/vulnetix-sensor, type: DirectoryOrCreate }
      tolerations:
        - operator: Exists
```

```bash
kubectl apply -f vulnetix-sensor-daemonset.yaml
kubectl -n kube-system rollout status ds/vulnetix-sensor
kubectl -n kube-system logs ds/vulnetix-sensor --tail=50
```

The state directory is a `hostPath`, so each node keeps its sensor identity across pod restarts. `--host-root=/host` is also where the periodic package inventory is read from, so finding pages can say which node has a vulnerable package loaded.

## What it needs

| | Why |
|---|---|
| `runAsUser: 0` with only `DAC_READ_SEARCH` | Read any executable on the node to hash it, and `/proc` for the inventory |
| Host `/` read-only at `/host` | The executables and package databases |
| Tetragon's log directory read-only | The process start events |
| The `tolerations` | Run on every node, including tainted ones |

`--mode` makes no difference on this path, since nothing here can block; keep it at `monitor`.
