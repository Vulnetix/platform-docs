---
title: File permissions and isolation
nav: File permissions
description: The modes the CLI sets on credential files, what it checks on read, and how to keep credentials out of repositories, images, logs and shell history on Linux, macOS, Windows and containers.
order: 7
sources: [cli/pkg/auth/credentials.go, cli/pkg/auth/netrc.go, cli/pkg/auth/keyring.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

## What the CLI sets and checks

| Path | Mode | When |
|---|---|---|
| `~/.vulnetix/` (or `VULNETIX_CREDENTIALS_DIR`, or `--store-dir`) | `0700` | Created by `auth login` |
| `~/.vulnetix/credentials.json` | `0600` | Every write |
| `./.vulnetix/credentials.json` | `0600` | Every write |
| `~/.netrc` | `0600` | Every write by `package-firewall`, and checked on every read |

Only netrc is checked when read: a group or other bit makes the CLI refuse it (`permissions are too open; run chmod 600 ...`). `credentials.json` is not re-checked, so a `umask` change, a restore from backup, `cp -r` or a bind mount can widen it unnoticed. Check it yourself:

```sh
stat -c '%a %U %n' ~/.vulnetix ~/.vulnetix/credentials.json ~/.netrc 2>/dev/null   # Linux
stat -f '%Lp %Su %N' ~/.vulnetix ~/.vulnetix/credentials.json ~/.netrc 2>/dev/null # macOS
chmod 700 ~/.vulnetix && chmod 600 ~/.vulnetix/credentials.json ~/.netrc
```

## Never commit credentials

Before creating a project credential:

```sh
printf '.vulnetix/\n' >> .gitignore
printf '.vulnetix/\n' >> .dockerignore
```

`.dockerignore` matters as much as `.gitignore`: `COPY . .` puts the file into an image layer that `docker history` and every derived image can read. A credential that was pushed must be rotated; rewriting history does not recall clones. `vulnetix secrets` scans the tree and its git history for hardcoded credentials; see [Secrets](/secrets/).

## Linux

Prefer `--store keyring` on a desktop session with GNOME Keyring or KWallet. On a server without a Secret Service, keep the home file at `0600` and consider a `tmpfs` directory with `VULNETIX_CREDENTIALS_DIR` (see [Custom directory](/cli/authentication/storage/#custom-directory)).

Extended ACLs can grant access the mode bits do not show. Remove them:

```sh
getfacl ~/.vulnetix/credentials.json
setfacl -b ~/.vulnetix/credentials.json
```

Under SELinux the files should carry the normal home label; `restorecon -Rv ~/.vulnetix` resets it after a move.

## macOS

`--store keyring` uses the login keychain, which is unlocked with your session. If the keychain is locked, the load fails and the source shows as `unusable` in `auth status`; unlock it and run again.

Time Machine and other backups copy `~/.vulnetix/credentials.json` and `~/.netrc` in plain text unless the backup is encrypted. Exclude them, or use the keychain:

```sh
tmutil addexclusion ~/.vulnetix/credentials.json
```

## Windows

Mode bits do not apply, and the CLI makes no permission check on `%USERPROFILE%\_netrc`. Restrict both files to your account and `SYSTEM` with their ACLs:

```powershell
$dir = "$env:USERPROFILE\.vulnetix"
icacls $dir /inheritance:r
icacls $dir /grant:r "$($env:USERNAME):(OI)(CI)F" "SYSTEM:(OI)(CI)F"
icacls "$env:USERPROFILE\_netrc" /inheritance:r
icacls "$env:USERPROFILE\_netrc" /grant:r "$($env:USERNAME):F" "SYSTEM:F"
icacls $dir
```

`--store keyring` uses Credential Manager. `cmdkey /list | Select-String vulnetix` lists the entries.

## Containers

In order of preference:

1. **Environment variables, read-only root filesystem.** Nothing can be written. See the Kubernetes example on [Authentication in CI/CD](/cli/authentication/ci-cd/#rules-for-every-platform).
2. **A secret file mounted on tmpfs**, exported into the environment by the entrypoint:
   ```sh
   docker run --rm --read-only --tmpfs /tmp \
     -e HOME=/tmp -e VULNETIX_ORG_ID \
     -v "$PWD/secrets/vulnetix_api_key:/run/secrets/vulnetix_api_key:ro" \
     -v "$PWD:/workspace" -w /workspace \
     registry.example.com/ci/vulnetix:3.154.0 \
     sh -c 'VULNETIX_API_KEY="$(cat /run/secrets/vulnetix_api_key)" exec vulnetix scan'
   ```
3. **A BuildKit secret during `docker build`**, never stored in a layer:
   ```dockerfile
   # syntax=docker/dockerfile:1
   RUN --mount=type=secret,id=vulnetix_api_key \
       VULNETIX_API_KEY="$(cat /run/secrets/vulnetix_api_key)" vulnetix scan --fail-on high
   ```
   `docker build --secret id=vulnetix_api_key,src=./api_key.txt --build-arg VULNETIX_ORG_ID=... .`
4. **Your own credential bind-mounted read-only**, for local use only: `-v "$HOME/.vulnetix:/home/app/.vulnetix:ro"`, and run as your own user (`--user "$(id -u):$(id -g)"`), not root.

Never:

- `ENV VULNETIX_API_KEY=...` in a Dockerfile: it is in `docker history` and every derived image.
- `--build-arg VULNETIX_API_KEY=...`: recorded in the image metadata.
- `COPY .vulnetix/ ...`: puts the credential in a layer.

## Shell history and argv

A key passed as a flag is visible in `ps` and `/proc/<pid>/cmdline` while the command runs, and lands in shell history. Prefer the environment:

```sh
# bash, zsh: with HISTCONTROL=ignorespace a leading space keeps the line out of history
 export VULNETIX_API_KEY=6e40f1c3...
export VULNETIX_ORG_ID=8ff8f1e4-0000-4000-8000-000000000000
vulnetix auth login --noninteractive --store keyring
```

`--noninteractive` reads both values from the environment, so the key never appears in argv. Look for keys that already leaked, and rotate any you find:

```sh
grep -nE 'VULNETIX_(API_KEY|API_TOKEN)|VVD_SECRET|--api-key|--secret' ~/.bash_history ~/.zsh_history 2>/dev/null
```
