---
title: "How a turn runs: the agent loop"
nav: How a turn runs
description: What happens between your prompt and the reply. Admission, the system prompt, tool execution and its order, iteration limits, and how a turn ends.
order: 6
sources: [belai/docs/architecture.md, belai/docs/role-manager.md, belai/internal/agent]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

1. **Admission.** Your prompt is sanitised and classified. A prompt the classifier finds unsafe is stopped before any model call. A prompt with no mode set is routed to agent, plan or goal mode.
2. **The system prompt** is built from fixed blocks: the harness's instructions, the agent profile, the mode, the tools and the skills on offer. Each block is fenced with a delimiter that carries a nonce and an integrity hash, and untrusted text (tool output, files, web pages) is never allowed into those blocks.
3. **The model answers**, with text and tool calls.
4. **Tool calls run.** Before a call runs, its arguments are checked against the tool's schema, and an unknown key is refused by name. The permission rules decide allow, ask or deny. Then the call runs:
   - The leading run of read-only calls that need no ask runs concurrently, at most `resilience.max_agents` at a time (15 by default, held between 4 and 16).
   - Anything else runs in the order the model gave it. A write is always seen by the read that follows it.
5. **Results come back**, classified when they are from the shell, the web, or a file read, before the model sees them.
6. **The loop repeats** until the model answers without a tool call, or the turn reaches its iteration limit (`resilience.max_iterations`, 40 by default, or the profile's own).

In goal mode, a pass that reaches its limit goes to the goal evaluator, which decides whether to run another. See [Modes and plans](/software-factory/belai/modes-and-plans/).

## When something goes wrong

A model that sends a malformed, cut-off or dangling tool call gets a tool result explaining what was wrong, so it can correct itself. A provider failure is retried. See [Resilience](/software-factory/belai/resilience/).

## Related

- [Guardrails](/software-factory/belai/guardrails/)
- [Built-in tools](/software-factory/belai/tools/)
