---
title: Maven and Gradle
nav: Maven and Gradle
description: Route Maven through the Package Firewall with a settings.xml mirror, and declare the same repository for Gradle, which ignores settings.xml.
order: 7
sources: [cli/pkg/packagefirewall/config.go, cli/internal/managedfile/file.go, package-firewall/internal/ecosystem/maven/maven.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 03 Nov 2026
---

| | |
|---|---|
| Repository URL | `https://packages.vulnetix.com/maven/` |
| Ecosystem ID | `maven` |
| Plan | Add-on |
| Mode | filter: blocked versions are removed from `maven-metadata.xml` |
| Cooldown | no (Maven metadata has no publish time) |
| Default mirror | `https://repo1.maven.org/maven2` |

Curation entries and namespace entries use `groupId:artifactId`, for example `com.acme:core` or `com.acme:*`.

## Automatic setup (Maven)

```bash
vulnetix package-firewall maven
```

This replaces `~/.m2/settings.xml` with the file below. An existing `settings.xml` is first copied to `~/.m2/settings.xml.vulnetix.bak`, and `vulnetix package-firewall uninstall maven` restores it.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings>
  <servers>
    <server>
      <id>vulnetix-package-firewall</id>
      <username>YOUR_ORG_UUID</username>
      <password>YOUR_API_KEY</password>
    </server>
  </servers>
  <mirrors>
    <mirror>
      <id>vulnetix-package-firewall</id>
      <mirrorOf>*</mirrorOf>
      <url>https://packages.vulnetix.com/maven/</url>
    </mirror>
  </mirrors>
</settings>
```

> [!CAREFUL] Your other settings are moved aside
> The written `settings.xml` holds only the firewall server and mirror. Profiles, proxies and other servers from your old file are in the `.vulnetix.bak` copy. Merge them back by hand if you need them.

`<mirrorOf>*</mirrorOf>` sends every repository through the firewall. Use `*,!internal-repo` to let one repository bypass it.

## Gradle

Gradle does not read `settings.xml`. Declare the firewall in `settings.gradle.kts` and keep the credentials in `~/.gradle/gradle.properties`:

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        maven {
            name = "vulnetix"
            url = uri("https://packages.vulnetix.com/maven/")
            credentials(PasswordCredentials::class)
        }
    }
}
```

```properties
# ~/.gradle/gradle.properties
vulnetixUsername=YOUR_ORG_UUID
vulnetixPassword=YOUR_API_KEY
```

`credentials(PasswordCredentials::class)` reads `<name>Username` and `<name>Password`. `FAIL_ON_PROJECT_REPOS` stops a module's own `mavenCentral()` from going around the firewall. Plugins resolve from `pluginManagement.repositories`; add the same `maven { }` block there to cover them.

## Use and verify

```bash
mvn help:effective-settings
mvn dependency:resolve
./gradlew dependencies --refresh-dependencies
```
