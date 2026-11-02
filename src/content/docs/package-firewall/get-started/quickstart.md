---
title: Quickstart
description: Point npm at the Package Firewall, turn on malware and KEV blocking, and confirm a decision in the log.
order: 4
sources: [cli/cmd/package_firewall.go, cli/pkg/packagefirewall/config.go, cli/cmd/config.go, package-firewall/internal/fw/fw.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 02 Nov 2026
---

This walks through npm. Every other ecosystem follows the same three steps; see its [client page](/package-firewall/#ecosystems).

## 1. Sign in

```bash
vulnetix auth login
vulnetix auth status
```

npm needs a Pro, Teams or Enterprise plan. Go and Arch Linux work on Community.

## 2. Configure npm

Preview, then write:

```bash
vulnetix package-firewall npm --dry-run
vulnetix package-firewall npm
```

This writes `~/.netrc`, `~/.npmrc` and `~/.yarnrc.yml`. Check it took:

```bash
npm config get registry
# https://packages.vulnetix.com/npm/
npm cache clean --force
npm install lodash
```

## 3. Set a policy

```bash
vulnetix config set package-firewall \
  --block-malware true \
  --block-kev true \
  --cvss-threshold 9.0 \
  --cooldown-days 7
vulnetix config get package-firewall
```

Changes reach the proxy within 60 seconds.

## 4. See a decision

Request a package directly and read the firewall headers:

```bash
AUTH=$(printf '%s:%s' "$VULNETIX_ORG_ID" "$VULNETIX_API_KEY" | base64 -w0)
curl -s -o /dev/null -D - -H "Authorization: Basic $AUTH" https://packages.vulnetix.com/npm/lodash | grep -i '^x-vulnetix'
```

An allowed request prints nothing here, or only `X-Vulnetix-Firewall-Mode` when the org is not in `enforce` mode. A blocked request carries `X-Vulnetix-Firewall: blocked` and a reason; see [Block responses](/package-firewall/reference/responses/). Every decision is listed in the console at [www.vulnetix.com/resolve/logs#package](https://www.vulnetix.com/resolve/logs#package).

## Next

- [Policy settings](/package-firewall/policy/settings/)
- [Allow and deny lists](/package-firewall/curation/lists/), including namespace entries for packages you publish yourself
- [Troubleshooting](/package-firewall/reference/troubleshooting/)
