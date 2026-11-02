---
title: Rust, .NET, Ruby, PHP, Elixir, Swift and Dart
nav: More languages
description: The base-URL and key settings for the common OpenAI clients in Rust, C#, Ruby, PHP, Elixir, Swift and Dart, with the quirk of each.
order: 17
sources: [ai-firewall/internal/api/server.go, ai-firewall/internal/api/handlers.go, ai-firewall/internal/api/codec.go, ai-firewall/website/content/docs/sdks/rust.md, ai-firewall/website/content/docs/sdks/dotnet-csharp.md, ai-firewall/website/content/docs/sdks/ruby.md, ai-firewall/website/content/docs/sdks/php.md, ai-firewall/website/content/docs/sdks/elixir.md, ai-firewall/website/content/docs/sdks/swift.md, ai-firewall/website/content/docs/sdks/dart-flutter.md]
checked: [ai-firewall@339de55]
updated: 02 Nov 2026
---

Every client here speaks the `chat` surface. Set the base URL to the gateway and the key to your Vulnetix API key; nothing else changes. Each example reads `VULNETIX_API_KEY` and `VULNETIX_ORG_ID`.

| Language | Package | Base URL setting | Quirk |
|---|---|---|---|
| Rust | `async-openai` | `OpenAIConfig::with_api_base` | none |
| C# / .NET | `OpenAI` (NuGet) | `OpenAIClientOptions.Endpoint` | none |
| Ruby | `openai` (official gem) | `base_url:` | none |
| PHP | `openai-php/client` | `withBaseUri` | Takes the URL without `https://` |
| Elixir | `openai_ex` | `OpenaiEx.with_base_url` | Must include `/v1` |
| Swift | MacPaw `OpenAI` | `host` plus `basePath` | `basePath` stops at the UUID; the client adds `/v1` |
| Dart / Flutter | `openai_dart` | `OpenAIConfig.baseUrl` | none |

A refusal is HTTP `403` with `error.code` and `error.blocked_by` in the JSON body; each library's error type exposes the status and body. Codes are in [Errors](/ai-firewall/reference/errors/).

## Rust

```bash
cargo add async-openai tokio --features tokio/full
```

```rust
use async_openai::{
    config::OpenAIConfig,
    types::{ChatCompletionRequestUserMessageArgs, CreateChatCompletionRequestArgs},
    Client,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let org = std::env::var("VULNETIX_ORG_ID")?;
    let config = OpenAIConfig::new()
        .with_api_base(format!("https://guardrails.vulnetix.com/openai/{org}/v1"))
        .with_api_key(std::env::var("VULNETIX_API_KEY")?);
    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model("gpt-4o-mini")
        .messages([ChatCompletionRequestUserMessageArgs::default()
            .content("Hello")
            .build()?
            .into()])
        .build()?;

    let response = client.chat().create(request).await?;
    println!("{}", response.choices[0].message.content.clone().unwrap_or_default());
    Ok(())
}
```

A refusal is `Err(OpenAIError::ApiError(e))` with `e.code == Some("request_blocked")` (or another code) and the message from the gateway.

## C# / .NET

```bash
dotnet add package OpenAI
```

```csharp
using System.ClientModel;
using OpenAI;
using OpenAI.Chat;

string org = Environment.GetEnvironmentVariable("VULNETIX_ORG_ID")!;
ChatClient client = new(
    model: "gpt-4o-mini",
    credential: new ApiKeyCredential(Environment.GetEnvironmentVariable("VULNETIX_API_KEY")!),
    options: new OpenAIClientOptions { Endpoint = new Uri($"https://guardrails.vulnetix.com/openai/{org}/v1") });

ChatCompletion completion = client.CompleteChat("Hello");
Console.WriteLine(completion.Content[0].Text);
```

A refusal throws `ClientResultException` with `Status == 403`; `e.GetRawResponse()!.Content` is the JSON body.

## Ruby

```bash
bundle add openai
```

```ruby
require "openai"

client = OpenAI::Client.new(
  base_url: "https://guardrails.vulnetix.com/openai/#{ENV.fetch("VULNETIX_ORG_ID")}/v1",
  api_key: ENV.fetch("VULNETIX_API_KEY")
)
chat = client.chat.completions.create(
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }]
)
puts chat.choices[0].message.content
```

A refusal raises `OpenAI::Errors::PermissionDeniedError`; `e.body` holds the error.

## PHP

```bash
composer require openai-php/client
```

```php
<?php
require 'vendor/autoload.php';

$org = getenv('VULNETIX_ORG_ID');
$client = OpenAI::factory()
    ->withApiKey(getenv('VULNETIX_API_KEY'))
    ->withBaseUri("guardrails.vulnetix.com/openai/{$org}/v1") // no scheme: the client adds https://
    ->make();

$result = $client->chat()->create([
    'model' => 'gpt-4o-mini',
    'messages' => [['role' => 'user', 'content' => 'Hello']],
]);
echo $result->choices[0]->message->content, PHP_EOL;
```

A refusal throws `OpenAI\Exceptions\ErrorException`; `getErrorCode()` returns the gateway's `code`.

## Elixir

```elixir
# mix.exs
defp deps, do: [{:openai_ex, "~> 0.9"}]
```

```elixir
alias OpenaiEx.Chat
alias OpenaiEx.ChatMessage

org = System.fetch_env!("VULNETIX_ORG_ID")

openai =
  System.fetch_env!("VULNETIX_API_KEY")
  |> OpenaiEx.new()
  |> OpenaiEx.with_base_url("https://guardrails.vulnetix.com/openai/#{org}/v1")

req = Chat.Completions.new(model: "gpt-4o-mini", messages: [ChatMessage.user("Hello")])
{:ok, response} = Chat.Completions.create(openai, req)
IO.puts(get_in(response, ["choices", Access.at(0), "message", "content"]))
```

A refusal is `{:error, %OpenaiEx.Error{status_code: 403, code: code}}`.

## Swift

```swift
// Package.swift
.package(url: "https://github.com/MacPaw/OpenAI.git", from: "0.4.0")
```

```swift
import Foundation
import OpenAI

let env = ProcessInfo.processInfo.environment
let openAI = OpenAI(configuration: OpenAI.Configuration(
    token: env["VULNETIX_API_KEY"]!,
    host: "guardrails.vulnetix.com",
    basePath: "/openai/\(env["VULNETIX_ORG_ID"]!)"   // the client appends /v1/...
))
let query = ChatQuery(messages: [.user(.init(content: .string("Hello")))], model: "gpt-4o-mini")
let result = try await openAI.chats(query: query)
print(result.choices.first?.message.content ?? "")
```

Without a library, `URLSession` works the same as [curl](/ai-firewall/clients/curl/): `POST https://guardrails.vulnetix.com/openai/<uuid>/v1/chat/completions` with `Authorization: Bearer <key>`, and check for `statusCode == 403`.

## Dart / Flutter

```bash
dart pub add openai_dart
```

```dart
import 'dart:io';
import 'package:openai_dart/openai_dart.dart';

Future<void> main() async {
  final env = Platform.environment;
  final client = OpenAIClient(
    config: OpenAIConfig(
      authProvider: ApiKeyProvider(env['VULNETIX_API_KEY']!),
      baseUrl: 'https://guardrails.vulnetix.com/openai/${env['VULNETIX_ORG_ID']}/v1',
    ),
  );
  final response = await client.chat.completions.create(
    ChatCompletionCreateRequest(model: 'gpt-4o-mini', messages: [ChatMessage.user('Hello')]),
  );
  print(response.text);
}
```

> [!CAREFUL] Do not ship the key in a mobile or desktop app
> A Vulnetix API key compiled into an app can be extracted. Call the gateway from your own backend, and let the app talk to that.
