---
title: "VNX-NODE-024: postMessage without origin validation (CSWSH/XSS)"
nav: "VNX-NODE-024"
description: "Reports window 'message' handlers (inline or a named function in the same file) that never read event.origin or event.source, and postMessage(data, '*') to another window. Not reported: worker, WebSocket and port listeners, posts to the page's own window, explicit target origins, comments and strings."
order: 820
sources: ["cli/internal/sast/rules/vnx-node-024.rego", "cli/website/content/docs/sast-rules/vnx-node-024.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-NODE-024` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | JavaScript / TypeScript |
| CWE | [CWE-345](https://cwe.mitre.org/data/definitions/345.html) |
| CAPEC | [CAPEC-111](https://capec.mitre.org/data/definitions/111.html) |
| ATT&CK | [T1185](https://attack.mitre.org/techniques/T1185/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `postmessage` `origin-validation` `xss` `browser` `node` |
| Source | [`internal/sast/rules/vnx-node-024.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-node-024.rego) |

## Overview

This rule flags two related patterns in browser-side JavaScript. The first is a `window.addEventListener('message', handler)` registration where the handler does not check `event.origin`, meaning it will accept and process messages posted from any window, regardless of origin. The second is a `postMessage()` call that specifies `'*'` as the target origin, which broadcasts the message to all frames on the page regardless of their origin.

The `postMessage` API is designed to enable safe cross-origin communication between frames, windows, and workers. However, the safety contract depends entirely on both sides behaving correctly: senders must specify a precise target origin, and receivers must validate the incoming origin before acting on the message data. Omitting either check breaks the same-origin boundary that browsers enforce for direct DOM access and cookie sharing.

When a receiver processes messages without origin validation, any malicious frame embedded on the same page, via an advertisement, a third-party widget, or an XSS vector on another path, can send crafted messages that the application processes as trusted input.

## Why This Matters

Cross-site WebSocket hijacking (CSWSH) and postMessage-based XSS are commonly exploited in single-page applications and micro-frontend architectures where multiple origins communicate via `postMessage`. An attacker who can get a victim to visit a page they control (or who can inject a frame into a trusted page) can send arbitrary messages to the vulnerable handler.

Depending on what the handler does with the message, the attacker can inject content into the DOM causing XSS, trigger navigation to attacker-controlled URLs, leak sensitive data by sending it to a frame that relays it externally, or perform CSRF-equivalent actions if the handler invokes authenticated API calls based on message content.

Applications that use `postMessage` for OAuth flows, payment widget communication, or embedding third-party content are particularly sensitive. A missing origin check in an OAuth redirect handler, for example, can allow token theft.

## What Gets Flagged

```javascript
// FLAGGED: message listener with no event.origin check
window.addEventListener('message', function(event) {
  // event.origin is never checked, accepts messages from anywhere
  document.getElementById('output').innerHTML = event.data.html;
});

// FLAGGED: arrow handler and onmessage assignment without a sender check
window.addEventListener("message", (e) => { window.location.href = e.data.url })
window.onmessage = (ev) => { localStorage.setItem('session', JSON.stringify(ev.data)) }

// FLAGGED: postMessage to another window with wildcard target origin
window.opener.postMessage({ type: 'login', token }, '*');
iframe.contentWindow.postMessage({ token: authToken }, '*');

// Not flagged
window.addEventListener('message', (e) => {
  if (!ALLOWED_ORIGINS.includes(e.origin)) return;
  render(e.data);
});
worker.addEventListener('message', (e) => console.log(e.data)); // a Worker, not a window
window.postMessage('zero-timeout', '*');                         // the page's own window
parent.postMessage({ ready: true }, 'https://app.example.com');
```

The rule looks at JavaScript, TypeScript and inline scripts in HTML, Vue and Svelte files. A listener whose handler is a named function the file does not define is not reported, because its body cannot be read.

## Remediation

1. **Always check `event.origin`** at the top of every `message` event handler and return immediately if it does not match your expected origin.

2. **Never use `'*'` as the target origin in `postMessage()`** unless the message is genuinely intended for any origin and contains no sensitive data.

3. **Avoid processing `event.data` as HTML**, treat it as structured data (JSON) and use `textContent` instead of `innerHTML` when reflecting it into the DOM.

```javascript
// SAFE: origin validated before processing
const TRUSTED_ORIGIN = 'https://payments.example.com';

window.addEventListener('message', function(event) {
  if (event.origin !== TRUSTED_ORIGIN) {
    return; // silently discard messages from unknown origins
  }

  // Safe to process event.data
  const data = JSON.parse(event.data);
  handlePaymentResult(data);
});

// SAFE: precise target origin specified
iframe.contentWindow.postMessage(
  JSON.stringify({ action: 'init' }),
  'https://widget.example.com'  // only delivered to this origin
);
```

## References

- [CWE-345: Insufficient Verification of Data Authenticity](https://cwe.mitre.org/data/definitions/345.html)
- [CAPEC-111: JSON Hijacking](https://capec.mitre.org/data/definitions/111.html)
- [OWASP HTML5 Security Cheat Sheet – postMessage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#cross-origin-resource-sharing)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [MDN Web Docs – Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [PortSwigger Web Security Academy – Cross-origin resource sharing](https://portswigger.net/web-security/cors)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-node-024
// nosec vnx-node-024
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-node-024 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
