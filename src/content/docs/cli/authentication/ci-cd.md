---
title: Authentication in CI/CD
nav: In CI/CD
description: Which credential to give a pipeline, how to pass it without writing it to disk or logs, and how to fail fast when it is missing.
order: 6
sources: [cli/pkg/auth/credentials.go, cli/cmd/auth.go, cli/action.yml, cli/internal/config/config.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

**Set environment variables from the platform's secret store. Do not run `vulnetix auth login` on a runner.** Environment variables are read first, persist nothing and end with the job. A login writes a plaintext `credentials.json` into a workspace that may be cached, uploaded or shared between steps, and `--store keyring` on a runner falls back to that file because there is no keychain.

```sh
# job environment, from secrets
VULNETIX_ORG_ID=...
VULNETIX_API_KEY=...

# first step of the job
vulnetix auth verify
```

`auth verify` exits `1` when nothing is found or the API rejects the credential, so a missing or revoked secret fails the first step, not a scan half an hour in.

## Choosing a credential

| Credential | Variables | For CI |
|---|---|---|
| ApiKey | `VULNETIX_API_KEY` + `VULNETIX_ORG_ID` | The usual choice. The org ID is not secret. |
| Bearer token | `VULNETIX_API_TOKEN` | One variable; outranks everything, so a wrong value cannot be rescued by another source. |
| SigV4 secret | `VVD_ORG` + `VVD_SECRET` | Avoid on shared runners. The secret derives request keys. |

Give each pipeline its own key where your plan allows, so one can be revoked without breaking the rest.

## Per platform

| Platform | Where the secret lives | Expose it as |
|---|---|---|
| GitHub Actions | Repository or organisation secrets | `env: { VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }} }` on the job |
| GitLab CI | CI/CD variables, masked and protected | Variables are exported to every job automatically |
| Bitbucket Pipelines | Repository or deployment variables, secured | Exported automatically |
| Azure Pipelines | A variable group or Key Vault, marked secret | Secret variables are not exported: map them with `env:` on the step |
| Jenkins | Credentials store | `withCredentials([string(credentialsId: '...', variable: 'VULNETIX_API_KEY')])` |
| Kubernetes | A `Secret` | `env[].valueFrom.secretKeyRef` |

Platform pages with complete pipelines: [CI/CD](/cli/ci-cd/overview/).

## Rules for every platform

**Never put the secret in argv.** Other processes can read `/proc/<pid>/cmdline`, and most CI systems echo commands:

```sh
vulnetix auth login --api-key 6e40f1c3...   # visible in ps and logs
vulnetix auth verify                        # reads VULNETIX_API_KEY from the environment
```

**Never echo it.** Print its length or the source instead:

```sh
echo "key length: ${#VULNETIX_API_KEY}"
vulnetix auth status | head -n 8
```

**Fail when the source is wrong.** A typo in a secret name gives a scan that runs on community access and exits `0`:

```sh
vulnetix auth status | grep -Eq '^ +Source: +Environment$' \
  || { echo "expected an environment credential"; exit 1; }
```

**Do not keep a workspace that holds a project credential.** If something wrote `./.vulnetix/credentials.json` (the GitHub Action does when given `api-key`), keep it out of artifacts, caches and image build contexts, and delete it at the end:

```yaml
      - name: Remove workspace credentials
        if: always()
        run: rm -f .vulnetix/credentials.json
```

**Read-only containers cannot leak a file.** In Kubernetes, `readOnlyRootFilesystem: true` with the key from a `secretKeyRef` means no credential can be written anywhere:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: vulnetix-scan
spec:
  template:
    spec:
      restartPolicy: Never
      securityContext: { runAsNonRoot: true, runAsUser: 10001 }
      containers:
        - name: vulnetix
          image: registry.example.com/ci/vulnetix:3.154.0   # your image with the CLI installed
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities: { drop: ["ALL"] }
          env:
            - name: VULNETIX_ORG_ID
              valueFrom: { secretKeyRef: { name: vulnetix, key: org-id } }
            - name: VULNETIX_API_KEY
              valueFrom: { secretKeyRef: { name: vulnetix, key: api-key } }
            - name: HOME
              value: /tmp
          command: ["vulnetix", "auth", "verify"]
          volumeMounts: [{ name: tmp, mountPath: /tmp }]
      volumes: [{ name: tmp, emptyDir: {} }]
```

`HOME=/tmp` on an `emptyDir` gives the CLI somewhere writable for its caches and the `.vulnetix/` results; the credential stays in the environment.

## Rotating CI credentials

See [Rotation and revocation](/cli/authentication/rotation/#environment-variables).
