---
title: Voice input and speech
nav: Voice and speech
description: Dictate into the composer with a model that runs inside Belai, and have replies read aloud.
order: 15
sources: [belai/docs/voice.md, belai/docs/tts.md]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

## Voice input

Speak to the composer instead of typing. Belai captures the microphone, recognises the speech with a small model that runs inside the Belai binary, tidies the wording with the fast model, and puts the text in the composer for you to send. **Audio stays on your machine.**

`/voice` sets it up: dictate with a hold-to-talk key, or always listening. Every build except the plain `belai` build carries the speech model; with the plain build, `/voice download` fetches it.

## Read aloud

Belai can read replies to you. A turn's final reply is read when it ends, if you ask for that; any reply can be read with `ctrl+b`; saying "stop" stops it. A card in the thread shows a player with a scrub bar and speed buttons. Audio is kept in a local cache, so a replay costs nothing and works offline.

`/tts` controls it: `on`, `off`, `stop`, the voice, the speed, and the cache.

> [!CAREFUL] Read aloud sends text off your machine
> No speech model is small enough to run inside Belai, so read aloud uses Microsoft's read-aloud service, the one the Edge browser uses. The text being read is sent to it over an encrypted connection. It is free and needs no key, but it is unofficial and can change or stop working. That is why read aloud is off until you run `/tts on`, which is also your agreement, and why a repository cannot turn it on. Voice input never leaves your machine.

## Related

- [Calling Pix](/software-factory/pix/calling-pix/), to talk to the factory instead.
