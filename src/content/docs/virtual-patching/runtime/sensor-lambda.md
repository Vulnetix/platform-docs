---
title: Sensor as a Lambda layer
description: Add the vulnetix-sensor layer to a function so API Gateway and function URL invocations are checked before the handler runs.
order: 4
nav: Lambda layer
sources: [cli/cmd/vulnetix-sensor/lambda.go, cli/deploy/sensor/lambda/build-layer.sh, cli/deploy/sensor/lambda/wrapper, cli/deploy/sensor/lambda/extensions/vulnetix-sensor, cli/internal/sensor/lambdaext/lambdaext.go, cli/.github/workflows/release.yml]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

Lambda has no kernel hooks and no port in front of a function, so the sensor runs as an external extension and sits on the Runtime API. When the runtime asks for its next invocation, the sensor reads the event first. An API Gateway (REST or HTTP API) or function URL event is checked as an HTTP request. A blocked or held request is answered with a `403` on the function's behalf and the handler never runs. Any other event passes through untouched.

## The layer

Every CLI release attaches `vulnetix-sensor-lambda-layer-amd64.zip` and `vulnetix-sensor-lambda-layer-arm64.zip`. Inside, mounted at `/opt`:

| Path | What |
|---|---|
| `extensions/vulnetix-sensor` | The launcher Lambda starts as an extension: `exec /opt/vulnetix/vulnetix-sensor lambda-extension` |
| `vulnetix/vulnetix-sensor` | The binary |
| `vulnetix/wrapper` | The exec wrapper that points the runtime at the sensor |

Publish it in your account, matching the function's architecture (`arm64` is Graviton, `amd64` is `x86_64`):

```bash
VERSION=v3.154.0 ARCH=arm64
curl -fsSLO "https://github.com/Vulnetix/cli/releases/download/$VERSION/vulnetix-sensor-lambda-layer-$ARCH.zip"
curl -fsSL "https://github.com/Vulnetix/cli/releases/download/$VERSION/checksums.txt" | grep "lambda-layer-$ARCH.zip" | sha256sum -c -

aws lambda publish-layer-version \
  --layer-name vulnetix-sensor-$ARCH \
  --zip-file fileb://vulnetix-sensor-lambda-layer-$ARCH.zip \
  --compatible-architectures "$( [ $ARCH = arm64 ] && echo arm64 || echo x86_64 )"
```

To build it yourself from the CLI repository: `deploy/sensor/lambda/build-layer.sh arm64 v3.154.0 dist/`.

## Configure the function

| Variable | Value |
|---|---|
| `AWS_LAMBDA_EXEC_WRAPPER` | `/opt/vulnetix/wrapper` (required) |
| `VULNETIX_SENSOR_FEEDS` | Comma-separated feed URLs (required) |
| `VULNETIX_SENSOR_MODE` | `monitor` (default), `guard` or `enforce` |
| `VULNETIX_FEED_KEY` | Feed public key, base64; only to override the pinned one |
| `VULNETIX_SENSOR_PORT` | Runtime API proxy port, default `9009` |
| `VULNETIX_SENSOR_EGRESS` | A port such as `9010` to also route outbound SDK calls through the egress proxy |
| `VULNETIX_ORG_ID`, `VULNETIX_API_KEY` | Credentials. Without them rules load and nothing is reported. |
| `VULNETIX_ENDPOINT` | Reporting endpoint, default `https://www.vulnetix.com/api/site` |

```bash
aws lambda update-function-configuration \
  --function-name my-api \
  --layers arn:aws:lambda:<region>:<account>:layer:vulnetix-sensor-arm64:1 \
  --environment 'Variables={AWS_LAMBDA_EXEC_WRAPPER=/opt/vulnetix/wrapper,VULNETIX_SENSOR_FEEDS=https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>,VULNETIX_SENSOR_MODE=monitor,VULNETIX_ORG_ID=<org-uuid>,VULNETIX_API_KEY=<hmac>}'
```

`--environment` replaces the whole variable set: include the function's existing variables. Keep the API key out of plain configuration where you can: resolve it from Secrets Manager in your deployment tool (SAM, CDK, Terraform) at deploy time.

In AWS SAM:

```yaml
MyApi:
  Type: AWS::Serverless::Function
  Properties:
    Runtime: nodejs22.x
    Architectures: [arm64]
    Handler: index.handler
    Layers:
      - !Ref VulnetixSensorLayerArn
    Environment:
      Variables:
        AWS_LAMBDA_EXEC_WRAPPER: /opt/vulnetix/wrapper
        VULNETIX_SENSOR_FEEDS: https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>
        VULNETIX_SENSOR_MODE: guard
        VULNETIX_ORG_ID: '{{resolve:secretsmanager:vulnetix/sensor:SecretString:orgId}}'
        VULNETIX_API_KEY: '{{resolve:secretsmanager:vulnetix/sensor:SecretString:apiKey}}'
```

## The wrapper

```sh
export AWS_LAMBDA_RUNTIME_API="127.0.0.1:${VULNETIX_SENSOR_PORT:-9009}"
if [ -n "${VULNETIX_SENSOR_EGRESS:-}" ]; then
  export HTTPS_PROXY="http://127.0.0.1:${VULNETIX_SENSOR_EGRESS}"
  export HTTP_PROXY="$HTTPS_PROXY"
  export NO_PROXY="localhost,127.0.0.1,169.254.169.254,169.254.170.2${NO_PROXY:+,$NO_PROXY}"
fi
exec "$@"
```

It works with any managed runtime that honours `AWS_LAMBDA_EXEC_WRAPPER`, and with SDKs that honour `HTTPS_PROXY` for egress.

## Behaviour in Lambda

| | |
|---|---|
| guard | Holds the one invocation with a `403`: a function cannot wait for a person. The event still lands in the hold queue, and your decision applies to later invocations. |
| Reporting | Flushed on every invoke, because Lambda freezes the environment between them |
| Sensor key | Kept in `/tmp/vulnetix-sensor` for the life of the execution environment, so each cold start registers a new sensor |
| Engines | Inbound HTTP rules (`MODSECURITY`, `REGEX_L7`) and, with `VULNETIX_SENSOR_EGRESS`, indicator checks on outbound calls |
