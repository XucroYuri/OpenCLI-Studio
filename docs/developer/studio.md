# OpenCLI Studio

OpenCLI Studio is the local-first web console for the existing OpenCLI registry.

It does not replace the CLI, daemon, or adapter model. Instead, it adds a contributor-oriented web surface that:

- browses the full command registry
- executes existing commands through the same runtime
- visualizes structured results for exploration and analysis
- promotes high-value command families into reusable recipe pages

## Why Studio Exists

OpenCLI already has broad CLI coverage across browser adapters, public APIs, desktop apps, plugins, and external commands. The missing piece was a discoverable front-end surface that could expose that breadth without weakening the current architecture.

Studio exists to solve three problems:

1. Registry legibility: hundreds of commands across many sites are hard to explore from the terminal alone.
2. Workflow composition: some command families benefit from a richer UI for filtering, repeated execution, and result comparison.
3. Contributor leverage: high-value command clusters such as hot lists, trend queries, and account-safe analytics can be turned into focused dashboards without re-implementing adapters.

## Architecture

Studio is intentionally split into two layers.

### 1. Local Studio server

The server lives under `src/studio/` and is started by:

```bash
opencli studio
opencli studio serve
```

Responsibilities:

- expose registry, history, environment, recipe, doctor, and execute APIs
- persist local run history in `~/.opencli/studio/studio.db`
- serve built frontend assets from `dist/studio`
- fall back to an instructional HTML shell when frontend assets are missing

The server reuses existing OpenCLI behavior instead of creating a second execution path:

- `getRegistry()`
- `executeCommand()`
- `runBrowserDoctor()`

### 2. Dedicated frontend app

The frontend lives in `studio/` and is built with:

- Vue 3
- Vue Router
- Pinia
- Naive UI
- ECharts

Responsibilities:

- render the Studio application shell
- manage route-aware UI state
- load data from the local Studio API
- transform structured command results into tables, charts, and key facts

## Current Pages

### Overview

High-level environment and activity surface:

- registry totals
- browser/public command split
- recent runs
- featured recipes
- doctor results

### Registry

Facet-based explorer for the command surface:

- search by command, site, or description
- filter by mode, capability, and risk
- surface chart-friendly and time-series-friendly commands

### Workbench

General-purpose command runner:

- command picker
- auto-generated argument form
- CLI preview
- structured result viewer
- recent run history per command

### Insights

Opinionated recipe pages for common analysis workflows:

- recipe catalog
- default parameter templates
- quick reruns with overrides
- shared result visualization path

## Development Workflow

### Run the frontend in dev mode

```bash
npm run studio:dev
```

### Build the frontend bundle

```bash
npm run studio:build
```

### Verify Studio

```bash
npm run studio:test
npm run studio:typecheck
npx vitest run src/cli.test.ts src/studio/command.test.ts src/studio/metadata.test.ts src/studio/server.test.ts --project unit
```

### Launch Studio through the real CLI

```bash
opencli studio
opencli studio serve
```

If `dist/studio` has not been built yet, the CLI keeps the local API server alive and shows a fallback page with build instructions instead of opening a broken UI.

## Extension Strategy

Studio should follow these rules when growing:

1. Reuse existing adapters and command execution paths. Do not fork adapter logic into the frontend.
2. Prefer metadata shaping over one-off page wiring. Broad coverage should come from registry-driven views.
3. Reserve custom pages for high-value clusters that benefit from richer interaction, such as trend dashboards and repeated topic analysis.
4. Keep dangerous or state-changing commands behind explicit confirmation even if they are technically executable from the workbench.
5. Treat Studio as local contributor tooling, not as a remote multi-user control plane.

## Good Next Steps

The current foundation intentionally leaves room for deeper stages:

- snapshot and scheduled trend collection
- saved presets and reusable analysis packs
- richer plugin and external CLI classification
- result export and shareable local reports
- more granular recipe coverage for platform-specific analytics
