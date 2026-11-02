---
title: Composer
description: Replace Packagist with the Package Firewall's Composer repository and put the credentials in auth.json.
order: 9
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/composer/composer.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 02 Nov 2026
---

| | |
|---|---|
| Repository URL | `https://packages.vulnetix.com/composer` |
| Ecosystem ID | `composer` |
| Plan | Pro |
| Mode | filter: Packagist v2 metadata is filtered |
| Cooldown | yes |
| Default mirror | `https://repo.packagist.org` |

## Automatic setup

```bash
vulnetix package-firewall composer
```

This writes two whole files under `~/.composer/`, backing up existing ones to `.vulnetix.bak`.

`~/.composer/config.json`:

```json
{
  "repositories": {
    "packagist.org": false,
    "vulnetix": {
      "type": "composer",
      "url": "https://packages.vulnetix.com/composer"
    }
  }
}
```

`~/.composer/auth.json`:

```json
{
  "http-basic": {
    "packages.vulnetix.com": {
      "password": "YOUR_API_KEY",
      "username": "YOUR_ORG_UUID"
    }
  }
}
```

Composer reads credentials only from `auth.json` (or `config.http-basic`). `http-basic` at the top of `config.json` is ignored and gives `401`.

> [!CAREFUL] Check Composer's home directory
> The CLI writes to `~/.composer`. If `~/.config/composer` exists, Composer uses that directory instead and never sees these files. Run `composer config --global home` and, if it differs, copy both files there or set `COMPOSER_HOME=~/.composer`.

## Manual equivalent

```bash
composer config --global repositories.packagist.org false
composer config --global repositories.vulnetix composer https://packages.vulnetix.com/composer
composer config --global http-basic.packages.vulnetix.com "$VULNETIX_ORG_ID" "$VULNETIX_API_KEY"
```

## Use and verify

```bash
composer config --global --list | grep -i vulnetix
composer clear-cache
composer require monolog/monolog
```
