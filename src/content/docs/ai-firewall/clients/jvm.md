---
title: Java, Kotlin and Spring AI
nav: Java and Kotlin
description: "`openai-java` from Java and Kotlin, the community `openai-kotlin` client, and Spring AI pointed at the gateway, with the base-URL quirk of each."
order: 15
sources: [ai-firewall/internal/api/server.go, ai-firewall/internal/api/codec.go, ai-firewall/website/content/docs/sdks/java.md, ai-firewall/website/content/docs/sdks/kotlin.md, ai-firewall/website/content/docs/sdks/spring-ai.md]
checked: [ai-firewall@339de55]
updated: 02 Nov 2026
---

There is no CLI snippet for the JVM. Each example reads `VULNETIX_API_KEY` and `VULNETIX_ORG_ID` from the environment.

| Client | Base URL to give it |
|---|---|
| `openai-java` (Java or Kotlin) | `https://guardrails.vulnetix.com/<provider>/<uuid>/v1` |
| `openai-kotlin` (`com.aallam.openai`) | `https://guardrails.vulnetix.com/<provider>/<uuid>/v1/`, with a trailing slash |
| Spring AI | `https://guardrails.vulnetix.com/<provider>/<uuid>`, no `/v1` |

## Java with openai-java

```kotlin
// build.gradle.kts
implementation("com.openai:openai-java:+")
```

```java
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.errors.PermissionDeniedException;
import com.openai.models.chat.completions.ChatCompletion;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

public class Hello {
    public static void main(String[] args) {
        OpenAIClient client = OpenAIOkHttpClient.builder()
            .baseUrl("https://guardrails.vulnetix.com/openai/" + System.getenv("VULNETIX_ORG_ID") + "/v1")
            .apiKey(System.getenv("VULNETIX_API_KEY")) // the Vulnetix key
            .build();

        ChatCompletionCreateParams params = ChatCompletionCreateParams.builder()
            .model("gpt-4o-mini")
            .addUserMessage("Hello")
            .build();

        try {
            ChatCompletion completion = client.chat().completions().create(params);
            System.out.println(completion.choices().get(0).message().content().orElse(""));
        } catch (PermissionDeniedException e) { // HTTP 403
            // e.body() holds the error object: code, message, blocked_by, violations
            System.err.println("AI Firewall refused: " + e.body());
            throw e;
        }
    }
}
```

Pin a version instead of `+` in real builds. Stream with `client.chat().completions().createStreaming(params)`, which returns a `StreamResponse<ChatCompletionChunk>` to close with try-with-resources. For another provider change the slug and pass that provider's model id as a string, for example `.model("llama-3.3-70b-versatile")` on `groq`.

## Kotlin

`openai-java` works from Kotlin unchanged:

```kotlin
import com.openai.client.okhttp.OpenAIOkHttpClient
import com.openai.models.chat.completions.ChatCompletionCreateParams

fun main() {
    val client = OpenAIOkHttpClient.builder()
        .baseUrl("https://guardrails.vulnetix.com/openai/${System.getenv("VULNETIX_ORG_ID")}/v1")
        .apiKey(System.getenv("VULNETIX_API_KEY"))
        .build()

    val params = ChatCompletionCreateParams.builder()
        .model("gpt-4o-mini")
        .addUserMessage("Hello")
        .build()

    println(client.chat().completions().create(params).choices()[0].message().content().orElse(""))
}
```

With the community `com.aallam.openai:openai-client`, give `OpenAIHost` a trailing slash. Without it the client's URL resolution drops the last path segment and `.../v1` becomes `.../<uuid>/`, which `404`s.

```kotlin
import com.aallam.openai.api.chat.ChatCompletionRequest
import com.aallam.openai.api.chat.ChatMessage
import com.aallam.openai.api.chat.ChatRole
import com.aallam.openai.api.model.ModelId
import com.aallam.openai.client.OpenAI
import com.aallam.openai.client.OpenAIConfig
import com.aallam.openai.client.OpenAIHost

suspend fun main() {
    val openAI = OpenAI(
        OpenAIConfig(
            host = OpenAIHost(baseUrl = "https://guardrails.vulnetix.com/openai/${System.getenv("VULNETIX_ORG_ID")}/v1/"),
            token = System.getenv("VULNETIX_API_KEY"),
        )
    )
    val completion = openAI.chatCompletion(
        ChatCompletionRequest(
            model = ModelId("gpt-4o-mini"),
            messages = listOf(ChatMessage(role = ChatRole.User, content = "Hello")),
        )
    )
    println(completion.choices.first().message.content)
}
```

## Spring AI

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
```

Spring AI appends `/v1/chat/completions` to `base-url` itself, so the base URL stops at the UUID:

```yaml
spring:
  ai:
    openai:
      base-url: https://guardrails.vulnetix.com/openai/${VULNETIX_ORG_ID}
      api-key: ${VULNETIX_API_KEY}
      chat:
        options:
          model: gpt-4o-mini
```

```java
@Bean
CommandLineRunner demo(ChatClient.Builder builder) {
    ChatClient chat = builder.build();
    return args -> System.out.println(chat.prompt().user("Hello").call().content());
}
```

`chat.prompt().user("Hello").stream().content()` returns a `Flux<String>`. A refusal surfaces as a `403` client exception whose response body is the gateway's JSON error, with `error.code` and `error.blocked_by`.

Error codes: [Errors](/ai-firewall/reference/errors/).
