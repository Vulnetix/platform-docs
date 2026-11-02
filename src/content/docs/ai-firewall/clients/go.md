---
title: Go
description: The official `openai-go` SDK pointed at the gateway, with streaming and reading the refusal body.
order: 16
sources: [cli/pkg/aifirewall/templates/go-openai.tmpl, cli/pkg/aifirewall/snippet.go, ai-firewall/internal/api/codec.go, ai-firewall/internal/policy/engine.go, ai-firewall/website/content/docs/sdks/go.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

```bash
vulnetix ai-firewall snippet --lang go --sdk openai --provider openai --output-file main.go
```

prints this program with your UUID and an allowed model filled in. By hand:

```bash
go mod init hello && go get github.com/openai/openai-go
```

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

func main() {
	client := openai.NewClient(
		option.WithBaseURL("https://guardrails.vulnetix.com/openai/"+os.Getenv("VULNETIX_ORG_ID")+"/v1"),
		option.WithAPIKey(os.Getenv("VULNETIX_API_KEY")), // the Vulnetix key, not an OpenAI key
	)

	resp, err := client.Chat.Completions.New(context.Background(), openai.ChatCompletionNewParams{
		Model:    "gpt-4o-mini",
		Messages: []openai.ChatCompletionMessageParamUnion{openai.UserMessage("Hello")},
	})
	if err != nil {
		var apierr *openai.Error
		if errors.As(err, &apierr) && apierr.StatusCode == http.StatusForbidden {
			// apierr.Code is request_blocked, tool_denied, model_not_allowed, ...
			// apierr.RawJSON() is the error object, including blocked_by and violations.
			fmt.Fprintf(os.Stderr, "AI Firewall refused (%s): %s\n", apierr.Code, apierr.RawJSON())
			os.Exit(1)
		}
		panic(err)
	}
	fmt.Println(resp.Choices[0].Message.Content)
}
```

```bash
go run .
```

## Streaming

```go
stream := client.Chat.Completions.NewStreaming(context.Background(), openai.ChatCompletionNewParams{
	Model:    "gpt-4o-mini",
	Messages: []openai.ChatCompletionMessageParamUnion{openai.UserMessage("Hello")},
})
for stream.Next() {
	if chunk := stream.Current(); len(chunk.Choices) > 0 {
		fmt.Print(chunk.Choices[0].Delta.Content)
	}
}
if err := stream.Err(); err != nil {
	panic(err)
}
```

A refusal is decided before the stream opens, so it comes back from `stream.Err()` as the same `*openai.Error`.

## Other providers and surfaces

- Another `chat` provider: change the slug and model, for example `/groq/<uuid>/v1` with `llama-3.3-70b-versatile`.
- `client.Responses.New(...)` works against `openai`.
- For the Anthropic surface use `github.com/anthropics/anthropic-sdk-go` with `option.WithBaseURL("https://guardrails.vulnetix.com/anthropic/<uuid>")` (no `/v1`) and `option.WithAuthToken(os.Getenv("VULNETIX_API_KEY"))`.

Error codes: [Errors](/ai-firewall/reference/errors/).
