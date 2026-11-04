---
title: "VNX-JAVA-025: Java hardcoded password or credential in source code"
nav: "VNX-JAVA-025"
description: "Detects passwords written into Java production source as string literals."
order: 773
sources: ["cli/internal/sast/rules/vnx-java-025.rego", "cli/internal/sast/docs/vnx-java-025.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-JAVA-025` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Java |
| CWE | [CWE-259](https://cwe.mitre.org/data/definitions/259.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552](https://attack.mitre.org/techniques/T1552/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `hardcoded-credentials` `secrets` `cwe-259` `java` |
| Source | [`internal/sast/rules/vnx-java-025.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-java-025.rego) |

## Overview

Hardcoded credentials are among the most commonly exploited vulnerability patterns in enterprise Java applications. When a password, API key, or database connection string is written as a string literal in source code, `String password = "Sup3rS3cr3t!"` or `DriverManager.getConnection("jdbc:mysql://db/app", "admin", "admin123")`, it becomes permanently embedded in the version control history, compiled into the class file, and visible to anyone with access to the source repository or the JAR. This is CWE-259 (Use of Hard-coded Password).

This rule flags a string literal used as a password: a variable, field or constant whose name ends in `password`, `passwd`, `pwd` or `passphrase`; `DriverManager.getConnection()` with a literal user and password (also when the call is split over lines); `setPassword("...")` and builder `.password("...")`; `Properties.put`/`setProperty` of a `*password` key; `new PasswordAuthentication(...)` and `new UsernamePasswordCredentials(...)`; `KeyStore.load`/`getKey` with `"...".toCharArray()`; and a password compared with `equals()` against a literal. It does not report values from `System.getenv`, `@Value` or a request, empty strings, placeholders such as `${...}` or `********`, values that are an environment-variable name, a property key, a URL path or a label, names that only contain the word (`PASSWORD_FIELD`), comments, or test code.

Hardcoded credentials are particularly dangerous in microservice architectures where dozens of services may share a single database credential. Rotating a hardcoded credential requires rebuilding and redeploying every service that contains it.

## Why this matters

Public GitHub repositories are continuously scanned by automated tools and threat actors looking for hardcoded credentials. Within minutes of pushing a commit that includes a database password or API key, that credential can be found and exploited. Even private repositories are at risk: former employees, compromised developer accounts, and accidental repository visibility changes have all been sources of credential exposure.

Compiled Java artifacts also expose hardcoded credentials. JAR and WAR files can be decompiled with freely available tools such as CFR or Fernflower in seconds, yielding readable source code complete with string literals. A QA or staging artifact shared with an external vendor can expose production credentials if the same values are used across environments.

A 2023 GitGuardian report found hardcoded credentials in over 10 million public GitHub commits. The Uber 2016 breach and numerous AWS credential exposures have involved hardcoded credentials committed to source control.

## What gets flagged

```java
// FLAGGED: password constant
private static final String DEFAULT_PASSWORD = "Adm1nSecret!";

// FLAGGED: database credentials hardcoded in getConnection
return DriverManager.getConnection(
        "jdbc:mysql://replica.internal:3306/app", "readonly", "r3adonly!");

// FLAGGED: data source, credential constructor and keystore
ds.setPassword("pg-pass-991");
return new UsernamePasswordCredentials("api", "apiP@ss1");
ks.load(in, "k3ystore-pass".toCharArray());

// FLAGGED: backdoor comparison
return "letmein-42".equals(password);

// NOT FLAGGED: names, labels and placeholders
private static final String PASSWORD_FIELD = "password";
private String placeholderPassword = "${ADMIN_PASSWORD}";
```

## Remediation

1. **Externalize credentials to environment variables** and read them at runtime with `System.getenv()`.

2. **Use a secrets manager** (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) and inject the retrieved secret at startup, never storing it in source code.

3. **In Spring applications**, use `@Value("${db.password}")` with properties sourced from an external configuration server (Spring Cloud Config, Kubernetes Secrets).

4. **Audit git history** and rotate any credentials found in past commits immediately. `git log -S "password"` can surface historical occurrences.

```java
// SAFE: credentials from environment variables
String dbPassword = Objects.requireNonNull(
    System.getenv("DB_PASSWORD"), "DB_PASSWORD environment variable not set");
Connection conn = DriverManager.getConnection(jdbcUrl, dbUser, dbPassword);
```

```java
// SAFE: Spring externalized configuration
@Value("${datasource.password}")
private String dataSourcePassword;
```

```java
// SAFE: AWS Secrets Manager at startup
SecretsManagerClient client = SecretsManagerClient.create();
GetSecretValueResponse secret = client.getSecretValue(
    GetSecretValueRequest.builder().secretId("prod/db/password").build());
String dbPassword = secret.secretString();
```

## References

- [CWE-259: Use of Hard-coded Password](https://cwe.mitre.org/data/definitions/259.html)
- [OWASP Java Security Cheat Sheet – Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Java_Security_Cheat_Sheet.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Spring Security: Externalized Configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)
- [MITRE ATT&CK T1552: Unsecured Credentials](https://attack.mitre.org/techniques/T1552/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-java-025
// nosec vnx-java-025
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-java-025 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
