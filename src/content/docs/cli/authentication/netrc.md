---
title: netrc and the Package Firewall
nav: netrc
description: The machine packages.vulnetix.com netrc entry that the Package Firewall commands write, how the CLI reads it as a credential, and how to remove it.
order: 5
sources: [cli/pkg/auth/netrc.go, cli/pkg/auth/credentials.go, cli/cmd/package_firewall.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

The Package Firewall authenticates package managers with HTTP Basic auth from netrc. The CLI reads the same entry as its sixth credential source, so a machine set up for the firewall is also signed in for every other command.

## Location and format

| Platform | Path |
|---|---|
| Linux, macOS | `~/.netrc` |
| Windows | `%USERPROFILE%\_netrc` |

```text
machine packages.vulnetix.com
  login 8ff8f1e4-0000-4000-8000-000000000000
  password 6e40f1c3...
```

`login` is the organisation ID and `password` the ApiKey (a leading `<orgId>:` is stripped). The entry may be on one line or several; `#` comments are ignored, and the entry ends at the next `machine` or `default`. A `default` entry is never used as a Vulnetix credential.

## Writing it

Every `vulnetix package-firewall <ecosystem>` command writes the entry first, idempotently, then that ecosystem's own configuration:

```sh
vulnetix package-firewall npm --dry-run   # show the changes
vulnetix package-firewall npm
```

The entry is written from the credential in use, which must be an ApiKey, or a SigV4 secret (the command fetches the derived ApiKey and writes that). A bearer token fails with `unsupported authentication method: token`. The commands, and what each writes for its package manager, are on [Package Firewall](/package-firewall/). By hand:

```sh
umask 077
cat >> ~/.netrc <<EOF
machine packages.vulnetix.com
  login $VULNETIX_ORG_ID
  password $VULNETIX_API_KEY
EOF
chmod 600 ~/.netrc
```

## Permissions are checked on every read

On Linux and macOS, a netrc file with any group or other permission bit set is refused:

```text
/home/you/.netrc permissions are too open; run chmod 600 /home/you/.netrc
```

`auth status` shows the netrc row as `unusable`, and credential resolution stops there with `netrc credentials are not usable`. VDB commands then fall back to community access; `upload` fails. Fix with `chmod 600 ~/.netrc`.

On Windows no mode check is made. Protect `_netrc` with its NTFS ACL; see [File permissions](/cli/authentication/file-permissions/#windows).

## Where it sits in precedence

The netrc entry is read only when no environment credential and no credentials file is found (see [Credential precedence](/cli/authentication/precedence/)). Two consequences:

- Configuring any ecosystem signs the CLI in.
- `vulnetix auth logout` leaves the netrc entry, so the CLI stays signed in.

## Removing the entry

`package-firewall uninstall` removes ecosystem configuration. It removes the netrc entry only when asked:

```sh
vulnetix package-firewall uninstall --all --remove-credentials   # every ecosystem and the netrc entry
vulnetix package-firewall uninstall --purge                      # the same
vulnetix auth logout
vulnetix auth status    # expect: Community - unauthenticated (VDB only)
```

Or delete the `machine packages.vulnetix.com` stanza by hand.

## Handling

netrc is plain text by design: the package managers that read it cannot read a keychain. One ApiKey backs every configured package manager, so treat it as an organisation-wide credential:

- Keep it out of repositories, container images and bind mounts unless the container fetches packages.
- Leave it out of backups you do not control.
- On shared hosts, use per-user entries, not a system-wide file.
- Rotate the key it contains with your other credentials: [Rotation](/cli/authentication/rotation/).
