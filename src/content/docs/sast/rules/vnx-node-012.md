---
title: "VNX-NODE-012: Client-side XSS via innerHTML or v-html"
nav: "VNX-NODE-012"
description: "Reports raw HTML written into the DOM by jQuery .html(), Vue v-html and Svelte {@html}, and by insertAdjacentHTML, document.write and dangerouslySetInnerHTML in HTML pages and components, from a DOM source, from markup spliced together with a non-literal, or from response data. innerHTML assignments are VNX-NODE-027's; the other sinks in JavaScript files are VNX-NODE-005's."
order: 808
sources: ["cli/internal/sast/rules/vnx-node-012.rego", "cli/internal/sast/docs/vnx-node-012.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-NODE-012` |
| Severity | High |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | JavaScript / TypeScript, HTML |
| CWE | [CWE-79](https://cwe.mitre.org/data/definitions/79.html) |
| CAPEC | [CAPEC-86](https://capec.mitre.org/data/definitions/86.html) |
| ATT&CK | [T1059.007](https://attack.mitre.org/techniques/T1059/007/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `xss` `dom` `client-side` |
| Source | [`internal/sast/rules/vnx-node-012.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-node-012.rego) |

## Overview

This rule detects DOM-based XSS sinks that the other two XSS rules do not own: jQuery's `.html()` method, Vue's `v-html` directive and Svelte's `{@html}` in every file, and `insertAdjacentHTML()`, `document.write()`/`writeln()` and `dangerouslySetInnerHTML` in inline scripts of HTML and template pages and in Vue or Svelte components. All of these inject raw HTML into the live DOM. The rule reports a sink when its value reads a DOM source, splices a non-literal into markup, or is response data.

Each sink is reported once, by the rule that owns it: an assignment to `.innerHTML` or `.outerHTML` is reported by [VNX-NODE-027](/sast/rules/vnx-node-027/) in every file type, and `insertAdjacentHTML`, `document.write` and `dangerouslySetInnerHTML` in a JavaScript or TypeScript file by [VNX-NODE-005](/sast/rules/vnx-node-005/), not here. When the content is dynamic, fetched from an API, derived from URL parameters, read from `localStorage`, or received from a WebSocket, an attacker who can influence that content can inject `<script>` tags or inline event handlers that execute in the victim's browser. This is CWE-79 (Improper Neutralization of Input During Web Page Generation, Cross-site Scripting).

## Why This Matters

DOM-based XSS is particularly subtle because the malicious payload never reaches the server, it exists entirely in the client-side code path and may not be detected by server-side WAFs or input validation. An attacker can craft a URL with a fragment or query parameter that a JavaScript-heavy application reads and injects into the DOM. The payload steals session cookies, reads `localStorage` tokens, silently submits forms, or injects persistent content into the page.

`document.write()` is especially dangerous because it can completely replace the page content after load, and its usage in modern applications is almost always a legacy anti-pattern. Vue's `v-html` is the framework-specific equivalent of `innerHTML`, it bypasses Vue's built-in template XSS protections and must only be used with pre-sanitized content.

## What Gets Flagged

The value written as HTML must read a DOM source, build markup by splicing in a non-literal, or be a property of response data. For the framework raw-HTML bindings any non-constant expression is reported.

```javascript
// FLAGGED: markup built from data and DOM sources
$('#alert').html('<p class="warn">' + res.message + '</p>');
$('#greeting').html(new URLSearchParams(location.search).get('name'));
```

```html
<!-- FLAGGED: raw HTML bindings -->
<div v-html="post.content"></div>
<section>{@html bio}</section>

<!-- FLAGGED: a sink in a page's inline script -->
<script>
  document.write("<div class='alert'>" + paramValue + "</div>");
</script>
```

Not flagged: `DOMPurify.sanitize(...)` or an escape helper around the value, string literals and ternaries between literals, the `.html()` getter, and `textContent`. Not flagged here because another rule reports them: `el.innerHTML = location.hash` (VNX-NODE-027) and, in a `.js`/`.ts` file, `document.write(...)` or `dangerouslySetInnerHTML` (VNX-NODE-005).

## Remediation

1. **Replace `.innerHTML` with `.textContent` for plain text content.** This is the most common safe fix, `textContent` sets the text node value without parsing HTML:

   ```javascript
   // SAFE: textContent does not parse HTML
   document.getElementById('bio').textContent = bio;
   ```

2. **Use framework-native safe bindings instead of raw HTML injection.** In Vue, use `{{ variable }}` template syntax (which HTML-escapes automatically) instead of `v-html`:

   ```html
   <!-- SAFE: Vue double-curly escapes HTML automatically -->
   <div>{{ userBio }}</div>

   <!-- SAFE: only use v-html with pre-sanitized content -->
   <div v-html="sanitizedBio"></div>
   ```

3. **Sanitize with DOMPurify when HTML rendering is genuinely required:**

   ```javascript
   // SAFE: DOMPurify strips dangerous elements and attributes
   import DOMPurify from 'dompurify';

   document.getElementById('content').innerHTML = DOMPurify.sanitize(richText);

   // In Vue with v-html:
   computed: {
     sanitizedBio() {
       return DOMPurify.sanitize(this.userBio);
     }
   }
   ```

4. **Replace jQuery `.html()` with `.text()` for text content, or sanitize before `.html()`:**

   ```javascript
   // SAFE: jQuery .text() escapes HTML
   $('#notification').text(apiResponse.message);

   // SAFE: sanitize before .html() if markup is needed
   $('#content').html(DOMPurify.sanitize(apiResponse.html));
   ```

5. **Eliminate `document.write()` entirely.** There is no safe modern use of `document.write()`. Replace it with `document.createElement()` and `textContent`, or manipulate the DOM directly after page load.

6. **Set a Content Security Policy** header that disallows `'unsafe-inline'` scripts and restricts script sources. This is defence-in-depth that limits injection impact even when a sink is present.

## References

- [CWE-79: Improper Neutralization of Input During Web Page Generation (XSS)](https://cwe.mitre.org/data/definitions/79.html)
- [DOMPurify – trusted HTML sanitization](https://github.com/cure53/DOMPurify)
- [OWASP DOM-Based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [Vue.js – v-html security warning](https://vuejs.org/api/built-in-directives.html#v-html)
- [jQuery – .html() security](https://api.jquery.com/html/)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [MITRE ATT&CK T1059.007 – JavaScript](https://attack.mitre.org/techniques/T1059/007/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-node-012
// nosec vnx-node-012
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-node-012 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
