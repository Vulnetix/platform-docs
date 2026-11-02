---
title: "VNX-ANDROID-001: Android app shipped debuggable or with unrestricted backup"
nav: "VNX-ANDROID-001"
description: "Detects a production Android build made debuggable (android:debuggable=\"true\" in AndroidManifest.xml, or debuggable / isDebuggable in the release build type) and android:allowBackup=\"true\" on an application with no backup or data-extraction rules."
order: 655
sources: ["cli/internal/sast/rules/vnx-android-001.rego", "cli/internal/sast/docs/vnx-android-001.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-ANDROID-001` |
| Severity | High |
| SARIF level | `error` |
| Kind | `sast` |
| Languages | Android |
| CWE | [CWE-489](https://cwe.mitre.org/data/definitions/489.html), [CWE-921](https://cwe.mitre.org/data/definitions/921.html) |
| CAPEC | [CAPEC-37](https://capec.mitre.org/data/definitions/37.html) |
| ATT&CK | [T1409](https://attack.mitre.org/techniques/T1409/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:RU/AL:S/IC:N/FC:LT/RP:RU/RL:S/AV:L/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `android` `manifest` `debuggable` `backup` `mobile-security` |
| Source | [`internal/sast/rules/vnx-android-001.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-android-001.rego) |

## Overview

This rule reports two production-hardening mistakes in an Android app: a debuggable release build, and an app that lets the platform back up all of its private data. They are covered by CWE-489 (Active Debug Code) and CWE-921 (Storage of Sensitive Data in a Mechanism without Access Control). Exported components are reported by [VNX-ANDROID-003](/sast/rules/vnx-android-003/) and cleartext traffic (`android:usesCleartextTraffic`) by [VNX-ANDROID-005](/sast/rules/vnx-android-005/).

## Why This Matters

When `android:debuggable="true"` is present in a production APK, any user with `adb` access, or any app running with `android.permission.GET_TASKS`, can attach a debugger to the process, inspect heap memory, override method return values, and exfiltrate secrets. The 2012 Skype Android data-leakage incident and several banking-trojan campaigns have exploited debuggable flags left in production releases.

`android:allowBackup="true"` with no backup rules copies the entire private data directory (databases, tokens, session cookies, shared preferences) into cloud backups and device-to-device transfers, and on older platform versions lets any computer with `adb` pull it with `adb backup` without root.

## What Gets Flagged

- `android:debuggable="true"` in an `AndroidManifest.xml`.
- `debuggable true` (Groovy) or `isDebuggable = true` (Kotlin DSL) inside the `release` build type of `build.gradle` or `build.gradle.kts`.
- `android:allowBackup="true"` on an `<application>` that declares neither `android:fullBackupContent` nor `android:dataExtractionRules`.

```xml
<!-- FLAGGED: both attributes, and no backup rules -->
<application
    android:name=".WalletApp"
    android:allowBackup="true"
    android:debuggable="true"
    android:label="@string/app_name">
```

```kotlin
// FLAGGED: the release build type is debuggable
buildTypes {
    getByName("release") {
        isMinifyEnabled = true
        isDebuggable = true
    }
}
```

Not flagged: `false` or `${placeholder}` values; `allowBackup="true"` together with `fullBackupContent` or `dataExtractionRules` (the rules decide what is excluded); the `debug` and other build types; manifests in `src/debug`, `src/androidTest` and `src/test`; test, sample, example and demo modules; XML comments; the attribute text inside Java or Kotlin strings. An omitted `allowBackup` (which defaults to true) is not reported.

## Remediation

1. **Disable debuggable in all release build types.** In `build.gradle` (or `build.gradle.kts`) ensure the release build type explicitly sets `debuggable false`. Never rely on the default, as some CI configurations override it.

   ```groovy
   // SAFE: release build type with explicit security flags
   buildTypes {
       release {
           debuggable false
           minifyEnabled true
           proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
       }
   }
   ```

2. **Disable backup or define a backup rules file.** Set `android:allowBackup="false"` unless cloud backup is a deliberate product feature. If you need selective backup, use `android:dataExtractionRules` (API 31+) and `android:fullBackupContent` with XML rules files that exclude sensitive files.

   ```xml
   <!-- SAFE: backup disabled for sensitive apps -->
   <application
       android:allowBackup="false"
       android:debuggable="false"
       ... >
   ```

3. **Automate enforcement.** Add a lint rule or a build script assertion that fails the build if the release APK manifest contains `debuggable=true` or `allowBackup=true`. The Android Gradle plugin will also emit warnings for these flags.

## References

- [CWE-489: Active Debug Code](https://cwe.mitre.org/data/definitions/489.html)
- [CWE-921: Storage of Sensitive Data in a Mechanism without Access Control](https://cwe.mitre.org/data/definitions/921.html)
- [CAPEC-37: Retrieve Embedded Sensitive Data](https://capec.mitre.org/data/definitions/37.html)
- [MITRE ATT&CK T1409 – Stored Application Data](https://attack.mitre.org/techniques/T1409/)
- [Android Security: android:debuggable](https://developer.android.com/guide/topics/manifest/application-element#debug)
- [Android Backup Documentation](https://developer.android.com/guide/topics/data/backup)
- [Android Network Security Configuration](https://developer.android.com/training/articles/security-config)
- [OWASP Mobile Security Testing Guide – MSTG-STORAGE-7](https://mas.owasp.org/MASTG/tests/android/MASVS-STORAGE/MASTG-TEST-0012/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-android-001
// nosec vnx-android-001
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-android-001 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
