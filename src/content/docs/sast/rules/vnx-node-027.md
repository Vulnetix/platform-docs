---
title: "VNX-NODE-027: Assignment to innerHTML without sanitization"
nav: "VNX-NODE-027"
description: "Reports innerHTML/outerHTML assignments (= or +=) in JavaScript, TypeScript and inline page scripts whose value is not a constant and is not passed through DOMPurify or an escape/sanitize helper."
order: 823
sources: ["cli/internal/sast/rules/vnx-node-027.rego", "cli/website/content/docs/sast-rules/vnx-node-027.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-NODE-027` |
| Severity | High |
| SARIF level | `error` |
| Kind | `sast` |
| Languages | JavaScript / TypeScript, HTML |
| CWE | [CWE-79](https://cwe.mitre.org/data/definitions/79.html) |
| CAPEC | [CAPEC-63](https://capec.mitre.org/data/definitions/63.html) |
| ATT&CK | [T1059.007](https://attack.mitre.org/techniques/T1059/007/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `xss` `innerhtml` `dom` |
| Source | [`internal/sast/rules/vnx-node-027.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-node-027.rego) |

## Overview

This rule detects direct assignment to the `.innerHTML` property in JavaScript files. Setting `innerHTML` to a value that incorporates user-controlled data causes the browser to parse the string as HTML, executing any embedded script tags, event handlers (`onerror`, `onload`, etc.), or JavaScript URLs (`javascript:`). This is classified as CWE-79 (Improper Neutralization of Input During Web Page Generation) and is one of the most common sources of DOM-based XSS in modern web applications.

Unlike reflected or stored XSS that originates on the server, DOM-based XSS from `innerHTML` assignment occurs entirely in the browser. The payload never passes through the server, making it invisible to server-side input validation and many web application firewalls. The vulnerability is triggered when client-side JavaScript reads attacker-controlled data, from the URL fragment, `location.search`, `document.referrer`, `postMessage` events, or local storage, and writes it into the DOM via `innerHTML`.

## Why This Matters

DOM XSS is actively exploited in the wild and is frequently discovered in widely-used JavaScript libraries and single-page applications. An attacker who achieves script execution in a victim's browser can steal session cookies, capture keystrokes, redirect to phishing pages, make authenticated API requests, or exfiltrate data from the page. Modern browsers have removed synchronous `<script>` execution via `innerHTML` but remain vulnerable to event handler injection (`<img onerror="...">`), which is sufficient for full script execution.

In Node.js SSR (server-side rendering) contexts, for example, React/Vue/Angular applications with Express back-ends that pass props via `dangerouslySetInnerHTML` or equivalent, the same sink can produce reflected XSS that is indexed by search engines and easily shared as a malicious link.

## What Gets Flagged

```javascript
// FLAGGED: URL parameter concatenated into markup
const name = new URLSearchParams(window.location.search).get('name');
document.getElementById('greeting').innerHTML = 'Hello, ' + name;

// FLAGGED: template literal interpolation, postMessage data
box.innerHTML = `<p class="c">${comment.body}</p>`;
document.body.innerHTML = event.data;

// FLAGGED: appending and replacing with dynamic values
li.innerHTML += entry.message;
banner.outerHTML = '<div class="banner">' + text + '</div>';
node["innerHTML"] = msg;

// FLAGGED: one part encoded, the raw value spliced into another
el.innerHTML = '<a href="/s?q=' + encodeURIComponent(q) + '">' + q + '</a>';
box.innerHTML = 'Hello ' + unescape(location.search.substring(6));
```

Not flagged: literal markup (`el.innerHTML = '<span class="spinner"></span>'`), a ternary between literals, a `const` holding a literal, a value passed whole through `DOMPurify.sanitize(...)` or an `escapeHtml(...)` helper, comparisons such as `el.innerHTML === x`, and third-party library copies (vendor/, libs/, dist/, jQuery, three.js and other library files).

This rule is the one finding for an innerHTML/outerHTML assignment: [VNX-NODE-005](/sast/rules/vnx-node-005/) and [VNX-NODE-012](/sast/rules/vnx-node-012/) do not report it again.

## Remediation

1. Use `textContent` instead of `innerHTML` when inserting plain text, it is never interpreted as HTML and requires no sanitization.
2. When HTML structure must be inserted dynamically, sanitize the input with [DOMPurify](https://github.com/cure53/DOMPurify) before assigning it to `innerHTML`. Configure DOMPurify with a strict allowlist appropriate to your use case.
3. Use DOM construction APIs (`document.createElement`, `element.appendChild`, `element.setAttribute`) to build HTML programmatically rather than via string parsing.
4. In frameworks like React, avoid `dangerouslySetInnerHTML`; if unavoidable, pass the value through DOMPurify first.

```javascript
// SAFE: textContent for plain text, never parsed as HTML
const name = new URLSearchParams(location.search).get('name');
document.getElementById('greeting').textContent = 'Hello, ' + name;

// SAFE: DOMPurify sanitization before innerHTML assignment
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(apiResponse.htmlContent, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href'],
});
element.innerHTML = clean;

// SAFE: DOM API construction, no HTML parsing
const p = document.createElement('p');
p.textContent = userComment;
container.appendChild(p);
```

## References

- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)
- [CAPEC-63: Cross-Site Scripting (XSS)](https://capec.mitre.org/data/definitions/63.html)
- [OWASP DOM-based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [DOMPurify, trusted HTML sanitizer](https://github.com/cure53/DOMPurify)
- [MDN Web Docs, innerHTML security considerations](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML#security_considerations)
- [PortSwigger Web Security Academy, DOM-based XSS](https://portswigger.net/web-security/cross-site-scripting/dom-based)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-node-027
// nosec vnx-node-027
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-node-027 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
