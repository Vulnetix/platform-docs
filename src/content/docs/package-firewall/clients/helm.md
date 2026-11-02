---
title: Helm
description: Add the Package Firewall as a Helm chart repository, and set the chart repository it fronts.
order: 22
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/helm/helm.go, package-firewall/internal/ecosystem/ecosystem.go, cli/cmd/config.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 02 Nov 2026
---

| | |
|---|---|
| Repository URL | `https://packages.vulnetix.com/helm` |
| Ecosystem ID | `helm` |
| Plan | Enterprise |
| Mode | filter: `index.yaml` is filtered; `.tgz` chart downloads are checked |
| Cooldown | yes, from each chart version's `created` time |
| Default mirror | `https://evgkrsk.github.io/nxs-universal-chart` |

Helm repositories are per URL, and the firewall serves the first active `helm` mirror that answers. The seeded default is a single third-party chart repository. Set your own:

```bash
vulnetix config set package-firewall helm https://charts.example.com --priority 0
vulnetix config set package-firewall helm https://evgkrsk.github.io/nxs-universal-chart --disable
```

## Automatic setup

```bash
vulnetix package-firewall helm
```

This replaces `~/.config/helm/repositories.yaml` (existing file backed up to `.vulnetix.bak`):

```yaml
apiVersion: v1
generated: "0001-01-01T00:00:00Z"
repositories:
- name: vulnetix
  url: "https://packages.vulnetix.com/helm"
  username: "YOUR_ORG_UUID"
  password: "YOUR_API_KEY"
  pass_credentials_all: true
```

> [!CAREFUL] Other repositories are removed and macOS uses another path
> The written file holds only the `vulnetix` repository; your earlier repositories are in the backup. Helm on macOS reads `~/Library/Preferences/helm/repositories.yaml`, so the CLI's file is not seen there. Use the manual command below on macOS.

## Manual equivalent

```bash
helm repo add vulnetix https://packages.vulnetix.com/helm \
  --username "$VULNETIX_ORG_ID" --password "$VULNETIX_API_KEY" --pass-credentials
```

## Use and verify

```bash
helm repo update
helm search repo vulnetix
helm install demo vulnetix/<chart>
```
