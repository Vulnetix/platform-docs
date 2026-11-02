---
title: Compatibility policy
nav: Compatibility
description: How schema versions move, which changes need a major release, and the exact checks cmd/schemacheck runs before a release is published.
order: 4
sources: [config-schemas/cmd/schemacheck/main.go, config-schemas/cmd/schemacheck/main_test.go, config-schemas/.github/workflows/release.yml, config-schemas/README.md]
checked: [config-schemas@9bda9e1]
updated: 02 Nov 2026
---

Two version numbers matter, and they move separately:

| Version | Example | Changes when |
|---|---|---|
| `apiVersion` | `vulnetix.com/v1` | The document format itself changes. It has not, and every released kind is `v1`. |
| Schema release | `v1.0.1` | Any schema is added or changed. Additive changes are a minor release; a change that can reject a document an earlier release accepted needs a major release. |

So a document that validates against `v1.x.y` validates against every later `v1` release.

## The rule the release enforces

Before publishing, the release workflow finds the previous `vMAJOR.MINOR.PATCH` tag (by version sort) and runs:

```sh
go run ./cmd/schemacheck compat --base <previous schemas> --version <tag> --previous <previous tag>
```

`compat` compares each schema file of the previous release with the same file in the new tree. If it finds breaking changes and the new major version is not higher than the old one, the job fails before anything is built or signed:

```text
breaking: common.schema.json/$defs/severity: enum value low removed
schemacheck: 1 breaking changes need a major version, not v1.1.0 after v1.0.1
```

With a major bump, the same changes are listed and allowed. The first release has nothing to compare.

## What counts as breaking

The check reads the keywords in this table. It does not read `format`, `not`, `if`/`then`/`else`, `dependentRequired`, `propertyNames` or `uniqueItems`, so a tightening there is not caught by the tool and has to be caught in review.

| Change | Breaking |
|---|---|
| A schema file removed | yes |
| A `type` value removed, or a `type` constraint added where there was none | yes |
| A `const` added or changed | yes |
| An `enum` value removed, or an `enum` added where there was none | yes |
| A property becomes `required` | yes |
| `additionalProperties` closed to `false` | yes |
| `minimum`, `exclusiveMinimum`, `minLength`, `minItems` or `minProperties` added or raised | yes |
| `maximum`, `exclusiveMaximum`, `maxLength`, `maxItems` or `maxProperties` added or lowered | yes |
| `pattern` changed in any way | yes |
| `$ref` pointed at a different definition (a changed version in the URL is ignored) | yes |
| A property removed from an object that does not allow other keys | yes |
| A `$defs` entry removed | yes |
| `allOf`, `anyOf` or `oneOf` changed length | yes |
| A new optional property, kind, enum value or definition | no |
| A constraint removed or relaxed | no |
| A description or default changed | no |

The check walks `properties`, `$defs`, `items`, `additionalProperties` and each branch of `allOf`, `anyOf` and `oneOf`, so a change deep inside a kind is found at its full path.

> [!WHY] Why defaults are not checked
> A default only says what the server does when a field is left out. Changing it changes behaviour, not which documents are valid, so it is a release-notes matter rather than a version-number one.

## What this means for you

- Pin a schema version in CI if you want behaviour to change only when you choose.
- Within a major version, moving to `latest` is meant never to make a valid document invalid. The checks above enforce that for the keywords they read.
- A breaking change is listed, path by path, in the release job log of the major release that made it.
