---
title: "Secret rules: Monitoring & Observability"
nav: "Monitoring & Observability"
description: "Datadog, New Relic, Sentry, Grafana, PagerDuty and other observability keys."
order: 8
sources: ["cli/internal/sast/secretsgen/catalog.json", "cli/internal/sast/secretsgen/main.go"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

45 rules, kind `secrets`. They run under `vulnetix secrets` and the secrets stage of `vulnetix scan`, not under `vulnetix sast`. Each is generated from one entry in `internal/sast/secretsgen/catalog.json`.

Detection: `keyword` means the pattern is tried only on lines that contain one of the listed keywords (case-insensitive); `entropy` means the matched token must also reach the entry's minimum Shannon entropy. Every catalog rule skips test files, lockfiles, minified and generated files, and paths under `testdata/`, `fixtures/`, `vendor/`, `node_modules/`, `dist/`, `build/` and `src/test/` (the `skip_path` list in `internal/sast/rules/lib_secrets.rego`), and documented example tokens.

| Rule ID | Name | Severity | Detection | Keywords | CWE |
|---|---|---|---|---|---|
| <a id="vnx-sec-095"></a>`VNX-SEC-095` | PagerDuty API token | Critical | keyword + regex + entropy | `pagerduty` | CWE-798 |
| <a id="vnx-sec-096"></a>`VNX-SEC-096` | Sentry DSN with secret | High | keyword + regex | `sentry` `ingest` | CWE-798 |
| <a id="vnx-sec-603"></a>`VNX-SEC-603` | Datadog application key (app key) | High | keyword + regex + entropy | `datadog` `app` | CWE-798 |
| <a id="vnx-sec-604"></a>`VNX-SEC-604` | Honeycomb API key | High | keyword + regex + entropy | `honeycomb` | CWE-798 |
| <a id="vnx-sec-605"></a>`VNX-SEC-605` | Lightstep / Cloud Observability access token | High | keyword + regex + entropy | `lightstep` | CWE-798 |
| <a id="vnx-sec-606"></a>`VNX-SEC-606` | Dynatrace API token | Critical | keyword + regex | `dt0c` `dt0s` | CWE-798 |
| <a id="vnx-sec-607"></a>`VNX-SEC-607` | Splunk HEC token | High | keyword + regex + entropy | `splunk` `hec` | CWE-798 |
| <a id="vnx-sec-608"></a>`VNX-SEC-608` | Splunk session / authentication token | High | keyword + regex + entropy | `splunk` | CWE-798 |
| <a id="vnx-sec-609"></a>`VNX-SEC-609` | Rollbar project access token | High | keyword + regex + entropy | `rollbar` | CWE-798 |
| <a id="vnx-sec-610"></a>`VNX-SEC-610` | Bugsnag API key | Medium | keyword + regex + entropy | `bugsnag` | CWE-798 |
| <a id="vnx-sec-611"></a>`VNX-SEC-611` | Honeybadger API key | High | keyword + regex + entropy | `honeybadger` | CWE-798 |
| <a id="vnx-sec-612"></a>`VNX-SEC-612` | Logz.io shipping / API token | High | keyword + regex + entropy | `logzio` `logz.io` | CWE-798 |
| <a id="vnx-sec-613"></a>`VNX-SEC-613` | Loggly customer token | Medium | keyword + regex + entropy | `loggly` | CWE-798 |
| <a id="vnx-sec-614"></a>`VNX-SEC-614` | Better Stack / Logtail source token | High | keyword + regex + entropy | `logtail` `betterstack` | CWE-798 |
| <a id="vnx-sec-615"></a>`VNX-SEC-615` | Grafana Cloud access policy token | Critical | keyword + regex | `glc_` | CWE-798 |
| <a id="vnx-sec-616"></a>`VNX-SEC-616` | Grafana service account token | High | keyword + regex | `glsa_` | CWE-798 |
| <a id="vnx-sec-617"></a>`VNX-SEC-617` | New Relic user API key (NRAK) | High | keyword + regex | `nrak-` | CWE-798 |
| <a id="vnx-sec-618"></a>`VNX-SEC-618` | New Relic REST API key (NRAA) | High | keyword + regex | `nraa-` | CWE-798 |
| <a id="vnx-sec-619"></a>`VNX-SEC-619` | New Relic insert / ingest key (NRII) | High | keyword + regex | `nrii-` | CWE-798 |
| <a id="vnx-sec-620"></a>`VNX-SEC-620` | AppDynamics access key | High | keyword + regex + entropy | `appdynamics` | CWE-798 |
| <a id="vnx-sec-621"></a>`VNX-SEC-621` | Instana agent key | High | keyword + regex + entropy | `instana` | CWE-798 |
| <a id="vnx-sec-622"></a>`VNX-SEC-622` | Sumo Logic collector access key | High | keyword + regex + entropy | `sumo` `access` | CWE-798 |
| <a id="vnx-sec-623"></a>`VNX-SEC-623` | Prometheus remote-write basic-auth URL | High | regex | `/api/prom/push` `/api/v1/write` | CWE-798 |
| <a id="vnx-sec-624"></a>`VNX-SEC-624` | Elastic APM secret token | High | keyword + regex + entropy | `apm` `secret` | CWE-798 |
| <a id="vnx-sec-625"></a>`VNX-SEC-625` | Raygun API key | Medium | keyword + regex + entropy | `raygun` | CWE-798 |
| <a id="vnx-sec-626"></a>`VNX-SEC-626` | Datadog client token (pub) | Medium | keyword + regex | `pub` | CWE-798 |
| <a id="vnx-sec-627"></a>`VNX-SEC-627` | Honeycomb ingest key (hcaik / hcxik) | High | keyword + regex | `hcaik_` `hcxik_` | CWE-798 |
| <a id="vnx-sec-632"></a>`VNX-SEC-632` | Datadog API key (dd context) | High | keyword + regex + entropy | `dd_api_key` `ddapikey` | CWE-798 |
| <a id="vnx-sec-633"></a>`VNX-SEC-633` | Logtail / Better Stack ingesting host token (https) | High | regex | `betterstackdata.com` | CWE-798 |
| <a id="vnx-sec-634"></a>`VNX-SEC-634` | Dynatrace platform token (dt0s) | Critical | keyword + regex | `dt0s` | CWE-798 |
| <a id="vnx-sec-638"></a>`VNX-SEC-638` | Sentry organization auth token (sntrys) | High | keyword + regex | `sntrys_` | CWE-798 |
| <a id="vnx-sec-639"></a>`VNX-SEC-639` | Pyroscope / Grafana profiling ingest URL with token | High | regex | `profiles` `.grafana.net` | CWE-798 |
| <a id="vnx-sec-640"></a>`VNX-SEC-640` | Sumo Logic HTTP source collector URL | High | regex | `sumologic.com/receiver` | CWE-798 |
| <a id="vnx-sec-1067"></a>`VNX-SEC-1067` | GameAnalytics secret key | Medium | keyword + regex + entropy | `gameanalytics` `secret` | CWE-798 |
| <a id="vnx-sec-1097"></a>`VNX-SEC-1097` | Countly API key | Medium | keyword + regex + entropy | `countly` `apikey` | CWE-798 |
| <a id="vnx-sec-1098"></a>`VNX-SEC-1098` | Plausible Analytics API key | Medium | keyword + regex + entropy | `plausible` `apikey` | CWE-798 |
| <a id="vnx-sec-1099"></a>`VNX-SEC-1099` | Fathom Analytics API token | Medium | keyword + regex + entropy | `fathom` `token` | CWE-798 |
| <a id="vnx-sec-1100"></a>`VNX-SEC-1100` | Matomo API token_auth | High | keyword + regex + entropy | `matomo` `token_auth` | CWE-798 |
| <a id="vnx-sec-1101"></a>`VNX-SEC-1101` | Umami API key/token | Medium | keyword + regex + entropy | `umami` `apikey` | CWE-798 |
| <a id="vnx-sec-1102"></a>`VNX-SEC-1102` | Datadog RUM client token (pub) | Medium | keyword + regex | `pub` | CWE-798 |
| <a id="vnx-sec-1124"></a>`VNX-SEC-1124` | Statsig server secret key (secret-) | High | keyword + regex | `secret-` | CWE-798 |
| <a id="vnx-sec-1125"></a>`VNX-SEC-1125` | Split.io server-side API key | High | keyword + regex + entropy | `splitio` `apikey` | CWE-798 |
| <a id="vnx-sec-1126"></a>`VNX-SEC-1126` | Optimizely SDK datafile token | Medium | keyword + regex + entropy | `optimizely` `sdkkey` | CWE-798 |
| <a id="vnx-sec-1134"></a>`VNX-SEC-1134` | GameAnalytics game key | Medium | keyword + regex + entropy | `gameanalytics` `gamekey` | CWE-798 |
| <a id="vnx-sec-1140"></a>`VNX-SEC-1140` | ConfigCat SDK key (assignment context) | Medium | keyword + regex + entropy | `configcat` `sdkkey` | CWE-798 |

Suppress one with `// nosec <rule-id>` on the line, or `vulnetix ignore add --rule <rule-id>`. See [Suppressing findings](/sast/guides/suppressing-findings/).
