---
title: Telemetry and tracing
nav: Telemetry
description: Send Belai's traces and metrics to your own OpenTelemetry collector. What is exported, and what never is.
order: 20
sources: [belai/docs/telemetry.md, belai/internal/otel]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Belai can send traces and metrics to an OpenTelemetry collector over OTLP, so your team can see turn latency, token use, tool calls and classifier decisions in the observability stack it already runs.

**It carries facts about the session, never its content**: no prompts, replies, file contents or command output.

Configure it under `telemetry` in your settings:

```json
"telemetry": {
  "otlp_endpoint": "http://localhost:4318",
  "headers": { "x-api-key": "env:OTEL_API_KEY" },
  "traces": true,
  "metrics": true
}
```

A header value of `env:NAME` is read from that environment variable, so a key is never written in settings. Belai also keeps a local trace of each turn for its own diagnostics, separate from what it exports.

A Pix Sandbox can send its logs and metrics to your collector too. See [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/).
