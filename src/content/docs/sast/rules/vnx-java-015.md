---
title: "VNX-JAVA-015: Java JPQL/HQL injection via string concatenation"
nav: "VNX-JAVA-015"
description: "Reports EntityManager and Hibernate Session createQuery/createNativeQuery calls whose JPQL, HQL or SQL text carries HTTP request data."
order: 763
sources: ["cli/internal/sast/rules/vnx-java-015.rego", "cli/internal/sast/docs/vnx-java-015.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-JAVA-015` |
| Severity | High |
| SARIF level | `error` |
| Kind | `sast` |
| Languages | Java |
| CWE | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) |
| CAPEC | [CAPEC-66](https://capec.mitre.org/data/definitions/66.html) |
| ATT&CK | [T1190](https://attack.mitre.org/techniques/T1190/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `sql-injection` `jpql` `jpa` `java` |
| Source | [`internal/sast/rules/vnx-java-015.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-java-015.rego) |

## Overview

This rule flags Java code where `createQuery()`, `createNativeQuery()`, or `createNamedQuery()` constructs queries using the `+` operator or `String.format()`. When untrusted input is embedded directly in a JPQL, HQL, or native SQL string, an attacker can alter the query's structure, reading rows they should not see, bypassing authorization filters, updating records, or in native SQL mode executing DDL statements.

JPQL and HQL are **not** immune to injection just because they abstract the database. They share the same vulnerability class as raw SQL when queries are built by concatenation, and every ORM framework ultimately translates the query into database-specific SQL before execution.

## Why this matters

Injection vulnerabilities have topped the OWASP Top 10 for over a decade. The JPA/Hibernate abstraction layer gives many developers a false sense of security: JPQL looks different from SQL, so it must be safe. It is not. An attacker who can control the `name` parameter in a query like:

```
SELECT u FROM User u WHERE u.name = '
```

can close the literal, append `OR '1'='1`, and return every user in the table. With `createNativeQuery()` the attacker has the full expressive power of the underlying DBMS.

**OWASP ASVS v4.0 requirements:**

- **V5.3.4**, Verify that parameterized queries or stored procedures are used, and that dynamic queries are constructed with parameterization.

**Real-world impact:**

- CVE-2022-22978, Spring Security authorization bypass via path manipulation (closely related class of JPQL filter bypass)
- CVE-2016-6652, Spring Data JPA SpEL injection via repository method name binding

## What gets flagged

```java
// FLAGGED: string concatenation in createQuery()
String name = request.getParameter("name");
em.createQuery("SELECT u FROM User u WHERE u.name = '" + name + "'");

// FLAGGED: String.format() with a JAX-RS query parameter (@QueryParam("id") String id)
em.createNativeQuery(String.format("SELECT * FROM users WHERE id = %s", id));

// FLAGGED: HQL concatenation of a repository method parameter (findByOwner(String username))
session.createQuery("FROM Account WHERE owner = '" + username + "'");
```

## Remediation

**Named parameters (preferred for JPQL/HQL):**

```java
// SAFE: named parameters, the JPA provider never interpolates the value into the query string
String name = request.getParameter("name");
TypedQuery<User> q = em.createQuery(
    "SELECT u FROM User u WHERE u.name = :name", User.class);
q.setParameter("name", name);
List<User> results = q.getResultList();
```

**Positional parameters for native queries:**

```java
// SAFE: positional parameter binding in native SQL
Query q = em.createNativeQuery(
    "SELECT * FROM users WHERE id = ?1", User.class);
q.setParameter(1, userId);
```

**Hibernate named parameters:**

```java
// SAFE: Hibernate setParameter() with named placeholder
Query<?> q = session.createQuery(
    "FROM Account WHERE owner = :owner");
q.setParameter("owner", username);
```

**JPA Criteria API for fully dynamic queries:**

```java
// SAFE: Criteria API, type-safe and injection-free by construction
CriteriaBuilder cb = em.getCriteriaBuilder();
CriteriaQuery<User> cq = cb.createQuery(User.class);
Root<User> root = cq.from(User.class);
cq.where(cb.equal(root.get("name"), name)); // name is a bind value, not part of the query string
TypedQuery<User> q = em.createQuery(cq);
```

**Spring Data JPA**, use repository methods or `@Query` with `:param` binding rather than raw `EntityManager` access:

```java
// SAFE: Spring Data JPA interface method, parameter binding is automatic
@Query("SELECT u FROM User u WHERE u.email = :email")
Optional<User> findByEmail(@Param("email") String email);
```

The secure behavior is **not the default** when using `EntityManager` directly, developers must explicitly call `setParameter()`. Spring Data repository methods are safe by default because the framework handles binding.

## References

- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
- [CAPEC-66: SQL Injection](https://capec.mitre.org/data/definitions/66.html)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Query Parameterization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html)
- [OWASP ASVS v4.0 – V5.3.4](https://owasp.org/www-project-application-security-verification-standard/)
- [Jakarta Persistence (JPA) 3.1 – JPQL](https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1#a4665)
- [Hibernate ORM User Guide – HQL](https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#query-language)
- [Spring Data JPA – @Query](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#jpa.query-methods.at-query)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-java-015
// nosec vnx-java-015
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-java-015 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
