---
title: "VNX-RUBY-004: Ruby SQL injection"
nav: "VNX-RUBY-004"
description: "Reports ActiveRecord query methods (where, order, select, group, pluck, find_by_sql, execute, select_all, ...) given SQL that interpolates, concatenates or formats request input, a variable assigned from it, or a parameter of the enclosing method or scope lambda, also on the line after the parenthesis, in an array or in Arel.sql; placeholders, hash conditions, to_i/quote values and allowlist-checked input are not reported."
order: 880
sources: ["cli/internal/sast/rules/vnx-ruby-004.rego", "cli/internal/sast/docs/vnx-ruby-004.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-RUBY-004` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `sast` |
| Languages | Ruby |
| CWE | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) |
| CAPEC | [CAPEC-66](https://capec.mitre.org/data/definitions/66.html) |
| ATT&CK | [T1190](https://attack.mitre.org/techniques/T1190/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `sql-injection` `activerecord` `database` |
| Source | [`internal/sast/rules/vnx-ruby-004.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-ruby-004.rego) |

## Overview

This rule flags ActiveRecord query calls, `where()`, `find_by_sql()`, `execute()`, and `connection.execute()`, where the SQL string is constructed using Ruby string interpolation (`#{...}`) or where the method receives a string literal that indicates user-controlled data may be embedded directly. SQL injection allows an attacker who controls part of the query to change its logical structure, bypassing WHERE clauses, extracting data from other tables, or, depending on database permissions, modifying or deleting data. This maps to [CWE-89: Improper Neutralization of Special Elements used in an SQL Command](https://cwe.mitre.org/data/definitions/89.html).

## Why this matters

SQL injection in Rails applications is especially dangerous because ActiveRecord's expressive query interface makes it easy to write code that looks safe but is not. A developer familiar with `User.where(name: name)` (safe) might write `User.where("name = '#{name}'")` (vulnerable) for a more complex condition, the two look syntactically similar but have completely different security properties.

A successful SQL injection against a production database allows an attacker to extract every user's credentials, personal data, and payment information; log in as any user by bypassing the password check; inject backdoor admin accounts; exfiltrate the entire database using `UNION SELECT`-based extraction; and in some database configurations, read local files or execute OS commands via `LOAD DATA INFILE` or `xp_cmdshell`.

Because ActiveRecord generates real SQL under the hood, the `string(form)` of `where()` is the most common injection vector in Rails codebases, developers use it for complex conditions and unknowingly open the door to injection.

## What gets flagged

The rule reports a query method whose SQL string (first argument) inserts request input, a variable assigned from it a few lines above, or a parameter of the enclosing method or scope lambda; a raw `params[...]` used as the SQL fragment; and a variable holding such a string built above.

```ruby
# FLAGGED
user = User.where("id = '#{params[:user][:id]}'")[0]
@orders = Order.where("status = '" + params[:status] + "'")
@products = Product.order(params[:sort])
scope :hits_by_ip, ->(ip, col = "*") { select("#{col}").where(ip_address: ip) }
sql = "SELECT * FROM reports WHERE region = '#{region}'"   # region: method parameter
find_by_sql(sql)

# NOT flagged: placeholders, hash conditions, values made safe
User.where("email = ?", params[:email])
User.where(admin: true, team_id: params[:team_id])
User.where("name LIKE :q", q: "%#{params[:q]}%")
where("id = #{params[:id].to_i}")
where("name = #{connection.quote(name)}")
```

SQL written in a heredoc (`find_by_sql(<<~SQL)`) and migrations under `db/migrate/` are not inspected.

## Remediation

1. **Use ActiveRecord parameterized queries with `?` placeholders.** This is the idiomatic Rails approach for conditions that involve external values. ActiveRecord passes the values to the database driver separately from the SQL string, so they are never interpreted as SQL:

```ruby
# SAFE: parameterized where(), value is bound separately
User.where("name = ?", params[:name])

# SAFE: multiple parameters
User.where("name = ? AND role = ?", params[:name], params[:role])

# SAFE: named placeholders (more readable for multiple params)
User.where("name = :name AND active = :active", name: params[:name], active: true)
```

2. **Use the hash form of `where()` for simple equality conditions.** When comparing a column to a single value, the hash form is the safest and most readable, ActiveRecord generates the parameterized SQL automatically:

```ruby
# SAFE: hash form, ActiveRecord handles parameterization completely
User.where(name: params[:name])
User.where(name: params[:name], active: true)

# SAFE: hash with multiple values (IN clause)
User.where(role: ['admin', 'moderator'])
```

3. **Use `sanitize_sql_array` for complex conditions where the string form is unavoidable.** If you need a complex SQL condition with user data that cannot be expressed in the hash or placeholder forms, use ActiveRecord's built-in sanitization:

```ruby
# SAFE: sanitize_sql_array with placeholder array
condition = ActiveRecord::Base.sanitize_sql_array(
  ["name LIKE ? AND created_at > ?", "%#{params[:query]}%", 30.days.ago]
)
User.where(condition)
```

4. **Use Arel for programmatically constructed queries.** When query structure itself (not just values) varies based on parameters, use the Arel query builder rather than string concatenation:

```ruby
# SAFE: Arel table interface, fully parameterized
users = User.arel_table
query = users[:name].eq(params[:name]).and(users[:active].eq(true))
User.where(query)
```

5. **Parameterize `find_by_sql` and `execute` calls.** Both methods accept the same placeholder array syntax:

```ruby
# SAFE: find_by_sql with array form
User.find_by_sql(["SELECT * FROM users WHERE email = ?", params[:email]])

# SAFE: execute with sanitized input
ActiveRecord::Base.connection.execute(
  ActiveRecord::Base.sanitize_sql_array(
    ["SELECT id FROM sessions WHERE user_id = ?", current_user.id]
  )
)
```

## References

- [CWE-89: Improper Neutralization of Special Elements used in an SQL Command](https://cwe.mitre.org/data/definitions/89.html)
- [CAPEC-66: SQL Injection](https://capec.mitre.org/data/definitions/66.html)
- [Rails Security Guide – SQL Injection](https://guides.rubyonrails.org/security.html#sql-injection)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Rails ActiveRecord Query Interface – Conditions](https://guides.rubyonrails.org/active_record_querying.html#conditions)
- [brakeman – Rails static analysis for SQL injection](https://brakemanscanner.org/docs/warning_types/sql_injection/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-ruby-004
// nosec vnx-ruby-004
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-ruby-004 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
