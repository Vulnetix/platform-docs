---
title: "Secret rules: Source Control & CI/CD"
nav: "Source Control & CI/CD"
description: "GitHub, GitLab, Bitbucket, Azure DevOps tokens and CI/CD pipeline credentials."
order: 3
sources: ["cli/internal/sast/secretsgen/catalog.json", "cli/internal/sast/secretsgen/main.go"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

70 rules, kind `secrets`. They run under `vulnetix secrets` and the secrets stage of `vulnetix scan`, not under `vulnetix sast`. Each is generated from one entry in `internal/sast/secretsgen/catalog.json`.

Detection: `keyword` means the pattern is tried only on lines that contain one of the listed keywords (case-insensitive); `entropy` means the matched token must also reach the entry's minimum Shannon entropy. Every catalog rule skips test files, lockfiles, minified and generated files, and paths under `testdata/`, `fixtures/`, `vendor/`, `node_modules/`, `dist/`, `build/` and `src/test/` (the `skip_path` list in `internal/sast/rules/lib_secrets.rego`), and documented example tokens.

| Rule ID | Name | Severity | Detection | Keywords | CWE |
|---|---|---|---|---|---|
| <a id="vnx-sec-181"></a>`VNX-SEC-181` | Bitbucket app password | High | keyword + regex + entropy | `bitbucket` `atbb` | CWE-798 |
| <a id="vnx-sec-182"></a>`VNX-SEC-182` | Bitbucket app password (ATBB prefix) | High | keyword + regex | `atbb` | CWE-798 |
| <a id="vnx-sec-183"></a>`VNX-SEC-183` | Bitbucket OAuth client secret | High | keyword + regex + entropy | `bitbucket` `secret` | CWE-798 |
| <a id="vnx-sec-184"></a>`VNX-SEC-184` | Azure DevOps personal access token | Critical | keyword + regex + entropy | `azure` `devops` `vsts` `visualstudio` `azdo` | CWE-798 |
| <a id="vnx-sec-185"></a>`VNX-SEC-185` | CircleCI personal API token | High | keyword + regex + entropy | `circleci` `circle_ci` `circle-ci` | CWE-798 |
| <a id="vnx-sec-186"></a>`VNX-SEC-186` | CircleCI project API token (CCIP) | High | keyword + regex | `ccipat_` | CWE-798 |
| <a id="vnx-sec-187"></a>`VNX-SEC-187` | Travis CI API token | High | keyword + regex + entropy | `travis` | CWE-798 |
| <a id="vnx-sec-188"></a>`VNX-SEC-188` | Buildkite agent token | Critical | keyword + regex + entropy | `buildkite` `agent` | CWE-798 |
| <a id="vnx-sec-189"></a>`VNX-SEC-189` | Buildkite API access token | High | keyword + regex + entropy | `buildkite` `token` | CWE-798 |
| <a id="vnx-sec-190"></a>`VNX-SEC-190` | Jenkins API token | High | keyword + regex + entropy | `jenkins` | CWE-798 |
| <a id="vnx-sec-191"></a>`VNX-SEC-191` | Jenkins crumb (CSRF token) | Medium | keyword + regex + entropy | `crumb` | CWE-798 |
| <a id="vnx-sec-192"></a>`VNX-SEC-192` | Drone CI token | High | keyword + regex + entropy | `drone` | CWE-798 |
| <a id="vnx-sec-193"></a>`VNX-SEC-193` | TeamCity access token | High | keyword + regex + entropy | `teamcity` | CWE-798 |
| <a id="vnx-sec-194"></a>`VNX-SEC-194` | TeamCity access token (generic) | High | keyword + regex + entropy | `teamcity` `token` | CWE-798 |
| <a id="vnx-sec-195"></a>`VNX-SEC-195` | Gitea access token | High | keyword + regex + entropy | `gitea` | CWE-798 |
| <a id="vnx-sec-196"></a>`VNX-SEC-196` | Gitee access token | High | keyword + regex + entropy | `gitee` | CWE-798 |
| <a id="vnx-sec-197"></a>`VNX-SEC-197` | Codecov upload token | Medium | keyword + regex + entropy | `codecov` | CWE-798 |
| <a id="vnx-sec-198"></a>`VNX-SEC-198` | Coveralls repo token | Medium | keyword + regex + entropy | `coveralls` | CWE-798 |
| <a id="vnx-sec-199"></a>`VNX-SEC-199` | Code Climate test reporter ID | Medium | keyword + regex + entropy | `test_reporter` `codeclimate` `reporter` | CWE-798 |
| <a id="vnx-sec-200"></a>`VNX-SEC-200` | Sourcegraph access token (sgp_) | High | keyword + regex | `sgp_` | CWE-798 |
| <a id="vnx-sec-201"></a>`VNX-SEC-201` | Sourcegraph dotcom token (sgph_) | High | keyword + regex | `sgph_` | CWE-798 |
| <a id="vnx-sec-202"></a>`VNX-SEC-202` | Semaphore CI token | High | keyword + regex + entropy | `semaphore` | CWE-798 |
| <a id="vnx-sec-203"></a>`VNX-SEC-203` | Harness personal access token (pat.) | Critical | keyword + regex | `pat.` | CWE-798 |
| <a id="vnx-sec-204"></a>`VNX-SEC-204` | Harness service account token (sat.) | Critical | keyword + regex | `sat.` | CWE-798 |
| <a id="vnx-sec-205"></a>`VNX-SEC-205` | Spacelift API token | High | keyword + regex + entropy | `spacelift` | CWE-798 |
| <a id="vnx-sec-206"></a>`VNX-SEC-206` | Pulumi access token (pul-) | Critical | keyword + regex | `pul-` | CWE-798 |
| <a id="vnx-sec-207"></a>`VNX-SEC-207` | Octopus Deploy API key (API-) | High | keyword + regex | `api-` | CWE-798 |
| <a id="vnx-sec-208"></a>`VNX-SEC-208` | Terraform Cloud team/org token | Critical | regex | `atlasv1` | CWE-798 |
| <a id="vnx-sec-209"></a>`VNX-SEC-209` | JFrog access/identity token | High | keyword + regex + entropy | `jfrog` `artifactory` `xray` | CWE-798 |
| <a id="vnx-sec-210"></a>`VNX-SEC-210` | JFrog reference token (cmVmdGtuOjA) | High | keyword + regex | `cmvmdgtuoja` | CWE-798 |
| <a id="vnx-sec-211"></a>`VNX-SEC-211` | Argo CD auth token (JWT) | Critical | keyword + regex + entropy | `argocd` `argo` | CWE-798 |
| <a id="vnx-sec-212"></a>`VNX-SEC-212` | FluxCD git credentials | High | keyword + regex + entropy | `flux` | CWE-798 |
| <a id="vnx-sec-213"></a>`VNX-SEC-213` | GitHub App private key (PEM) | Critical | regex | `begin rsa private key` | CWE-798 |
| <a id="vnx-sec-214"></a>`VNX-SEC-214` | GitHub Actions runner registration token (BBBB) | High | keyword + regex + entropy | `runner` `registration` | CWE-798 |
| <a id="vnx-sec-215"></a>`VNX-SEC-215` | Vercel deploy hook URL | High | regex | `vercel.com/v1/integrations/deploy` | CWE-798 |
| <a id="vnx-sec-216"></a>`VNX-SEC-216` | Vercel API token | Critical | keyword + regex + entropy | `vercel` | CWE-798 |
| <a id="vnx-sec-217"></a>`VNX-SEC-217` | Bitrise access token | High | keyword + regex + entropy | `bitrise` | CWE-798 |
| <a id="vnx-sec-218"></a>`VNX-SEC-218` | Codefresh API token | High | keyword + regex + entropy | `codefresh` | CWE-798 |
| <a id="vnx-sec-219"></a>`VNX-SEC-219` | Woodpecker CI token | High | keyword + regex + entropy | `woodpecker` | CWE-798 |
| <a id="vnx-sec-220"></a>`VNX-SEC-220` | Concourse CI token | High | keyword + regex + entropy | `concourse` | CWE-798 |
| <a id="vnx-sec-221"></a>`VNX-SEC-221` | GoCD access token | High | keyword + regex + entropy | `gocd` | CWE-798 |
| <a id="vnx-sec-222"></a>`VNX-SEC-222` | Sentry CLI auth token (sntrys_) | High | keyword + regex | `sntrys_` | CWE-798 |
| <a id="vnx-sec-223"></a>`VNX-SEC-223` | Sentry user auth token (sntryu_) | High | keyword + regex | `sntryu_` | CWE-798 |
| <a id="vnx-sec-224"></a>`VNX-SEC-224` | ReadTheDocs API token | Medium | keyword + regex + entropy | `readthedocs` `rtd` | CWE-798 |
| <a id="vnx-sec-225"></a>`VNX-SEC-225` | Netlify build hook URL | High | regex | `api.netlify.com/build_hooks` | CWE-798 |
| <a id="vnx-sec-226"></a>`VNX-SEC-226` | Netlify API access token | Critical | keyword + regex + entropy | `netlify` | CWE-798 |
| <a id="vnx-sec-227"></a>`VNX-SEC-227` | Cloudsmith API key | High | keyword + regex + entropy | `cloudsmith` | CWE-798 |
| <a id="vnx-sec-228"></a>`VNX-SEC-228` | Bitbucket Pipelines OIDC/step token | High | keyword + regex + entropy | `bitbucket` `pipelines` | CWE-798 |
| <a id="vnx-sec-229"></a>`VNX-SEC-229` | TeamCity superuser token | Critical | keyword + regex + entropy | `teamcity` `superuser` | CWE-798 |
| <a id="vnx-sec-230"></a>`VNX-SEC-230` | Drone CI RPC secret | Critical | keyword + regex + entropy | `drone_rpc_secret` `drone` | CWE-798 |
| <a id="vnx-sec-231"></a>`VNX-SEC-231` | Sourcegraph dotcom token (sgd_) | High | keyword + regex | `sgd_` | CWE-798 |
| <a id="vnx-sec-232"></a>`VNX-SEC-232` | Buildkite registration token (bkua_) | Critical | keyword + regex | `bkua_` | CWE-798 |
| <a id="vnx-sec-233"></a>`VNX-SEC-233` | Codecov global upload token (legacy) | Medium | keyword + regex + entropy | `codecov_token` | CWE-798 |
| <a id="vnx-sec-234"></a>`VNX-SEC-234` | Argo CD admin password | Critical | keyword + regex + entropy | `argocd` `password` | CWE-798 |
| <a id="vnx-sec-235"></a>`VNX-SEC-235` | Semaphore organization API token (legacy) | High | keyword + regex + entropy | `semaphore` `token` | CWE-798 |
| <a id="vnx-sec-236"></a>`VNX-SEC-236` | Spacelift API key secret | High | keyword + regex + entropy | `spacelift` `secret` | CWE-798 |
| <a id="vnx-sec-237"></a>`VNX-SEC-237` | Codefresh runtime/agent token | High | keyword + regex + entropy | `codefresh` `token` | CWE-798 |
| <a id="vnx-sec-238"></a>`VNX-SEC-238` | TeamCity build agent authorization token | High | keyword + regex + entropy | `authorizationtoken` | CWE-798 |
| <a id="vnx-sec-239"></a>`VNX-SEC-239` | JFrog Pipelines integration token | High | keyword + regex + entropy | `pipelines` `token` | CWE-798 |
| <a id="vnx-sec-240"></a>`VNX-SEC-240` | GitHub Actions runner token (config.sh) | High | regex | `config.sh` `--token` | CWE-798 |
| <a id="vnx-sec-241"></a>`VNX-SEC-241` | Gitea OAuth client secret | High | keyword + regex | `gto_` | CWE-798 |
| <a id="vnx-sec-242"></a>`VNX-SEC-242` | Travis CI Pro/Enterprise access token (legacy) | High | keyword + regex + entropy | `travis` `token` | CWE-798 |
| <a id="vnx-sec-243"></a>`VNX-SEC-243` | FluxCD GitRepository SSH private key | Critical | regex | `begin openssh private key` | CWE-798 |
| <a id="vnx-sec-244"></a>`VNX-SEC-244` | Concourse fly target token | High | keyword + regex + entropy | `bearer_token` `fly_token` | CWE-798 |
| <a id="vnx-sec-245"></a>`VNX-SEC-245` | Cloudsmith entitlement token (cmVudA / ent_) | High | keyword + regex + entropy | `cloudsmith` `entitlement` | CWE-798 |
| <a id="vnx-sec-246"></a>`VNX-SEC-246` | Octopus Deploy server API key (assignment) | High | keyword + regex + entropy | `octopus` `api-` | CWE-798 |
| <a id="vnx-sec-247"></a>`VNX-SEC-247` | Pulumi config passphrase | High | keyword + regex + entropy | `pulumi_config_passphrase` | CWE-798 |
| <a id="vnx-sec-248"></a>`VNX-SEC-248` | Drone CI machine/user token (legacy) | High | keyword + regex + entropy | `drone_token` | CWE-798 |
| <a id="vnx-sec-249"></a>`VNX-SEC-249` | Gitee OAuth client secret | High | keyword + regex + entropy | `gitee` `secret` | CWE-798 |
| <a id="vnx-sec-250"></a>`VNX-SEC-250` | CircleCI context/environment token (assignment) | High | keyword + regex + entropy | `circle_token` `circleci_token` | CWE-798 |

Suppress one with `// nosec <rule-id>` on the line, or `vulnetix ignore add --rule <rule-id>`. See [Suppressing findings](/sast/guides/suppressing-findings/).
