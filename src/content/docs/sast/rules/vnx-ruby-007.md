---
title: "VNX-RUBY-007: YAML.load() insecure deserialization"
nav: "VNX-RUBY-007"
description: "Reports YAML.load (and YAML::load), Psych.load, YAML.unsafe_load, load_stream, load_documents, load_file and unsafe_load_file when request input, an upload."
order: 883
sources: ["cli/internal/sast/rules/vnx-ruby-007.rego", "cli/internal/sast/docs/vnx-ruby-007.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-RUBY-007` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `sast` |
| Languages | Ruby |
| CWE | [CWE-502](https://cwe.mitre.org/data/definitions/502.html) |
| CAPEC | [CAPEC-586](https://capec.mitre.org/data/definitions/586.html) |
| ATT&CK | [T1059](https://attack.mitre.org/techniques/T1059/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `deserialization` `yaml` `rce` `ruby` |
| Source | [`internal/sast/rules/vnx-ruby-007.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-ruby-007.rego) |

## Overview

This rule detects Ruby code that calls `YAML.load()` on input without using the safe alternatives. Ruby's default YAML parser (Psych) supports deserializing arbitrary Ruby objects, including `Kernel`, `File`, `Dir`, `Net::HTTP`, and any class reachable from the object graph. When an attacker controls the YAML string, they can craft a payload that instantiates an object whose constructor or `marshal_load` method executes arbitrary code.

The vulnerability is severe because YAML gadget chains for Ruby have been publicly known since at least 2013. Tools like `ysoserial` (Ruby variant) make generating working payloads straightforward. Any application that calls `YAML.load()` on attacker-controlled data, HTTP request bodies, uploaded files, database-stored configuration, cookies, is a candidate for remote code execution (RCE).

The fix is to use `YAML.safe_load()` or `Psych.safe_load()`, which restrict the permitted types to a small set of Ruby primitives (strings, integers, floats, arrays, hashes, booleans, nil). If your application legitimately needs to deserialize custom classes, pass an explicit `permitted_classes:` array to `safe_load()` rather than using the unrestricted `load()`.

## Why this matters

Insecure deserialization is listed as [OWASP A08:2021](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/) and has been the root cause of critical vulnerabilities in widely used Ruby applications including Rails itself. CVE-2013-0156 allowed remote code execution against any Rails application that accepted XML input by exploiting YAML deserialization via the `to_yaml` / `from_yaml` conversion in the XML parser.

In a typical attack, an attacker sends a specially crafted YAML payload as a request body, query parameter, or configuration value. When `YAML.load()` processes it, the Psych parser instantiates Ruby objects from the payload. Using a gadget chain, a sequence of objects whose initialization or comparison methods call `eval`, `system`, `exec`, or `Kernel#send`, the attacker achieves OS command execution. The payload can spawn a reverse shell, exfiltrate environment variables (including secrets), or install persistence.

The attack requires no authentication in endpoints that process YAML from untrusted sources, and it is undetectable via WAF rules because the YAML is syntactically valid.

## What gets flagged

The rule reports the call when the YAML (or, for `load_file`, the path) comes from request input, an upload, a Base64-decoded blob or an HTTP or message body, on the call line or through a variable assigned from it a few lines above.

```ruby
# FLAGGED
settings = YAML.load(request.body.read)
source = params[:template]
@template = YAML.unsafe_load(source)
data = YAML.load_file(upload.tempfile)      # upload = params[:file]
YAML.load(res.body)                         # res = Net::HTTP.get_response(uri)

# NOT flagged: safe loaders and the application's own files
YAML.safe_load(request.body.read)
YAML.load(params[:more], permitted_classes: [Symbol])
FEATURES = YAML.load_file(Rails.root.join("config", "features.yml"))
```

Marshal, Oj and `JSON.load` are reported by [VNX-RUBY-003](/sast/rules/vnx-ruby-003/).

## Remediation

1. Replace `YAML.load()` with `YAML.safe_load()` for all user-controlled or untrusted input.
2. If specific custom classes must be allowed, pass them explicitly via `permitted_classes:`, do not revert to `YAML.load()`.
3. For Rails applications, audit all `YAML.load` usages in initializers, serializers, and API controllers.

```ruby
require 'yaml'

# SAFE: safe_load restricts to primitives
def parse_config_safe(body)
  YAML.safe_load(body)
end

# SAFE: permit specific classes (Ruby 3.1+ syntax)
def parse_config_with_types(body)
  YAML.safe_load(
    body,
    permitted_classes: [Symbol, Date, Time],
    permitted_symbols: [],
    aliases: false
  )
end

# SAFE: Psych.safe_load with symbolize_names (Ruby 3.x)
def load_settings(yaml_string)
  Psych.safe_load(yaml_string, symbolize_names: true)
end

# SAFE: load from a trusted local file (still prefer safe_load)
def load_app_config
  YAML.safe_load(File.read("config/settings.yml"), permitted_classes: [Symbol])
end
```

## References

- [CWE-502: Deserialization of Untrusted Data](https://cwe.mitre.org/data/definitions/502.html)
- [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [OWASP Ruby on Rails Security Guide – Deserialization](https://guides.rubyonrails.org/security.html#deserialization)
- [Ruby YAML Documentation – safe_load](https://ruby-doc.org/stdlib/libdoc/psych/rdoc/Psych.html#method-c-safe_load)
- [CVE-2013-0156 – Rails YAML deserialization RCE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2013-0156)
- [CAPEC-586: Object Injection](https://capec.mitre.org/data/definitions/586.html)
- [MITRE ATT&CK T1059 – Command and Scripting Interpreter](https://attack.mitre.org/techniques/T1059/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-ruby-007
// nosec vnx-ruby-007
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-ruby-007 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
