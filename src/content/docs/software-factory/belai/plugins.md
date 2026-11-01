---
title: Plugins
description: Bundle skills, hooks, prompts and agent profiles into one plugin, and install it from a git repository or a directory.
order: 12
sources: [belai/docs/plugins.md, belai/cmd/belai/plugin.go]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

A plugin bundles skills, hooks, saved prompts and agent profiles, so they can be shared and installed together from a git repository or a local directory. A manifest at the plugin's root lists what it contains.

## Commands

```sh
belai plugin install <git-url|dir>
belai plugin list
belai plugin update NAME
belai plugin disable NAME
belai plugin enable NAME
belai plugin remove NAME
```

`install` lists what the plugin contains and asks before installing. `-yes` installs without asking; the listing is still printed.

`/plugin` in the TUI lists, enables, disables and removes plugins.

## What a plugin can do

A plugin's components load like your own: its skills, prompts and profiles appear beside yours, and its hooks run like your hooks. They go through the same validation, so a plugin cannot do more than the same files written by hand.

> [!CAREFUL] A plugin's hooks are code
> Read a plugin's hooks before you install it. They run on your machine at the events they name.

## Related

- [Hooks](/software-factory/belai/hooks/)
- [The library](/software-factory/workforce/library/)
