---
title: "VNX-20: Input validation performed but its result ignored or bypassed"
nav: "VNX-20"
description: "Input validation is wired up but never decides anything: an unread Spring BindingResult, discarded Bean Validation violations."
order: 101
sources: ["cli/internal/sast/rules/vnx-20.rego", "cli/internal/sast/docs/vnx-20.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-20` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Go, Java, JavaScript / TypeScript, Python |
| CWE | [CWE-20](https://cwe.mitre.org/data/definitions/20.html) |
| CAPEC | [CAPEC-66](https://capec.mitre.org/data/definitions/66.html) |
| ATT&CK | [T1190](https://attack.mitre.org/techniques/T1190/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `input-validation` `cwe-20` |
| Source | [`internal/sast/rules/vnx-20.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-20.rego) |

## Overview

VNX-20 maps to [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html). It reports the concrete, recognisable form of the weakness: the project has declared its validation rules, but the code that should act on the result never does, so invalid input is processed as if it had passed.

## Why this matters

Validation annotations, schemas and validator chains look like protection in review. When their result is dropped, nothing is rejected: a negative quantity, an oversized string or a missing required field reaches the business logic and the database. Every later control that assumed validated input is then wrong.

## What gets flagged

```java
// BindingResult declared, never read before the next method
public String register(@Valid @ModelAttribute("user") UserForm form, BindingResult result, Model model) {

validator.validate(order);   // Bean Validation violations discarded
```

```javascript
// no validationResult(req) anywhere in the project
router.post('/register', body('email').isEmail().normalizeEmail(), handler);
```

```python
form = TransferForm(request.form)          # form.amount.data read, no validate()
order = Order.model_construct(**payload)   # payload = await request.json()
```

```go
c.ShouldBindJSON(&req)
_ = validate.Struct(q)
```

Not flagged: a BindingResult that the method reads (`hasErrors()`, or passed to a helper), Spring's `validator.validate(target, errors)` which records into `errors`, violations that are assigned or chained, a `validationResult` call anywhere in the project's JavaScript (shared middleware), a form validated in the same function, `construct()` on data that was validated first or did not come from the request, a checked bind error, and test code. Request data reaching a dangerous sink with no validation at all is reported by the injection and traversal rules.

## Remediation

1. Spring: check `result.hasErrors()` first and return the form view.
2. Bean Validation: assign the returned set and reject the input when it is not empty.
3. express-validator: add a middleware that returns 400/422 when `validationResult(req)` is not empty, and mount it after the chains.
4. WTForms: use the data only inside `if form.validate_on_submit():`.
5. pydantic: build models with `Model(**data)` or `Model.model_validate(data)`; keep `model_construct` for trusted data.
6. gin/validator: check the returned error and stop with 400.

## References

- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-20
// nosec vnx-20
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-20 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
