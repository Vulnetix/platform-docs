---
title: Install, update and uninstall
nav: Install
description: Install the vulnetix binary with the install script, Homebrew, Scoop or a direct download, keep it current, and remove it.
order: 2
sources: [cli/install.sh, cli/internal/update/updater.go, cli/internal/update/checker.go, cli/internal/update/state.go, cli/cmd/root.go, cli/flake.nix, cli/go.mod, cli/.github/workflows/release.yml, homebrew-tap/Formula/vulnetix.rb, homebrew-tap/Formula/crit-validate.rb, ietf-crit-spec/README.rst, scoop-bucket/bucket/vulnetix.json]
checked: [cli@24498404a]
updated: 05 Nov 2026
---

Every release publishes prebuilt binaries to [GitHub Releases](https://github.com/Vulnetix/cli/releases). The install script, Homebrew and Scoop all install those same binaries.

| Method | Command | Platforms |
|---|---|---|
| Install script | `curl -fsSL https://cli.vulnetix.com/install.sh \| sh` | Linux, macOS, Windows under Git Bash, MSYS2 or Cygwin |
| Homebrew | `brew install vulnetix/tap/vulnetix` | macOS and Linux, amd64 and arm64 |
| Scoop | `scoop bucket add vulnetix https://github.com/Vulnetix/scoop-bucket` then `scoop install vulnetix` | Windows, amd64 and arm64 |
| Direct download | See [Release assets](#release-assets) | All |

Check the install:

```sh
vulnetix --version   # prints the bare version, e.g. 3.154.0
vulnetix version     # version, commit, build date and Go version
```

## Install script

```sh
# Latest release into /usr/local/bin, or ~/.local/bin if that is not writable
curl -fsSL https://cli.vulnetix.com/install.sh | sh

# Choose the directory
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"

# Pin a release
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --version v4.0.0

# Stay on v3 (frozen at v3.169.2)
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --version v3

# Refuse to install unless cosign verifies the release's signed provenance
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --require-provenance
```

| Option | Environment | Default | Meaning |
|---|---|---|---|
| `--install-dir <dir>` | `INSTALL_DIR` | `/usr/local/bin` | Where `vulnetix` is written. If the directory cannot be created or written, the script falls back to `$HOME/.local/bin` and says so. |
| `--version <tag>` | `VERSION` | `latest` | A release tag such as `v4.0.0`, a major channel such as `v4` (the newest v4 release), or `latest`. `v3` still resolves, to the last v3 release. Each is resolved to a concrete tag before downloading. See [Versions and release channels](/cli/ci-cd/versions-and-channels/). |
| `--require-provenance` | `VULNETIX_REQUIRE_PROVENANCE=1` | off | Fail unless `cosign` is on `PATH` and the release's `provenance.sigstore.json` verifies for the downloaded binary. |
| `--insecure-skip-verify` | `VULNETIX_INSECURE_SKIP_VERIFY=1` | off | Install without checking the checksum or the provenance, with a warning. Not recommended. Cannot be combined with `--require-provenance`. |
| `--help` | | | Print usage, the verification rules and the analytics opt-outs. |

What the script does, in order:

1. Detects the OS (`linux`, `darwin`, `windows` for MINGW, MSYS and Cygwin) and architecture (`amd64`, `arm64`, `arm` for armv6 and armv7, `386`). Anything else exits with `unsupported OS` or `unsupported architecture`.
2. Downloads `vulnetix-<os>-<arch>` (`.exe` on Windows) with curl or wget, retrying truncated transfers.
3. Checks the file size against the server's, then checks its SHA-256 against the release's `checksums.txt`. A mismatch stops the install with `error: checksum mismatch`. The install also stops when no SHA-256 tool is found (`sha256sum`, `shasum`, `sha256`, `openssl`, `python3`, `python`, `rhash`, `certutil`), when `checksums.txt` cannot be fetched, or when it has no entry for the binary. `--insecure-skip-verify` is the only way past these.
4. When `cosign` is on `PATH`, fetches the release's `provenance.sigstore.json` and runs `cosign verify-blob-attestation` on the downloaded binary (see [Verify a download](#verify-a-download)). A bundle that does not verify stops the install. A release with no bundle installs on the checksum alone, unless `--require-provenance` is set. With `--require-provenance`, a release resolved from `latest` or a channel that was published in the last few minutes is given up to ten minutes for its bundle, which is signed shortly after the release.
5. Moves the binary into place as `vulnetix`, runs `vulnetix version`, warns if the directory is not on `PATH`, and prints the next steps: `vulnetix auth login`, then `vulnetix scan`.

On Windows the file is saved as `vulnetix` with no `.exe`. Git Bash, MSYS2 and Cygwin run it; PowerShell and cmd do not. For those, use Scoop or the `.exe` from the release.

After a successful install the script sends one anonymous install event to Google Analytics: OS, architecture, version and a random id made for that install and never stored. It prints a line when it does. `VULNETIX_NO_ANALYTICS=1` or `DO_NOT_TRACK=1` turns it off.

On Alpine and other minimal images, install `curl` (or `wget`) and `ca-certificates` first: `apk add --no-cache curl ca-certificates`.

## Homebrew

```sh
brew install vulnetix/tap/vulnetix
brew upgrade vulnetix/tap/vulnetix
brew uninstall vulnetix
```

The formula in [Vulnetix/homebrew-tap](https://github.com/Vulnetix/homebrew-tap) downloads the release binary for the machine's OS and architecture and pins its SHA-256. The release workflow updates it on every release. It does not install shell completions; see [completion](/cli/commands/completion/).

The same tap also carries `crit-validate`, a separate tool and not part of `vulnetix`. It checks CVE records (CVE JSON 5) that carry CRIT extensions against the rules of the [CRIT specification](https://github.com/Vulnetix/ietf-crit-spec), and converts a CRIT record between its JSON form and its vector string. Install it with `brew install vulnetix/tap/crit-validate` (macOS and Linux, amd64 and arm64), or `go install github.com/Vulnetix/ietf-crit-spec/cmd/crit-validate@latest`.

## Scoop

```powershell
scoop bucket add vulnetix https://github.com/Vulnetix/scoop-bucket
scoop install vulnetix
scoop update vulnetix
```

The manifest carries the `amd64` and `arm64` Windows builds. There is no 32-bit Windows build.

## Release assets

Each release on GitHub carries:

| Asset | Contents |
|---|---|
| `vulnetix-linux-amd64`, `vulnetix-linux-arm64`, `vulnetix-linux-arm`, `vulnetix-linux-386` | Linux binaries |
| `vulnetix-darwin-amd64`, `vulnetix-darwin-arm64` | macOS binaries (Intel, Apple silicon) |
| `vulnetix-windows-amd64.exe`, `vulnetix-windows-arm64.exe` | Windows binaries |
| `checksums.txt` | SHA-256 of every asset |
| `provenance.sigstore.json` | SLSA build provenance |
| `vulnetix.cdx.json.sig`, `vulnetix.cdx.json.pem`, `vulnetix.cdx.json.intoto.jsonl` | Signature, certificate and in-toto attestation for the CLI's own SBOM |
| `vulnetix-sensor-*` | The runtime sensor; see [Virtual patching](/virtual-patching/) |

The binaries are not archived. Download, mark executable and move:

```sh
curl -fsSLo vulnetix https://github.com/Vulnetix/cli/releases/latest/download/vulnetix-linux-amd64
curl -fsSLO https://github.com/Vulnetix/cli/releases/latest/download/checksums.txt
grep ' vulnetix-linux-amd64$' checksums.txt | sed 's/vulnetix-linux-amd64$/vulnetix/' | sha256sum -c -
chmod +x vulnetix
sudo mv vulnetix /usr/local/bin/
```

```powershell
$dir = "$env:LOCALAPPDATA\Programs\vulnetix"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest -Uri https://github.com/Vulnetix/cli/releases/latest/download/vulnetix-windows-amd64.exe -OutFile "$dir\vulnetix.exe"
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";$dir", "User")
```

Open a new terminal for the `Path` change to apply.

## Verify a download

The checksum shows the file is the one the release lists. The provenance shows the release workflow built it: `provenance.sigstore.json` is an SLSA v1 statement whose subjects are every line of `checksums.txt`, signed keyless through Sigstore with a public Rekor entry. The signing certificate names the reusable workflow `.github/workflows/slsa-provenance.yml` in `Vulnetix/cli`, not `release.yml`.

```sh
V=v4.17.1   # the release you downloaded
curl -fsSLO "https://github.com/Vulnetix/cli/releases/download/$V/provenance.sigstore.json"
cosign verify-blob-attestation \
  --bundle provenance.sigstore.json --new-bundle-format \
  --type slsaprovenance1 \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp '^https://github\.com/Vulnetix/cli/\.github/workflows/slsa-provenance\.yml@refs/(heads/main|tags/v[0-9]+\.[0-9]+\.[0-9]+.*)$' \
  --certificate-github-workflow-repository Vulnetix/cli \
  vulnetix
```

`Verified OK` means the binary's digest is a subject of a statement that workflow signed. Every v4 release has a bundle; some v3 releases do not. The GitHub Action runs the same check by default (`verify-provenance: true`); see [GitHub Actions](/cli/ci-cd/github-actions/).

## How a release reaches each channel

Pushing a full version tag (`v4.0.0`, or a pre-release such as `v4.1.0-rc.1`) runs the release workflow. One GitHub release feeds every channel, so a channel is never ahead of the release assets.

| Channel | Updated by | When it has the new version |
|---|---|---|
| GitHub Releases | The `release` job builds every OS and architecture, writes `checksums.txt` and the provenance, and publishes the release | When the job finishes |
| Install script | Nothing to publish: `install.sh` resolves `latest` from GitHub Releases | At once |
| Homebrew ([Vulnetix/homebrew-tap](https://github.com/Vulnetix/homebrew-tap)) | The `update-packages` job rewrites `Formula/vulnetix.rb` with the new URLs and SHA-256 values | When the job finishes |
| Scoop ([Vulnetix/scoop-bucket](https://github.com/Vulnetix/scoop-bucket)) | The `update-packages` job rewrites `bucket/vulnetix.json` with hashes from `checksums.txt` | When the job finishes |
| Nix flake | The `update-packages` job sets `version` in the repository's `flake.nix` | When the job finishes; see [Building from source](#building-from-source) |
| Go module proxy | Nothing to publish: `proxy.golang.org` indexes the tag | Usually 5 to 15 minutes after the tag is pushed |
| GitHub Action (`Vulnetix/cli@v4`) | The floating major tag `v4` is moved to the new release | When the tag is moved |

`update-packages` runs only for the newest release, so an older release that finishes late never rolls Homebrew, Scoop or the flake back.

The same tap also carries `vvd-search`, the terminal UI for searching the vulnerability database (`brew install vulnetix/tap/vvd-search`), and `belai`.

If a new release does not show up:

| Symptom | Check |
|---|---|
| `brew upgrade` or `scoop update` still installs the old version | Run `brew update` or `scoop update` first so the tap or bucket is refreshed, then check the release workflow's `update-packages` job finished |
| `go install …@latest` installs an older version | The proxy has not indexed the tag yet. Ask for the tag (`@v4.0.0`) or wait. A stale module cache can be cleared with `go clean -modcache`. |
| A direct download returns 404 | The asset name is `vulnetix-<os>-<arch>` (`.exe` on Windows) with no archive; check [Release assets](#release-assets) |

## Building from source

> [!CAREFUL] go install and the Nix flake do not build outside Vulnetix
> The CLI depends on `github.com/Vulnetix/vdb-sca-match`, which is a private repository. `go install github.com/vulnetix/cli/v4@latest`, `go build` in a clone, and `nix run github:Vulnetix/cli` all fail to fetch it unless your Git credentials can read that repository. The flake also ships with `vendorHash = pkgs.lib.fakeHash`, so `nix build` stops at the hash check even with access. Use a prebuilt binary.

With access, the module path needs its `/v4` suffix, and the binary built is a source build:

```sh
GOPRIVATE=github.com/Vulnetix/* go install github.com/vulnetix/cli/v4@latest
```

## Updating

```sh
vulnetix update
```

| How it was installed | What `vulnetix update` does |
|---|---|
| Release binary (script, download, Homebrew, Scoop) | Downloads the latest release asset for this OS and architecture and replaces the running binary in place |
| `go install` (the binary is in `$GOBIN`, `$GOPATH/bin` or `~/go/bin`) | Runs `go install github.com/vulnetix/cli/v4@latest` |
| Source build (version contains `-dev`, or no commit was stamped) | Refuses: `this binary was built from source` |

`vulnetix update` does not check the download against `checksums.txt`; the install script does. Under Homebrew or Scoop, update with the package manager so its records stay correct.

### Update notices

Once every 24 hours a command checks GitHub for a newer release in the background and, after the command finishes, prints `Update available: vX → vY` to stderr. The check is skipped when the CLI detects a CI system or container (GitHub Actions, GitLab CI, Azure DevOps, Bitbucket, Jenkins, Kubernetes, Podman, Docker), for `-dev` builds, under `vulnetix lsp`, and inside agent hooks. The time of the last check is kept in `~/.vulnetix/state/`.

## Uninstalling

Remove the binary (`which vulnetix` shows where it is), then remove what it stored:

```sh
vulnetix auth logout          # credentials files and keychain entries
rm -rf ~/.vulnetix            # caches, state, scan memory
```

Each project you scanned has its own `.vulnetix/` directory; see [Files](/cli/reference/files/). `vulnetix auth logout` leaves a `machine packages.vulnetix.com` entry in `~/.netrc` alone; see [netrc](/cli/authentication/netrc/#removing-the-entry).
