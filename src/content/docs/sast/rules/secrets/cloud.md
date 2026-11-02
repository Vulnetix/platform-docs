---
title: "Secret rules: Cloud Providers"
nav: "Cloud Providers"
description: "AWS, Azure, GCP, Alibaba, Oracle, DigitalOcean, IBM and other cloud-provider credential detection rules."
order: 2
sources: ["cli/internal/sast/secretsgen/catalog.json", "cli/internal/sast/secretsgen/main.go"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

83 rules, kind `secrets`. They run under `vulnetix secrets` and the secrets stage of `vulnetix scan`, not under `vulnetix sast`. Each is generated from one entry in `internal/sast/secretsgen/catalog.json`.

Detection: `keyword` means the pattern is tried only on lines that contain one of the listed keywords (case-insensitive); `entropy` means the matched token must also reach the entry's minimum Shannon entropy. Every catalog rule skips test files, lockfiles, minified and generated files, and paths under `testdata/`, `fixtures/`, `vendor/`, `node_modules/`, `dist/`, `build/` and `src/test/` (the `skip_path` list in `internal/sast/rules/lib_secrets.rego`), and documented example tokens.

| Rule ID | Name | Severity | Detection | Keywords | CWE |
|---|---|---|---|---|---|
| <a id="vnx-sec-081"></a>`VNX-SEC-081` | Cloudflare API token (cfk_) | Critical | keyword + regex | `cfk_` | CWE-798 |
| <a id="vnx-sec-082"></a>`VNX-SEC-082` | Cloudflare user/account token (cfut_/cfat_) | Critical | keyword + regex | `cfut_` `cfat_` | CWE-798 |
| <a id="vnx-sec-083"></a>`VNX-SEC-083` | Heroku API key (v2 HRKU-) | Critical | keyword + regex | `hrku-` | CWE-798 |
| <a id="vnx-sec-084"></a>`VNX-SEC-084` | Salesforce access token | Critical | regex |  | CWE-798 |
| <a id="vnx-sec-101"></a>`VNX-SEC-101` | Oracle Cloud (OCI) API private key | Critical | regex | `-----begin rsa private key-----` | CWE-798 |
| <a id="vnx-sec-102"></a>`VNX-SEC-102` | Oracle Cloud (OCI) auth token | High | keyword + regex + entropy | `oci` `oracle` | CWE-798 |
| <a id="vnx-sec-103"></a>`VNX-SEC-103` | IBM Cloud IAM API key | Critical | keyword + regex + entropy | `ibm` `iam` `apikey` | CWE-798 |
| <a id="vnx-sec-104"></a>`VNX-SEC-104` | Tencent Cloud secret ID (AKID) | High | keyword + regex | `akid` | CWE-798 |
| <a id="vnx-sec-105"></a>`VNX-SEC-105` | Tencent Cloud secret key | Critical | keyword + regex + entropy | `tencent` `qcloud` `secret` | CWE-798 |
| <a id="vnx-sec-106"></a>`VNX-SEC-106` | Yandex Cloud IAM token | High | keyword + regex | `t1.` | CWE-798 |
| <a id="vnx-sec-107"></a>`VNX-SEC-107` | Yandex Cloud OAuth token | Critical | keyword + regex | `y0_` `y1_` `y2_` `y3_` | CWE-798 |
| <a id="vnx-sec-108"></a>`VNX-SEC-108` | Scaleway secret key (UUID) | Critical | keyword + regex + entropy | `scaleway` `scw` `secret` | CWE-798 |
| <a id="vnx-sec-109"></a>`VNX-SEC-109` | Scaleway access key (SCW prefix) | High | keyword + regex | `scw` | CWE-798 |
| <a id="vnx-sec-110"></a>`VNX-SEC-110` | Hetzner Cloud API token | Critical | keyword + regex + entropy | `hetzner` `hcloud` `token` | CWE-798 |
| <a id="vnx-sec-111"></a>`VNX-SEC-111` | Linode personal access token | Critical | keyword + regex + entropy | `linode` | CWE-798 |
| <a id="vnx-sec-112"></a>`VNX-SEC-112` | Vultr API key | Critical | keyword + regex + entropy | `vultr` | CWE-798 |
| <a id="vnx-sec-113"></a>`VNX-SEC-113` | Fastly API token | High | keyword + regex + entropy | `fastly` | CWE-798 |
| <a id="vnx-sec-114"></a>`VNX-SEC-114` | Akamai EdgeGrid client token | High | keyword + regex | `akab-` | CWE-798 |
| <a id="vnx-sec-115"></a>`VNX-SEC-115` | Akamai EdgeGrid client secret | Critical | keyword + regex + entropy | `akamai` `client` | CWE-798 |
| <a id="vnx-sec-116"></a>`VNX-SEC-116` | AWS SES SMTP password | High | keyword + regex + entropy | `ses` `smtp` `password` | CWE-798 |
| <a id="vnx-sec-117"></a>`VNX-SEC-117` | AWS MWS auth token | High | keyword + regex | `amzn.mws.` | CWE-798 |
| <a id="vnx-sec-118"></a>`VNX-SEC-118` | AWS AppSync GraphQL API key (da2-) | High | keyword + regex | `da2-` | CWE-798 |
| <a id="vnx-sec-119"></a>`VNX-SEC-119` | AWS Cognito identity/user pool ID | Medium | keyword + regex + entropy | `cognito` | CWE-798 |
| <a id="vnx-sec-120"></a>`VNX-SEC-120` | AWS Cognito app client secret | High | keyword + regex + entropy | `cognito` `client` | CWE-798 |
| <a id="vnx-sec-121"></a>`VNX-SEC-121` | AWS Amplify app deploy/webhook ID | Medium | regex | `webhooks.amplify` | CWE-798 |
| <a id="vnx-sec-122"></a>`VNX-SEC-122` | AWS SNS topic ARN with credentials context | Medium | keyword + regex + entropy | `sns` `arn:aws:sns` | CWE-798 |
| <a id="vnx-sec-123"></a>`VNX-SEC-123` | Azure AD client secret | Critical | keyword + regex + entropy | `azure` `aad` `entra` `msal` | CWE-798 |
| <a id="vnx-sec-124"></a>`VNX-SEC-124` | Azure SAS token (shared access signature) | High | regex | `sig=` `sv=20` | CWE-798 |
| <a id="vnx-sec-125"></a>`VNX-SEC-125` | Azure Service Bus connection string | Critical | regex | `servicebus.windows.net` `sharedaccesskey` | CWE-798 |
| <a id="vnx-sec-126"></a>`VNX-SEC-126` | Azure Cosmos DB account key | Critical | regex | `documents.azure.com` `accountkey` | CWE-798 |
| <a id="vnx-sec-127"></a>`VNX-SEC-127` | Azure Cognitive Search admin key | High | keyword + regex + entropy | `search` | CWE-798 |
| <a id="vnx-sec-128"></a>`VNX-SEC-128` | Azure Container Registry password | High | keyword + regex + entropy | `acr` `azurecr` | CWE-798 |
| <a id="vnx-sec-129"></a>`VNX-SEC-129` | Azure DevOps personal access token | Critical | keyword + regex + entropy | `azure` `devops` `azdo` `vsts` | CWE-798 |
| <a id="vnx-sec-130"></a>`VNX-SEC-130` | GCP OAuth access token (ya29.) | High | keyword + regex | `ya29.` | CWE-798 |
| <a id="vnx-sec-131"></a>`VNX-SEC-131` | GCP OAuth refresh token (1//) | Critical | keyword + regex | `1//` | CWE-798 |
| <a id="vnx-sec-132"></a>`VNX-SEC-132` | Google reCAPTCHA secret key | Medium | keyword + regex + entropy | `recaptcha` `6l` | CWE-798 |
| <a id="vnx-sec-133"></a>`VNX-SEC-133` | Firebase Cloud Messaging server key (AAAA) | High | keyword + regex | `aaaa` | CWE-798 |
| <a id="vnx-sec-134"></a>`VNX-SEC-134` | Firebase Realtime Database URL | Medium | regex | `firebaseio.com` `firebasedatabase.app` | CWE-798 |
| <a id="vnx-sec-135"></a>`VNX-SEC-135` | DigitalOcean Spaces access key | High | keyword + regex | `do00` | CWE-798 |
| <a id="vnx-sec-136"></a>`VNX-SEC-136` | DigitalOcean Spaces secret key | Critical | keyword + regex + entropy | `spaces` `secret` | CWE-798 |
| <a id="vnx-sec-137"></a>`VNX-SEC-137` | Render API key (rnd_) | Critical | keyword + regex | `rnd_` | CWE-798 |
| <a id="vnx-sec-138"></a>`VNX-SEC-138` | Railway API/project token | Critical | keyword + regex + entropy | `railway` | CWE-798 |
| <a id="vnx-sec-139"></a>`VNX-SEC-139` | Fly.io API token (fo1_ / FlyV1) | Critical | keyword + regex | `fo1_` `flyv1` | CWE-798 |
| <a id="vnx-sec-140"></a>`VNX-SEC-140` | Aiven API token (aivenv1 / context) | Critical | keyword + regex + entropy | `aiven` | CWE-798 |
| <a id="vnx-sec-141"></a>`VNX-SEC-141` | Cloudflare Origin CA key (v1.0-) | High | keyword + regex | `v1.0-` | CWE-798 |
| <a id="vnx-sec-142"></a>`VNX-SEC-142` | Cloudflare Stream signing key context | High | keyword + regex + entropy | `stream` `signing` | CWE-798 |
| <a id="vnx-sec-143"></a>`VNX-SEC-143` | OVH application secret / consumer key | High | keyword + regex + entropy | `ovh` | CWE-798 |
| <a id="vnx-sec-144"></a>`VNX-SEC-144` | UpCloud API credentials context | High | keyword + regex + entropy | `upcloud` | CWE-798 |
| <a id="vnx-sec-145"></a>`VNX-SEC-145` | Alibaba Cloud STS temporary access key (STS.) | High | keyword + regex | `sts.` | CWE-798 |
| <a id="vnx-sec-146"></a>`VNX-SEC-146` | IBM Cloud Object Storage HMAC secret access key | Critical | keyword + regex + entropy | `ibm` `cos` `secret` | CWE-798 |
| <a id="vnx-sec-147"></a>`VNX-SEC-147` | Azure Storage connection string | Critical | regex | `defaultendpointsprotocol` `accountkey` | CWE-798 |
| <a id="vnx-sec-148"></a>`VNX-SEC-148` | GCP service account email + key context | High | keyword + regex + entropy | `private_key_id` | CWE-798 |
| <a id="vnx-sec-149"></a>`VNX-SEC-149` | Google Maps Platform API key (AIza, restricted-context) | Medium | keyword + regex + entropy | `maps` `aiza` | CWE-798 |
| <a id="vnx-sec-150"></a>`VNX-SEC-150` | Scaleway API token (UUID, context) | High | keyword + regex + entropy | `scaleway` `scw` | CWE-798 |
| <a id="vnx-sec-151"></a>`VNX-SEC-151` | Tencent Cloud COS connection (SecretId+SecretKey) | High | keyword + regex + entropy | `secretid` `akid` | CWE-798 |
| <a id="vnx-sec-152"></a>`VNX-SEC-152` | Cloudflare Global API key (legacy 37-hex) | Critical | keyword + regex + entropy | `cloudflare` `cf` | CWE-798 |
| <a id="vnx-sec-153"></a>`VNX-SEC-153` | GCP Firebase web API config apiKey (AIza, firebase context) | Medium | keyword + regex + entropy | `firebase` `aiza` | CWE-798 |
| <a id="vnx-sec-154"></a>`VNX-SEC-154` | Hetzner DNS API token (context) | High | keyword + regex + entropy | `hetzner` `dns` | CWE-798 |
| <a id="vnx-sec-155"></a>`VNX-SEC-155` | Vultr Object Storage S3 secret (context) | High | keyword + regex + entropy | `vultr` `secret` | CWE-798 |
| <a id="vnx-sec-156"></a>`VNX-SEC-156` | Fastly Compute / service ID with token context | Medium | keyword + regex + entropy | `fastly` `service` | CWE-798 |
| <a id="vnx-sec-157"></a>`VNX-SEC-157` | Render deploy hook URL | Medium | regex | `api.render.com/deploy` | CWE-798 |
| <a id="vnx-sec-158"></a>`VNX-SEC-158` | Linode Object Storage access key (context) | High | keyword + regex + entropy | `linode` `access` | CWE-798 |
| <a id="vnx-sec-159"></a>`VNX-SEC-159` | Azure Maps subscription key (context) | Medium | keyword + regex + entropy | `azure` `maps` | CWE-798 |
| <a id="vnx-sec-160"></a>`VNX-SEC-160` | GCP Cloud Run / IAP service identity token (context) | High | keyword + regex + entropy | `gcp` `google` `iap` `eyj` | CWE-798 |
| <a id="vnx-sec-161"></a>`VNX-SEC-161` | Alibaba Cloud secret access key (context) | Critical | keyword + regex + entropy | `alibaba` `aliyun` | CWE-798 |
| <a id="vnx-sec-162"></a>`VNX-SEC-162` | OVH application key (context) | Medium | keyword + regex + entropy | `ovh` `application` | CWE-798 |
| <a id="vnx-sec-163"></a>`VNX-SEC-163` | Yandex Cloud API key (AQVN context) | Critical | keyword + regex | `aqvn` | CWE-798 |
| <a id="vnx-sec-164"></a>`VNX-SEC-164` | IBM Cloud IAM bearer token (context) | High | keyword + regex + entropy | `ibm` `iam` `eyj` | CWE-798 |
| <a id="vnx-sec-165"></a>`VNX-SEC-165` | Aiven service connection URI (context) | Critical | regex | `aivencloud.com` | CWE-798 |
| <a id="vnx-sec-166"></a>`VNX-SEC-166` | Scaleway IAM API secret key (context) | Critical | keyword + regex + entropy | `scw` `scaleway` | CWE-798 |
| <a id="vnx-sec-167"></a>`VNX-SEC-167` | Tencent Cloud SCF / API gateway secret (context) | Critical | keyword + regex + entropy | `secretkey` `tencent` `qcloud` | CWE-798 |
| <a id="vnx-sec-168"></a>`VNX-SEC-168` | Cloudflare R2 S3 secret access key (context) | Critical | keyword + regex + entropy | `r2` `cloudflare` `secret` | CWE-798 |
| <a id="vnx-sec-169"></a>`VNX-SEC-169` | Azure subscription / tenant credential bundle (context) | Critical | keyword + regex + entropy | `azure` `tenant` `subscription` | CWE-798 |
| <a id="vnx-sec-170"></a>`VNX-SEC-170` | GCP API key (AIza) generic | High | keyword + regex | `aiza` | CWE-798 |
| <a id="vnx-sec-171"></a>`VNX-SEC-171` | Hetzner Cloud robot webservice password (context) | High | keyword + regex + entropy | `hetzner` `robot` | CWE-798 |
| <a id="vnx-sec-172"></a>`VNX-SEC-172` | Vultr deploy / API token (context, hex) | High | keyword + regex + entropy | `vultr` `token` | CWE-798 |
| <a id="vnx-sec-173"></a>`VNX-SEC-173` | Akamai EdgeGrid access token (context) | High | keyword + regex + entropy | `akamai` `akab-` | CWE-798 |
| <a id="vnx-sec-174"></a>`VNX-SEC-174` | GCP service account private key (PEM in JSON) | Critical | regex | `-----begin private key-----` | CWE-798 |
| <a id="vnx-sec-175"></a>`VNX-SEC-175` | Railway project deploy token (context, base64) | High | keyword + regex + entropy | `railway` | CWE-798 |
| <a id="vnx-sec-176"></a>`VNX-SEC-176` | Oracle Cloud (OCI) config fingerprint+key context | Medium | keyword + regex + entropy | `oci` `oracle` `fingerprint` | CWE-798 |
| <a id="vnx-sec-177"></a>`VNX-SEC-177` | DigitalOcean App Platform / function deploy URL (context) | Medium | regex | `ondigitalocean.app` | CWE-798 |
| <a id="vnx-sec-178"></a>`VNX-SEC-178` | Fly.io org deploy token (FlyV1 macaroon) | High | keyword + regex | `flyv1` `fm2_` | CWE-798 |
| <a id="vnx-sec-179"></a>`VNX-SEC-179` | Tencent Cloud webhook URL (context) | Medium | regex | `qyapi.weixin.qq.com/cgi-bin/webhook` | CWE-798 |

Suppress one with `// nosec <rule-id>` on the line, or `vulnetix ignore add --rule <rule-id>`. See [Suppressing findings](/sast/guides/suppressing-findings/).
