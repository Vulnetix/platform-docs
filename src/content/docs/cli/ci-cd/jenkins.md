---
title: Jenkins
description: Run Vulnetix in declarative and scripted Jenkins pipelines with credentials from the Jenkins store, gates, archived reports and catchError.
order: 8
sources: [cli/internal/config/config.go, cli/install.sh, cli/cmd/scan.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

## Credentials

Add two **Secret text** credentials, for example `vulnetix-org-id` and `vulnetix-api-key`. Bind them with `withCredentials` or `environment { ... = credentials('...') }`; Jenkins masks bound values in the console log.

## Declarative pipeline

```groovy
pipeline {
  agent any
  environment {
    VULNETIX_ORG_ID  = credentials('vulnetix-org-id')
    VULNETIX_API_KEY = credentials('vulnetix-api-key')
  }
  stages {
    stage('Install Vulnetix') {
      steps {
        sh 'curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"'
        sh '"$HOME/.local/bin/vulnetix" auth verify'
      }
    }
    stage('Scan') {
      steps {
        sh 'mkdir -p dist && "$HOME/.local/bin/vulnetix" scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif'
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'dist/**', allowEmptyArchive: true
    }
  }
}
```

Each `sh` step is a new shell, so the steps call the binary by its full path. `allowEmptyArchive: true` covers the clean case, where no SARIF file is written.

## Report without failing

```groovy
    stage('Scan') {
      steps {
        catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
          sh '"$HOME/.local/bin/vulnetix" scan --fail-on high'
        }
      }
    }
```

To treat an undecided jail gate (exit `3`) differently from a breach (exit `1`):

```groovy
script {
  def code = sh(script: '"$HOME/.local/bin/vulnetix" scan --fail-on high --jail', returnStatus: true)
  if (code == 3) { unstable('jail could not decide: check the required scans ran') }
  else if (code != 0) { error("Vulnetix gate failed (exit ${code})") }
}
```

## Scripted pipeline

```groovy
node {
  checkout scm
  withCredentials([
    string(credentialsId: 'vulnetix-org-id', variable: 'VULNETIX_ORG_ID'),
    string(credentialsId: 'vulnetix-api-key', variable: 'VULNETIX_API_KEY'),
  ]) {
    withEnv(["PATH+VULNETIX=${env.HOME}/.local/bin"]) {
      sh 'curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"'
      sh 'vulnetix auth verify'
      sh 'vulnetix scan --fail-on high,kev'
    }
  }
}
```

Use single-quoted `sh` strings so the shell, not Groovy, expands the secret variables; Groovy interpolation of a secret puts it in the build's command line.

## Pipeline context

The CLI detects Jenkins from `JENKINS_URL` or `BUILD_NUMBER`, and reads `GIT_URL`, `GIT_COMMIT`, `GIT_BRANCH`, `CHANGE_BRANCH`, `CHANGE_TARGET`, `BUILD_ID`, `BUILD_NUMBER`, `JOB_NAME`, `WORKSPACE` and `NODE_LABELS`. `GIT_*` are set by the Git plugin's checkout; without them the CLI reads the local checkout.

## Agents in containers

With `agent { docker { image 'alpine:3.20' } }`, install `curl` and `ca-certificates` first (`apk add --no-cache curl ca-certificates git`), or use an image of your own with the CLI baked in; see [Containers](/cli/ci-cd/containers/).
