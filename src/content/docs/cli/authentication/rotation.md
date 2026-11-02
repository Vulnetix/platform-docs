---
title: Rotation and revocation
nav: Rotation
description: Replacing a credential without downtime in each store, proving the old one is dead, and what to do first when one leaks.
order: 8
sources: [cli/cmd/auth.go, cli/pkg/auth/credentials.go, cli/cmd/package_firewall.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

## Suggested cadence

These are recommendations; the CLI enforces no expiry.

| Credential | Rotate |
|---|---|
| CI key or token | Every 90 days, and when the pipeline is retired |
| Developer key | Every 180 days, and on a new machine |
| SigV4 secret | Every 365 days, and at once on any suspicion: other keys are derived from it |
| netrc entry | With the ApiKey inside it |

Rotate at once when a credential appears in a commit, log, screenshot, ticket or shell history; when someone with access leaves; when a laptop or runner is lost or rebuilt; when a dependency in a pipeline that held it turns out malicious; or when `vulnetix auth status` shows a source you did not set up.

## Without downtime

Issue the new credential before revoking the old one.

1. Issue a new key in the console.
2. Prove it works without touching the stored one:
   ```sh
   VULNETIX_API_KEY="$NEW_KEY" VULNETIX_ORG_ID="$ORG" vulnetix auth verify
   ```
3. Put it in place (below, per store).
4. Wait one full pipeline cycle so running jobs finish with the old value.
5. Revoke the old key in the console.
6. Prove the old one is dead:
   ```sh
   VULNETIX_API_KEY="$OLD_KEY" VULNETIX_ORG_ID="$ORG" vulnetix auth verify   # must exit 1
   ```

## Per store

### Keychain and files

Log in again with the same `--store`. `auth login` verifies the new credential before it writes, and only then overwrites the file and the keychain entry, so a bad key leaves the working one in place:

```sh
VULNETIX_API_KEY="$NEW_KEY" VULNETIX_ORG_ID="$ORG" vulnetix auth login --noninteractive --store keyring
vulnetix auth status
```

Run `vulnetix auth logout` first only when you also want to clear the other store (a project file, say).

### netrc

```sh
vulnetix package-firewall uninstall --all --remove-credentials
VULNETIX_API_KEY="$NEW_KEY" VULNETIX_ORG_ID="$ORG" vulnetix package-firewall npm
```

Every package manager configured against `packages.vulnetix.com` uses the new value on its next request. Re-run one `package-firewall <ecosystem>` command for each package manager you use.

### Environment variables

Change the value in the CI secret store, or redeploy the service that sets it. Then look for copies:

```sh
grep -rlE 'VULNETIX_(API_KEY|API_TOKEN)|VVD_SECRET' \
  ~/.bashrc ~/.zshrc ~/.profile ~/.config/fish/config.fish /etc/environment /etc/systemd/system 2>/dev/null
```

## When a credential leaks

Revoke first; investigate after.

1. **Revoke** it in the console.
2. **Rotate** everything that shared the exposure. A leaked CI key means every secret that pipeline could read is suspect.
3. **Check the machines** that held it. Someone with file access may have added a project file, a netrc entry or an environment variable, any of which outranks your home credential:
   ```sh
   vulnetix auth status
   find . -path '*/.vulnetix/credentials.json'
   grep -c 'machine packages.vulnetix.com' ~/.netrc
   ```
4. **Audit** what it could reach: uploaded results, policy changes, Package Firewall configuration, private package fetches.
5. **Purge** the value from logs, artifacts, chat and tickets. That is cleanup; step 1 was the fix.
6. **Re-issue** consumers with separate credentials, so the next leak names one system.

Rewriting git history does not recall a pushed secret. Assume every clone, fork, cache and mirror has it.

## What each credential reaches

| Credential | Used by the CLI for |
|---|---|
| ApiKey | Every organisation API call: VDB lookups at your plan's limits, uploads and snapshots, policy reads and writes |
| SigV4 secret | The same, and it derives the ApiKey (`HMAC-SHA256(secret, org)`), so it is the one to hold in a keychain or vault |
| Bearer token | The same calls, as the issuing user |
| netrc entry | An ApiKey: Package Firewall fetches for every configured package manager, and CLI sign-in |
