---
title: "VNX-PHP-017: PHP LDAP injection via user-controlled filter"
nav: "VNX-PHP-017"
description: "Detects ldap_search(), ldap_list() or ldap_read() receiving a request value (superglobal or Laravel/Symfony request accessor, inline or through a variable assigned a few lines above) in its filter or base DN without ldap_escape() or validation."
order: 845
sources: ["cli/internal/sast/rules/vnx-php-017.rego", "cli/internal/sast/docs/vnx-php-017.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-PHP-017` |
| Severity | High |
| SARIF level | `error` |
| Kind | `sast` |
| Languages | PHP |
| CWE | [CWE-90](https://cwe.mitre.org/data/definitions/90.html) |
| CAPEC | [CAPEC-136](https://capec.mitre.org/data/definitions/136.html) |
| ATT&CK | [T1190](https://attack.mitre.org/techniques/T1190/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `ldap-injection` `injection` `php` |
| Source | [`internal/sast/rules/vnx-php-017.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-php-017.rego) |

## Overview

This rule detects calls to `ldap_search()` where the filter argument is constructed by concatenating values from PHP superglobals (`$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE`). LDAP filters use a specific syntax with special characters, parentheses, asterisks, backslashes, and null bytes, that carry structural meaning. When user-supplied values are embedded in a filter without escaping, an attacker can inject additional filter clauses that alter the query logic.

LDAP injection is the directory-protocol equivalent of SQL injection. A filter like `(uid=$username)` constructed from unescaped user input can be manipulated with a payload such as `*)(uid=*))(|(uid=*` to produce `(uid=*)(uid=*))(|(uid=*)`, a filter that matches all directory entries regardless of password. This is a classic authentication bypass in applications that use LDAP to verify credentials.

PHP's `ldap_escape()` function (added in PHP 5.6) provides correct escaping for both filter values (`LDAP_ESCAPE_FILTER`) and distinguished name components (`LDAP_ESCAPE_DN`). All user input must be passed through the appropriate escape function before insertion into LDAP filters.

## Why this matters

LDAP injection in authentication flows allows attackers to log in as any user, including administrators, without knowing their password. This is particularly impactful in corporate environments where the LDAP directory is an Active Directory server that contains privileged accounts and group memberships.

Beyond authentication bypass, LDAP injection can be used to enumerate directory contents. An attacker can iterate through all user accounts, retrieve email addresses, phone numbers, group memberships, and in some cases password hashes or challenge-response material stored in custom attributes.

Applications that use LDAP for address book lookups, user profile retrieval, or group-based authorisation are all vulnerable if they concatenate user input into filter strings. The attack requires no special tools, a simple browser or `curl` command is sufficient.

## What gets flagged

```php
// FLAGGED: username from POST concatenated into LDAP filter
$filter = '(uid=' . $_POST['username'] . ')';
$result = ldap_search($conn, $baseDn, $filter);

// FLAGGED: GET param in filter string
$search = ldap_search($ldap, 'dc=example,dc=com', '(cn=' . $_GET['name'] . ')');

// FLAGGED: request value interpolated two hops before ldap_list()
$name = $_GET['name'];
$filter = "(&(objectClass=inetOrgPerson)(cn=$name))";
$result = ldap_list($conn, 'ou=people,dc=corp,dc=local', $filter);

// NOT FLAGGED: escaped, or validated with preg_match()/ctype_*() first
$user = ldap_escape($_POST['username'], '', LDAP_ESCAPE_FILTER);
$sr = ldap_search($ds, $base, "(uid=$user)");
```

Attacker payload for authentication bypass:

```
username: *)(uid=*))(|(uid=*
```

Resulting filter: `(uid=*)(uid=*))(|(uid=*)`, matches all entries.

## Remediation

1. **Use `ldap_escape($value, '', LDAP_ESCAPE_FILTER)`** on all user-supplied values before inserting them into filter strings.

2. **Use `ldap_escape($value, '', LDAP_ESCAPE_DN)`** for values used in Distinguished Name components.

3. **Validate user input against expected formats** before escaping, a username should match `[a-zA-Z0-9._-]+` before ever reaching an LDAP query.

4. **Consider using an LDAP abstraction library** that handles escaping automatically and prevents raw filter construction.

```php
<?php
// SAFE: ldap_escape() applied to all user input
$username = $_POST['username'];

// Validate format first
if (!preg_match('/^[a-zA-Z0-9._@-]{1,64}$/', $username)) {
    die('Invalid username format');
}

// Escape for use in an LDAP filter
$escapedUsername = ldap_escape($username, '', LDAP_ESCAPE_FILTER);
$filter = '(uid=' . $escapedUsername . ')';

$result = ldap_search($conn, 'dc=example,dc=com', $filter, ['dn', 'mail']);
```

## References

- [CWE-90: Improper Neutralization of Special Elements used in an LDAP Query](https://cwe.mitre.org/data/definitions/90.html)
- [CAPEC-136: LDAP Injection](https://capec.mitre.org/data/definitions/136.html)
- [OWASP LDAP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html)
- [OWASP PHP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/PHP_Configuration_Cheat_Sheet.html)
- [PHP Manual – ldap_escape()](https://www.php.net/manual/en/function.ldap-escape.php)
- [RFC 4515 – Lightweight Directory Access Protocol (LDAP): String Representation of Search Filters](https://datatracker.ietf.org/doc/html/rfc4515)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-php-017
// nosec vnx-php-017
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-php-017 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
