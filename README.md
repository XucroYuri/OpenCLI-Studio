# OpenCLI Studio

> A Studio-first fork of [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI): keep the upstream automation engine, then add a clearer web workspace for browsing, selecting, running, and reviewing automation commands.

[![中文说明](https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-0F766E?style=flat-square)](./README.zh-CN.md)
[![Fork Source](https://img.shields.io/badge/upstream-jackwener%2FOpenCLI-111827?style=flat-square)](https://github.com/jackwener/OpenCLI)
[![Studio Repo](https://img.shields.io/badge/repo-XucroYuri%2FOpenCLI--Studio-2563EB?style=flat-square)](https://github.com/XucroYuri/OpenCLI-Studio)
[![License](https://img.shields.io/npm/l/@jackwener/opencli?style=flat-square)](./LICENSE)

## What This Repository Is

OpenCLI Studio is maintained as a fork of the upstream OpenCLI project.

- **Upstream repository**: [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI)
- **Current repository**: [XucroYuri/OpenCLI-Studio](https://github.com/XucroYuri/OpenCLI-Studio)
- **Goal of this fork**: keep tracking upstream CLI capabilities while evolving a stronger Studio experience for command discovery, workbench execution, readiness guidance, i18n, and creator-oriented workflows

This repository is not a separate runtime from OpenCLI. It keeps the same CLI core and adapter system, then layers Studio-specific UX and orchestration on top.

## What Is Inherited From Upstream

The fork keeps inheriting the parts that make OpenCLI valuable as an automation runtime:

- the `opencli` CLI entrypoint and core command execution model
- built-in site adapters and desktop app adapters
- browser bridge, daemon, and login-session reuse model
- adapter generation workflows such as `explore`, `synthesize`, `generate`, and `cascade`
- most upstream command metadata, docs structure, and release assets

## What This Fork Adds

OpenCLI Studio focuses on usability, especially for high-frequency users and content creators:

- a Studio web interface for `Overview`, `Registry`, `Workbench`, `Templates`, `Checks`, and `About`
- tighter Chinese and English i18n, with browser-language auto detection
- creator-oriented ranking for sites and automation commands
- category-driven registry browsing instead of plain alphabetical discovery
- clearer readiness prompts for login state, dependencies, and setup steps
- information-first result rendering in the workbench, with table-first output when charts are not helpful
- a more compact, product-oriented layout tuned for repeated use

## Compatibility Notes

To stay compatible with upstream:

- the package name is still `@jackwener/opencli`
- the CLI command is still `opencli`
- most upstream docs and commands remain applicable

That means this fork is best understood as **OpenCLI + Studio-focused product layer**, not as a brand new automation engine.

## Quick Start

### Run the Studio development stack

```bash
npm install
npm run studio:dev:all
```

Default entry:

- [http://127.0.0.1:4173/overview](http://127.0.0.1:4173/overview)
- [http://127.0.0.1:4173/registry](http://127.0.0.1:4173/registry)

### Run the CLI directly

```bash
npm run build
node dist/src/main.js list
node dist/src/main.js bilibili hot --limit 5
```

Or install the package globally:

```bash
npm install -g @jackwener/opencli
opencli list
```

## Releases And Extension Downloads

This fork keeps its own release page so Studio users can download extension assets from the fork directly:

- [OpenCLI-Studio Releases](https://github.com/XucroYuri/OpenCLI-Studio/releases)

The Browser Bridge download prompts in this repository now point to the fork release page instead of the upstream release page.

## Repository Relationship And Sync Strategy

The working model for this repository is:

1. Sync upstream `main` regularly from `jackwener/OpenCLI`
2. Rebase or adapt the Studio module when upstream automation surfaces change
3. Keep fork-specific UX, localization, ranking, and orchestration logic isolated where possible
4. Contribute reusable or low-intrusion parts back upstream when they can land cleanly

## Where To Look Next

- Studio frontend: [`studio/`](./studio)
- Studio backend glue: [`src/studio/`](./src/studio)
- Adapter docs index: [`docs/adapters/index.md`](./docs/adapters/index.md)
- Upstream project docs: [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI)
