---
title: Signed webhooks
description: The headers and JSON body of a Vulnetix signed webhook, verifying the Standard Webhooks signature, secret rotation, retries and deduplication, with a receiver.
order: 3
sources: [vdb-site/api/internal/handler/messaging_send.go, vdb-site/api/internal/handler/messaging_handlers.go, vdb-site/api/internal/messaging/render_webhook.go, vdb-site/docs/messaging.md]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

A **signed webhook** connection in [Messaging](/organization/integrations/messaging/) posts JSON to any public https endpoint you run. Each request is signed per [Standard Webhooks](https://www.standardwebhooks.com/), so any Standard Webhooks library can verify it.

## Request

`POST` to your URL, `Content-Type: application/json`, with these headers:

| Header | Value |
|---|---|
| `webhook-id` | The delivery's uuid. Stable across retries of the same delivery. |
| `webhook-timestamp` | Unix seconds when this attempt was signed |
| `webhook-signature` | `v1,<base64 HMAC-SHA256>`. During a secret rotation, two space-separated signatures. |
| `X-Vulnetix-Event` | The event type, for example `scan.completed` |

## Body

```json
{
  "id": "event uuid",
  "type": "scan.completed",
  "category": "scans",
  "occurredAt": 1793577600000,
  "tenant": { },
  "severity": "warning",
  "actor": { },
  "subject": { },
  "url": "https://www.vulnetix.com/resolve/...",
  "rendered": { "title": "...", "text": "...", "markdown": "..." },
  "mentions": [ { "provider": "...", "id": "...", "display": "..." } ],
  "data": { }
}
```

`rendered` is the route's template output in three forms. `data` is present only when the template asks for the payload; it is the reduced event data, with secret-looking fields removed. Sensitive events (`security.*`, `vault.*`) are sent to a webhook only when the route sets `allowSensitiveWebhook`, and then in their reduced form.

## Verifying

The signing secret is shown once when you create the connection, in the form `whsec_<base64>`.

1. Base64-decode the part after `whsec_`. That is the HMAC key.
2. Compute HMAC-SHA256 over `webhook-id + "." + webhook-timestamp + "." + body`, using the raw request body bytes.
3. Base64-encode it and compare, in constant time, with each `v1,` value in `webhook-signature`. Accept if any matches.
4. Reject a `webhook-timestamp` more than five minutes from now.
5. Drop a `webhook-id` you have already processed. Delivery is at least once.

A receiver using only the Python standard library:

```python
import base64, hashlib, hmac, http.server, os, time

SECRET = os.environ["VULNETIX_WEBHOOK_SECRET"]          # whsec_...
KEY = base64.b64decode(SECRET.removeprefix("whsec_"))
seen = set()

class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"]))
        wid = self.headers["webhook-id"]
        ts = self.headers["webhook-timestamp"]
        sigs = self.headers["webhook-signature"].split(" ")

        mac = hmac.new(KEY, f"{wid}.{ts}.".encode() + body, hashlib.sha256)
        expected = "v1," + base64.b64encode(mac.digest()).decode()
        fresh = abs(time.time() - int(ts)) <= 300

        if not fresh or not any(hmac.compare_digest(expected, s) for s in sigs):
            self.send_response(401); self.end_headers(); return
        if wid not in seen:
            seen.add(wid)
            print(self.headers["X-Vulnetix-Event"], body.decode())
        self.send_response(204); self.end_headers()

http.server.HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
```

Run it with `VULNETIX_WEBHOOK_SECRET=whsec_... python3 receiver.py` behind an https endpoint, then press **Test** on the connection (`POST /v1/messaging/connections/{id}/test`).

## Rotating the secret

`POST /v1/messaging/connections/{id}/rotate-secret` returns `{signingSecret, previousValidUntil}`. For the next 24 hours both the new and the previous secret sign every request, so `webhook-signature` holds two values. Deploy the new secret within that window.

## What your endpoint should return

| Your answer | Vulnetix does |
|---|---|
| 2xx | marks the delivery `sent` |
| 408, 429, 5xx, or a network error | retries: 30 s, then four times longer each attempt (±20%, at most 6 h), honouring `Retry-After`; gives up after 8 attempts |
| 401, 403, 404, 410 | gives up and counts a credential failure. Three in a row marks the connection `broken`. |
| any other 4xx | gives up |

Redirects are not followed, the URL must be https, and the host must resolve to a public address at the time of each request.
