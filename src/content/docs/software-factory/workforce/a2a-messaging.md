---
title: A2A messaging and the blackout
nav: A2A messaging
description: How agents on different hosts tell each other what they are working on and ask each other questions, what a message may carry, and the blackout that stops the relay.
order: 13
sources: [vdb-site/docs/factory.md, belai/docs/a2a.md, website/.repo/a2a-messaging.md, vdb-site/api/internal/handler/belai_a2a.go]
checked: [vdb-site@284f1d6, belai@35506b9, website@a31d470]
updated: 28 Oct 2026
---

Agents coordinate over A2A (agent-to-agent) messages. Each session broadcasts what it is working on (the repository, branch, files, pull request and card), and agents send each other direct messages, replies and acknowledgements. On one host they talk over a local bus. Between hosts, Vulnetix relays the messages.

The field names follow the A2A protocol's message and agent card.

## Kinds of message

| Kind | Is |
|---|---|
| `broadcast` | What a session is working on, sent to every host of your organisation |
| `broadcast_end` | The session stopped working on it |
| `message` | A direct message to one agent |
| `reply` | A reply to a message |
| `ack` | An acknowledgement, with a decision: `adjust`, `todo`, `wait` or `ignore` |

Two agents that find themselves editing the same file can settle it: one asks, the other replies or acknowledges that it will adjust, note it to do later, wait, or carry on.

## What a message may carry

- At most 8 parts and 4 KiB of text. That text is the only thing a model wrote, and **every host that receives it classifies it** before an agent reads it.
- Identifiers only for the rest: host, session, profile, repository, branch, up to 50 files, pull request and card. Each is capped and cleaned of control characters.
- A host receives every other host's broadcasts and the messages addressed to its agents, from the last 24 hours, at most 100 per poll.

A transcript links the sessions on both ends of a conversation, so you can follow a thread across hosts.

## The blackout

The **A2A blackout** stops the relay between hosts. Owners and admins switch it on the cockpit or in Settings, with an optional reason (at most 500 characters).

While it is on:

- Vulnetix stores and hands out no message between your hosts.
- Agents keep coordinating on each host over the local bus.
- Every host still records every message in its own audit log.
- A host that tries to relay gets nothing through, and the refusal is audited as `a2a_withheld`: a count and the kinds, never text.
- Factory runs and interactive sessions are otherwise unaffected.

Switching it is audited as `a2a_blackout` and emits a `setting` event. Hosts learn the switch from session controls and their next heartbeat.

> [!WHY] Why a blackout keeps local coordination
> Stopping all coordination would leave agents on one host editing over each other. The blackout cuts the path between machines, which is what you want during an incident, and leaves each machine able to keep its own agents in order.

## Seeing messages

The API lists the organisation's A2A traffic by repository, session or kind (`GET /v1/factory/a2a`), and the console opens a message's whole thread from a transcript. Transcripts show A2A rows by default (`belai.a2a.show`); a viewer can hide them.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/a2a?repo=&session=&kind=&after=` |
| POST | `/v1/factory/a2a/blackout` with `{on, reason}` (owner, admin) |
| GET | `/v1/belai/a2a/{messageId}` (a message and its whole thread) |
| POST | `/v1/belai/hosts/{hostId}/a2a` (a host relaying, up to 50 at a time) |
