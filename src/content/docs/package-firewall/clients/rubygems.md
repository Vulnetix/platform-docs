---
title: RubyGems and Bundler
nav: RubyGems
description: Point gem and Bundler at the Package Firewall, including the Bundler mirror that makes bundle install go through it.
order: 6
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/gem/gem.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 03 Nov 2026
---

| | |
|---|---|
| Source URL | `https://packages.vulnetix.com/gem/` |
| Ecosystem ID | `gem` |
| CLI command | `vulnetix package-firewall gem` |
| Plan | Add-on |
| Mode | filter: the compact index is filtered |
| Cooldown | yes |
| Default mirror | `https://rubygems.org` |

## Automatic setup

```bash
vulnetix package-firewall gem
```

| File | Read by |
|---|---|
| `~/.gemrc` | the `gem` command |
| `~/.bundle/config` | Bundler, which ignores `.gemrc` and uses the Gemfile's `source` |

`~/.gemrc` gets a managed block:

```yaml
:sources:
- https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/gem/
```

`~/.bundle/config` gets:

```yaml
BUNDLE_MIRROR__ALL: "https://packages.vulnetix.com/gem/"
BUNDLE_MIRROR__HTTPS://RUBYGEMS__ORG: "https://packages.vulnetix.com/gem/"
BUNDLE_PACKAGES__VULNETIX__COM: "YOUR_ORG_UUID:YOUR_API_KEY"
```

`mirror.all` redirects every Gemfile source through the firewall. The `rubygems.org` key is for Bundler versions before `mirror.all`. Bundler keys credentials on the mirror host, not the URL.

## Manual equivalent for Bundler

```bash
bundle config set --global mirror.https://rubygems.org https://packages.vulnetix.com/gem/
bundle config set --global packages.vulnetix.com "$VULNETIX_ORG_ID:$VULNETIX_API_KEY"
```

## Use and verify

```bash
gem sources --list
bundle config
bundle install
```

## Notes

- Without the Bundler mirror, `bundle install` goes straight to the Gemfile source and never meets the firewall.
- `Gemfile.lock` pinned to a blocked version fails at download. Run `bundle update <gem>`.
