---
title: Sensor as a sidecar
description: Run vulnetix-sensor in the same Kubernetes pod or ECS task as your app, in front of its port and as its egress proxy.
order: 2
nav: Sidecar (EKS, ECS)
sources: [cli/deploy/sensor/kubernetes-sidecar.yaml, cli/deploy/sensor/ecs-sidecar.json, cli/deploy/sensor/Dockerfile, cli/cmd/vulnetix-sensor/main.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

The sensor listens on the port your load balancer or Service targets, inspects each request against the feed's `MODSECURITY` and `REGEX_L7` rules, and forwards to the app on localhost. The app sends its outbound calls through the sensor's egress proxy, which checks them against the feed's `STIX` and `OPENIOC` indicators.

```text
client -> :8080 vulnetix-sensor -> 127.0.0.1:8081 app
app -> HTTPS_PROXY 127.0.0.1:3128 vulnetix-sensor -> internet
```

Build and push the image first: no image is published.

```bash
git clone https://github.com/Vulnetix/cli && cd cli
docker build -f deploy/sensor/Dockerfile --build-arg VERSION=v3.154.0 -t <registry>/vulnetix-sensor:v3.154.0 .
docker push <registry>/vulnetix-sensor:v3.154.0
```

## Kubernetes (EKS or any cluster)

```bash
kubectl create secret generic vulnetix-sensor \
  --from-literal=VULNETIX_ORG_ID=<org-uuid> \
  --from-literal=VULNETIX_API_KEY=<hmac>
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: vulnetix-sensor
          image: <registry>/vulnetix-sensor:v3.154.0
          args:
            - --mode=guard
            - --listen=:8080
            - --upstream=http://127.0.0.1:8081
            - --health-path=/healthz
            - --egress-listen=127.0.0.1:3128
            - --feed=https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>
            - --state-dir=/state
          envFrom:
            - secretRef: { name: vulnetix-sensor }
          ports:
            - { name: http, containerPort: 8080 }
          readinessProbe:
            httpGet: { path: /healthz, port: http }
          resources:
            requests: { cpu: 20m, memory: 32Mi }
            limits: { memory: 256Mi }
          securityContext:
            runAsNonRoot: true
            runAsUser: 65532
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities: { drop: [ALL] }
          volumeMounts:
            - { name: sensor-state, mountPath: /state }
        - name: app
          image: <your app image>
          env:
            - { name: PORT, value: "8081" }
            - { name: HTTPS_PROXY, value: http://127.0.0.1:3128 }
            - { name: HTTP_PROXY, value: http://127.0.0.1:3128 }
            - { name: NO_PROXY, value: "10.0.0.0/8,172.16.0.0/12,localhost,127.0.0.1,.svc,.cluster.local" }
      volumes:
        - name: sensor-state
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector: { app: web }
  ports:
    - { name: http, port: 80, targetPort: http }
```

Repeat `--feed` for each feed, for example one `MODSECURITY` feed and one `STIX` feed. Add `--feed-key=<base64>` only if your sensor build has no pinned key. With `emptyDir` state, the sensor registers as a new sensor each time the pod is recreated.

## ECS (Fargate or EC2)

Container definitions for the task. The load balancer target group points at the sensor on `8080`. Store the org id and the HMAC in one Secrets Manager secret with keys `orgId` and `apiKey`, and give the task execution role `secretsmanager:GetSecretValue` on it.

```json
{
  "containerDefinitions": [
    {
      "name": "vulnetix-sensor",
      "image": "<registry>/vulnetix-sensor:v3.154.0",
      "essential": true,
      "portMappings": [{ "containerPort": 8080, "protocol": "tcp" }],
      "command": [
        "--mode", "guard",
        "--listen", ":8080",
        "--upstream", "http://127.0.0.1:8081",
        "--health-path", "/healthz",
        "--egress-listen", "127.0.0.1:3128",
        "--feed", "https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>",
        "--state-dir", "/tmp/vulnetix-sensor"
      ],
      "secrets": [
        { "name": "VULNETIX_ORG_ID", "valueFrom": "arn:aws:secretsmanager:<region>:<account>:secret:vulnetix/sensor:orgId::" },
        { "name": "VULNETIX_API_KEY", "valueFrom": "arn:aws:secretsmanager:<region>:<account>:secret:vulnetix/sensor:apiKey::" }
      ],
      "readonlyRootFilesystem": true,
      "user": "65532",
      "memoryReservation": 64,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": { "awslogs-group": "/ecs/vulnetix-sensor", "awslogs-region": "<region>", "awslogs-stream-prefix": "sensor" }
      }
    },
    {
      "name": "app",
      "image": "<your app image>",
      "essential": true,
      "environment": [
        { "name": "PORT", "value": "8081" },
        { "name": "HTTPS_PROXY", "value": "http://127.0.0.1:3128" },
        { "name": "HTTP_PROXY", "value": "http://127.0.0.1:3128" },
        { "name": "NO_PROXY", "value": "169.254.169.254,169.254.170.2,localhost,127.0.0.1" }
      ],
      "dependsOn": [{ "containerName": "vulnetix-sensor", "condition": "START" }]
    }
  ]
}
```

`NO_PROXY` keeps the EC2 and ECS metadata endpoints off the proxy, or the app cannot get its task role credentials. The image's `ENTRYPOINT` is the sensor binary, so `command` is its arguments.

## DNS guard in a sidecar

To also check DNS lookups, add `--dns-listen=127.0.0.1:53` and point the pod's resolver at it:

```yaml
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers: ["127.0.0.1"]
    searches: ["<namespace>.svc.cluster.local", "svc.cluster.local", "cluster.local"]
```

and give the sensor `--dns-upstream=<cluster DNS IP>:53`, because with `dnsPolicy: None` its own `/etc/resolv.conf` names `127.0.0.1`. The sensor runs as a non-root user, so let it bind port 53 with the pod-level safe sysctl:

```yaml
spec:
  securityContext:
    sysctls:
      - { name: net.ipv4.ip_unprivileged_port_start, value: "53" }
```

## Roll out

1. Start with `--mode=monitor` and watch `/resolve/sensor` for matches on legitimate traffic.
2. Move to `--mode=guard`. A match on a block-mode rule from a verified feed is held with a `403` until someone decides.
3. Move to `--mode=enforce` once holds are routine.
