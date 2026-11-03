---
title: Chef Supermarket
nav: Chef
description: Point Berkshelf and knife at the Package Firewall's Supermarket API.
order: 23
sources: [package-firewall/internal/ecosystem/chef/chef.go, package-firewall/internal/ecosystem/ecosystem.go, cli/pkg/packagefirewall/ecosystem.go]
checked: [package-firewall@333285f, cli@4c8c3b7]
updated: 03 Nov 2026
---

| | |
|---|---|
| Supermarket URL | `https://packages.vulnetix.com/chef` |
| Ecosystem ID | `chef` |
| Plan | Add-on |
| Mode | filter: `/api/v1/cookbooks/<name>` is filtered by version; cookbook downloads are checked |
| Cooldown | yes |
| Default mirror | `https://supermarket.chef.io` |
| Automatic setup | none: `vulnetix package-firewall chef` exits 1 |

## Configuration

The firewall needs Basic auth on every request. Both tools take it as URL userinfo.

Berkshelf, `Berksfile`:

```ruby
source "https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/chef"
```

knife, `~/.chef/config.rb`:

```ruby
knife[:supermarket_site] = "https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/chef"
```

Read the key from the environment rather than committing it:

```ruby
source "https://#{ENV.fetch('VULNETIX_ORG_ID')}:#{ENV.fetch('VULNETIX_API_KEY')}@packages.vulnetix.com/chef"
```

## Use

```bash
berks install
knife supermarket download apt
```

No CLI writer exists for Chef, so this configuration has not been exercised by `vulnetix package-firewall`. Confirm requests appear as `chef` in the [decision log](/package-firewall/operations/decision-log/).
