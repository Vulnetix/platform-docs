---
title: "Stopping work: the five stops"
nav: Stopping work
description: The five ways to stop factory work, from one session to destroying a sandbox. What each stops and keeps, and where to find it.
order: 5
sources: [website/src/shared/pix-pocket.ts, vdb-site/docs/factory.md]
checked: [website@a31d470, vdb-site@284f1d6]
updated: 28 Oct 2026
---

When something looks wrong, there are five stops, from narrowest to widest reach. Each keeps as much as it can.

| Stop | Where | Stops | Keeps |
|---|---|---|---|
| **Stop a session** | A Pix call (`propose_stop` then `stop_session`), or the session page | One session | Everything else |
| **Pause all automations** | The cockpit | Every trigger. No new step starts. | Steps already running finish. |
| **A2A blackout** | The cockpit and Settings | Messages relayed between your hosts | Coordination on each host, and every host's audit log |
| **Stop the factory** | Settings | Running steps are cancelled, leases released, forge tokens revoked, pending wakes cancelled | Interactive sessions people started |
| **Stop machine** | Pix Sandboxes | Destroys the sandbox container | Work already pushed |

> [!CAREFUL] Stopping a machine loses anything not pushed
> Destroying a sandbox container ends every session on it. Commits that were not pushed are gone. Try the narrower stops first.

## On a call

Pix can stop sessions, after reading back exactly which session it will stop and hearing your yes. It cannot pause the factory or destroy a sandbox: those are on the cockpit, Settings and Pix Sandboxes, where you can see what they will affect.

## Related

- [Pause, stop and resume](/software-factory/control/pause-and-stop/)
- [A2A messaging](/software-factory/workforce/a2a-messaging/)
- [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/)
