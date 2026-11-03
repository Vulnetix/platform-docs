---
title: VEX in a scan
nav: --vex and --vex-file
description: Apply third-party VEX documents to a scan with --vex-file, --vex (a file, a directory or an https URL) and the VexSource documents declared in .vulnetix/config, so every quality gate honours them, and read the summary line that says how many findings VEX hid.
order: 1
sources: [cli/cmd/scan.go, cli/cmd/vex.go, cli/cmd/vex_sources.go, cli/internal/scanopts/fromcobra.go, cli/internal/vex/read.go, cli/docs/vex-sources.md]
checked: [cli@v4.2.0]
updated: 02 Nov 2026
---

`--vex-file`, `--vex` and `--no-vex` are registered on every scan command: `scan`, `sca`, `sast`, `secrets`, `containers` and `iac`. `--vex` and the VexSource documents are in CLI v4.2.0 and later; `--vex-file` and `--no-vex` are older.

```bash
vulnetix sca --vex-file vendor.openvex.json
vulnetix scan --vex-file ./vex/ --severity high
vulnetix sca --vex https://vex.example.com/acme/product.openvex.json
vulnetix sca --vex-file ./vex/ --no-vex     # --no-vex wins
```

| Flag | Default | Description |
|---|---|---|
| `--vex-file` | | VEX file or directory to apply before the gates run. Repeatable. |
| `--vex` | | A VEX file, a directory or an `https://` URL, as `--vex-file` does. Repeatable. |
| `--no-vex` | `false` | Ignore every `--vex-file`, every `--vex` and the declared VexSource documents |

## Where a scan reads VEX from

| Source | How it is read |
|---|---|
| `--vex-file <path>` | A file, or a directory: the `.json` files directly in it, one level. |
| `--vex <path>` | The same as `--vex-file`. |
| `--vex <https URL>` | Downloaded for the run, then read like a file. At most 8 MiB and 30 seconds. A plain `http://` URL is refused. |
| [`VexSource`](/platform-iac/kinds/vex-source/) documents in `.vulnetix/config` | See [Declared VexSource documents](#declared-vexsource-documents). |

Every input is merged into one list and applied once. A file named twice is read once. `--vex` and `--vex-file` are two spellings of the same thing, so a command line can mix them.

The path is the one you give, relative to the working directory. A directory is not walked recursively, and a `.json` file in it that is not VEX, such as an SBOM or SARIF, is skipped. A file you name that cannot be read or parsed as VEX fails the scan. The formats are OpenVEX, CycloneDX VEX and CSAF VEX; see [Formats](/vex/#formats).

### Fetching a URL

A `--vex` URL that cannot be fetched fails the scan, with `--vex: <url>: HTTP 404` or the network error. You asked for it, and a quiet gap would let the gate run with fewer statements than you intended. A URL that is not `https` fails the scan with `--vex http://...: only https URLs are fetched`. The request sends `Accept: application/json` and follows redirects. It sends no credentials, so a URL that needs a token cannot be fetched with `--vex`; download it in an earlier step and pass the file.

### Declared VexSource documents

A scan also reads the [`VexSource`](/platform-iac/kinds/vex-source/) documents under `.vulnetix/config` in the directory being scanned, so a CI gate honours what the organization declared without a second flag. Only the two sources a machine running the scan can reach are read:

| `VexSource` source | What the scan does |
|---|---|
| `path` | Reads the file or directory. A relative path is tried under the scanned directory, then under `.vulnetix/config`. |
| `urls` | Fetches each `https` URL, as `--vex` does. |
| `tea`, `s3`, `git` | Not read. The console fetches these. The scan prints `note: VexSource/<name> reads a tea source, which the console fetches; pass its documents with --vex to honour them here`. |

A declared source keeps the limits it was declared with, and the scan never applies it more widely:

- `scope.repos` applies the source only when the scanned repository's `owner/name` is listed. The name comes from the git remote; a scan with no remote matches no source that has a `scope.repos`.
- `trust.allowedAuthors` drops a document whose author is not on the list, with `note: VexSource/<name>: <file> is by "<author>", which trust.allowedAuthors does not allow; skipped`. The author is the OpenVEX `author`, the first CycloneDX `metadata.authors` name or the CSAF publisher. A document with no author is dropped when a list is set. Names are compared ignoring case.

Nothing else in the document is read by the scan. `trust.requireSignature` is refused by plan and is not checked here, a `sha256` pin or a request header on a `urls` entry is ignored, and `format`, `refresh` and `onError` have no meaning for a scan, which reads the files as they are on every run.

A declared source is best effort, unlike `--vex`. A `path` that does not exist, a URL that cannot be fetched, a `.json` file that is not VEX and a `.vulnetix/config` folder with an invalid document produce a `warning:` line or are skipped, and the scan carries on. The only way to have a source fail the scan is to also name it with `--vex`.

The suppression rules a console-fetched source created are not applied by the CLI. Those rules live on the server, and the API the CLI reads suppressions from does not return them.

### Offline and without a login

Reading VEX needs no Vulnetix credentials and no VDB request. A file, a directory or a `path` source works offline; a URL needs the network for itself only. Without an authenticated session the scan applies the statements and prints the summary, and sends nothing.

## Where it is applied

The statements are matched against the package vulnerabilities in the scan's SBOM, once, immediately before the quality gates. Every gate therefore honours VEX. Only `not_affected` and `fixed` statements hide a finding; `affected` and `under_investigation` never do (see the [status mapping](/vex/#status-mapping)). A finding closed by a `not_affected` or `fixed` statement is removed from the gate input but stays in the SBOM with its `analysis` block, and the SBOM file is rewritten with the annotations.

A document that cannot be read or parsed fails the scan, rather than silently letting the gate run with fewer statements than you asked for.

## What the output says

The count of hidden findings is printed on stderr, so `-o json` and CycloneDX output on stdout stay clean:

```text
VEX: 12 statement(s) from 1 document(s), 12 hidden as VEX not affected, 0 effective
  CVE-2021-23337       VEX not affected (vendor.openvex.json)

  1 packages | 0 vulnerabilities | 12 hidden as VEX not affected
```

The label is "VEX not affected" or "VEX fixed", never "suppressed by rule". A VEX statement is its author's assertion, not an ignore rule your team wrote, and these findings are not reported to Vulnetix as rule applications.

## What is sent to Vulnetix

When the scan is authenticated, every VEX document the scan applied, whether it came from `--vex-file`, `--vex` or a declared source, is sent with origin `scan_vex_file`, tied to this run's SCA snapshot. The VEX files the scan's own reconciliation wrote under `.vulnetix/` are sent with origin `reconcile`. See [VEX sent to Vulnetix](/vex/suppression/sent-to-vulnetix/).

## In CI

```yaml
- name: Scan, honouring vendor VEX
  run: vulnetix scan --vex-file .vulnetix/vendor-vex/ --severity high
  env:
    VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
    VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
```

Check the documents first with `vulnetix vex validate --vex .vulnetix/vendor-vex/`: the scan does not run the semantic checks.
