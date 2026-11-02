---
title: ModSecurity, Coraza and nginx
description: Load a MODSECURITY or NGINX feed into ModSecurity on Apache or nginx, or into Coraza, in detection-only mode first.
order: 12
nav: ModSecurity and Coraza
sources: [vdb-site/api/internal/handler/detection_rule_feeds_publish.go, vdb-manager/scripts/go-processors/internal/defence/validate/network.go, cli/internal/sensor/engine/modsec.go]
checked: [vdb-site@1a06d67, vdb-manager@1cb0079, cli@4c8c3b7]
updated: 02 Nov 2026
---

| Feed type | File | What it is |
|---|---|---|
| `MODSECURITY` | `modsecurity.conf` | `SecRule` and `SecAction` directives, concatenated |
| `NGINX` | `nginx-waf.conf` | A snippet for inside an existing `server` or `location` block, carrying its ModSecurity rules inline |

Every rule has an `id` in 30000000 to 39999999, so it cannot collide with the OWASP Core Rule Set. No rule sets `SecRuleEngine` or `SecDefaultAction`: whether rules block is your configuration's choice. That is what makes detection-only mode work.

## Fetch

```bash
#!/bin/sh
# /usr/local/bin/vulnetix-modsec-update
set -eu
FEED="https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>"
DEST=/etc/modsecurity/vulnetix/modsecurity.conf
TMP="$(mktemp)"
curl -fsSL "$FEED/modsecurity.conf" -o "$TMP"
[ "$(curl -fsSL "$FEED/modsecurity.conf.sha256")" = "$(sha256sum "$TMP" | cut -d' ' -f1)" ] || { rm -f "$TMP"; exit 1; }
mkdir -p "$(dirname "$DEST")"
install -m 0644 "$TMP" "$DEST"
rm -f "$TMP"
```

Test the configuration before reloading (`apachectl configtest` or `nginx -t`), then reload. Run the script from cron or a systemd timer.

## Apache (mod_security2)

```apache
# /etc/apache2/mods-enabled/security2.conf, after your own modsecurity.conf
<IfModule security2_module>
    SecRuleEngine DetectionOnly
    IncludeOptional /etc/modsecurity/vulnetix/*.conf
</IfModule>
```

```bash
apachectl configtest && systemctl reload apache2
```

Matches are written to the ModSecurity audit log (`SecAuditLog`) and the Apache error log with the rule `id` and `msg`. When they show no false positives, set `SecRuleEngine On`.

## nginx with libmodsecurity (ModSecurity-nginx)

With a `MODSECURITY` feed:

```nginx
# inside http, server or location
modsecurity on;
modsecurity_rules '
    SecRuleEngine DetectionOnly
';
modsecurity_rules_file /etc/modsecurity/vulnetix/modsecurity.conf;
```

With an `NGINX` feed, fetch `nginx-waf.conf` instead and include it inside the block it protects:

```nginx
server {
    listen 443 ssl;
    server_name app.example.com;

    location / {
        include /etc/nginx/vulnetix/nginx-waf.conf;
        proxy_pass http://app;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

The snippet never opens its own `http`, `server`, `events`, `stream` or `upstream` block, so it is legal inside `server` or `location`. It needs the ModSecurity-nginx module loaded (`load_module modules/ngx_http_modsecurity_module.so;`).

## Coraza

Coraza reads the same directives. In Go (Coraza v3):

```go
package main

import (
	"log"
	"net/http"

	"github.com/corazawaf/coraza/v3"
	txhttp "github.com/corazawaf/coraza/v3/http"
)

func main() {
	waf, err := coraza.NewWAF(coraza.NewWAFConfig().
		WithDirectives("SecRuleEngine DetectionOnly").
		WithDirectivesFromFile("/etc/modsecurity/vulnetix/modsecurity.conf"))
	if err != nil {
		log.Fatal(err)
	}
	app := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })
	log.Fatal(http.ListenAndServe(":8080", txhttp.WrapHandler(waf, app)))
}
```

With the Coraza Caddy module:

```caddyfile
{
    order coraza_waf first
}

app.example.com {
    coraza_waf {
        directives `
            SecRuleEngine DetectionOnly
            Include /etc/modsecurity/vulnetix/modsecurity.conf
        `
    }
    reverse_proxy localhost:8081
}
```

The [Vulnetix sensor](/virtual-patching/runtime/sensor/) embeds Coraza: point it at the same feed and it runs the rules in front of your app, with each block held for a person to confirm.

## Disabled rules

A rule you disable in the feed is published with every line commented out (`# `). It stays visible in the file and loads as nothing.
