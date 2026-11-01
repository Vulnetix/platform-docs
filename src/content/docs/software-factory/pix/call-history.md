---
title: Call history, memory and review
nav: Call history
description: What is kept from a call and what never is, the call archive, rating a call and calling about it again, and the notes Pix keeps between calls.
order: 3
sources: [website/.repo/pix-call.md, vdb-site/docs/pix-call-history.md, vdb-site/api/internal/handler/pix_call_history.go, vdb-site/api/internal/handler/pix_call_memory.go, vdb-site/api/internal/handler/pix_call_review.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

## What is kept

What was said on a call, and the cards the page showed (actions, tables, read-backs and how each was settled), are kept, so you can read a call again, download it, rate it and call about it.

**Never kept**: audio, your IP address, your location, and the names of the models involved. A table is kept up to 50 rows and 50 tables a call; a call up to 1,500 events.

## The archive

Past calls are in **Logs › Pix calls**, and in the call page's **Past calls** chip. Both list calls, newest first, with search and a date range. Older Pix chats from the retired chat drawer are listed too, marked as such.

Each past call has **Call Pix**, which starts a new call about it: Pix knows what was said and can pick up where it left off.

You can give a thumbs up or down on each of Pix's replies; a thumbs down offers an optional note.

## Memory

Pix keeps notes between calls only when you ask, or when you state a lasting preference: "remember that I always want plan mode on vdb-site". It can search them and delete one when you ask, saying which note first. The 15 most recent notes go into each call. Notes never hold anything Pix overheard; only what you asked it to keep or told it as a standing preference.

> [!WHY] Why Pix remembers only on request
> A call often includes things you would not want repeated next week. Keeping only what you ask for means you always know what Pix knows.

## Every call is a record

Each call is also logged to the factory's call log, so [Delivery](/software-factory/evidence/delivery/) can count the time people spend directing the factory by phone (`delivery.sources.pixcall`).

## API

| Method | Path |
|---|---|
| GET | `/v1/pix-call/history` and `/v1/pix-call/history/{id}` |
| DELETE | `/v1/pix-call/history/{id}` |
| POST | `/v1/pix-call/history` (the call worker writes here as you) |
| POST | `/v1/pix-call/feedback` |
| POST | `/v1/pix-call/review` (the admin review lane) |
| GET, POST, DELETE | `/v1/pix-call/memories` and `/v1/pix-call/memories/{id}` |
| POST | `/v1/factory/call-log` |
