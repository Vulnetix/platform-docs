---
title: NuGet
description: Replace nuget.org with the Package Firewall's NuGet v3 feed for dotnet and nuget.
order: 8
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/nuget/nuget.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 02 Nov 2026
---

| | |
|---|---|
| Service index | `https://packages.vulnetix.com/nuget/v3/index.json` |
| Ecosystem ID | `nuget` |
| Plan | Pro |
| Mode | filter |
| Cooldown | yes |
| Default mirror | `https://api.nuget.org` |

## Automatic setup

```bash
vulnetix package-firewall nuget
```

This replaces `~/.nuget/NuGet/NuGet.Config`, backing up an existing file to `NuGet.Config.vulnetix.bak`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="vulnetix" value="https://packages.vulnetix.com/nuget/v3/index.json" />
  </packageSources>
  <packageSourceCredentials>
    <vulnetix>
      <add key="Username" value="YOUR_ORG_UUID" />
      <add key="ClearTextPassword" value="YOUR_API_KEY" />
    </vulnetix>
  </packageSourceCredentials>
</configuration>
```

`<clear />` removes nuget.org and every other inherited source.

## Manual equivalent

```bash
dotnet nuget add source https://packages.vulnetix.com/nuget/v3/index.json \
  --name vulnetix --username "$VULNETIX_ORG_ID" --password "$VULNETIX_API_KEY" \
  --store-password-in-clear-text
dotnet nuget disable source nuget.org
```

## Use and verify

```bash
dotnet nuget list source
dotnet nuget locals all --clear
dotnet restore
```

## Notes

- A `nuget.config` in the repository is read before the user file. If it adds `nuget.org` back, that source bypasses the firewall.
