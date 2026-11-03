---
title: Tetragon and BPF LSM
description: Render a Tetragon TracingPolicy from a feed's block-mode Sigma rules to refuse matching execs in the kernel, or use the sensor's own BPF LSM program.
order: 6
nav: Tetragon and BPF LSM
sources: [cli/internal/sensor/tetragon/policy.go, cli/cmd/vulnetix-sensor/main.go, cli/deploy/sensor/README.md, cli/internal/sensor/agent/lsm.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

> [!CAREFUL] Not yet validated live
> The Tetragon policy has not been run against a live Tetragon, and the BPF LSM program has been compiled and checked as a spec but not loaded by a live kernel's verifier. Read the rendered policy before you apply it, and try it on a test node first.

Both paths refuse an exec in the kernel, before it runs, for programs that a block-mode Sigma rule names by path. They are the blocking counterpart to the [DaemonSet](/virtual-patching/runtime/sensor-daemonset/), which only detects.

## Tetragon policy

```bash
vulnetix-sensor tetragon-policy \
  --feed https://vulnetix.com/feeds/<org-uuid>/<sigma-feed-uuid> \
  > vulnetix-exec-block.yaml
kubectl apply -f vulnetix-exec-block.yaml
```

| Flag | Default | |
|---|---|---|
| `--feed` | required, repeatable | A published feed's base URL |
| `--feed-key` | `VULNETIX_FEED_KEY`, else the pinned key | Required: the command refuses to run with no key, because an unverified rule never blocks |

The policy goes to stdout. Each rule it could not use is listed on stderr as `skipped <rule-uuid>: <reason>`.

### Which rules are rendered

A rule is used only if all of these hold:

| Condition | Skip reason otherwise |
|---|---|
| Its feed's signature verified | `its feed is not verified` |
| Not disabled in the feed | `disabled` |
| `deployMode` is `block` | `starts in log mode, not block` |
| `logsource.category` is `process_creation` | `not a process_creation rule` |
| `detection` has exactly one selection and a `condition` naming it | `needs exactly one selection and a condition` |
| The selection tests `Image` and nothing else | `the selection tests more than Image` |
| `Image` has no modifier, `startswith` or `endswith` | `modifier <m> has no Tetragon operator` |
| No value is empty or contains `*` or `?` | `an Image value is empty or has a wildcard` |

Every other rule keeps running in the sensor as detection. If nothing can be rendered the command fails with `no rule can be rendered as a Tetragon policy`.

### What it renders

```yaml
# Rendered by vulnetix-sensor tetragon-policy from rules: <rule-uuid>, <rule-uuid>
# Refuses a matching exec with EPERM in the kernel, in every sensor mode. Re-render after a
# rule changes or is marked a false positive.
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: vulnetix-exec-block
  labels:
    app.kubernetes.io/managed-by: vulnetix-sensor
spec:
  kprobes:
    - call: security_bprm_creds_for_exec
      syscall: false
      args:
        - index: 0
          type: linux_binprm
      selectors:
        - matchArgs:
            - index: 0
              operator: Equal
              values: [/tmp/xmrig, /usr/local/bin/kinsing]
          matchActions:
            - action: Override
              argError: -1
```

Sigma `Image` with no modifier becomes `Equal`, `|startswith` becomes `Prefix`, `|endswith` becomes `Postfix`. Each selector holds at most 64 values. Tetragon allows 5 selectors per kprobe, so a feed that needs more fails with `the rules need <n> selectors and Tetragon allows 5; split the feed`.

`argError: -1` is `EPERM`. Tetragon's `Override` action needs a kernel built with `CONFIG_BPF_KPROBE_OVERRIDE`.

### Operating it

- The policy blocks **in every sensor mode**, including monitor. It is yours to apply and remove.
- The sensor does not update it. Render and apply it again after a rule changes, is disabled, or is marked a false positive on `/resolve/sensor`.
- When the DaemonSet sensor runs on the same node, it reads Tetragon's record of each refusal by this policy (by its name, `vulnetix-exec-block`) and reports it as blocked under the rule that matched.
- Remove it with `kubectl delete tracingpolicy vulnetix-exec-block`.

## BPF LSM: `--bpf-lsm`

The sensor can load its own BPF LSM program on `bprm_check_security` instead of using Tetragon:

```bash
sudo vulnetix-sensor --mode guard --bpf-lsm \
  --feed https://vulnetix.com/feeds/<org-uuid>/<sigma-feed-uuid>
```

| | |
|---|---|
| Matches | Exact paths only: a block-mode Sigma rule with `Image` and no modifier, from a verified feed |
| How | By inode and device, so a renamed or hard-linked copy is refused too |
| monitor | Reports each match, refuses nothing |
| guard, enforce | Refuses with `EPERM` |
| Resolve Platform decisions | A promote, demote or mode change updates the kernel map at once |
| Needs | Root, or `CAP_BPF` with `CAP_SYS_ADMIN`; and `bpf` listed in `/sys/kernel/security/lsm`, which usually means adding it to `lsm=` on the kernel command line |
| Without them | The sensor logs why and carries on without it |

The sensor then reports `bpfLsm` on.

Limits: a path on an overlay filesystem or a btrfs subvolume can carry a different device number in the kernel than `stat` reports, so it may not match. A file replaced on disk is a new inode and is covered at the next rule refresh.

```bash
cat /sys/kernel/security/lsm
# lockdown,capability,landlock,yama,apparmor,bpf
```
