# OpenCLI Studio Implementation Notes

## Goal

Build a local-first Studio web console for OpenCLI that:

- reuses the existing registry and execution engine
- adds a discoverable web UI for browsing and running commands
- provides a contributor-oriented path for higher-value dashboard surfaces

## Initial Delivery Scope

1. Studio local service
2. Studio CLI entrypoint
3. Registry + command detail APIs
4. Execute API with history persistence
5. Environment / doctor surface
6. Frontend shell with overview, registry, workbench, and recipes
7. Build and static asset serving integration

## Constraints

- Keep `E:\\Code\\Github\\OpenCLI` as the only project boundary.
- Do not weaken existing daemon origin restrictions.
- Reuse `discoverClis`, `discoverPlugins`, `getRegistry`, `executeCommand`, and `serializeCommand`.
- Default to safe/read-focused UI surfaces; advanced actions stay behind explicit confirmation in later phases.

## Implementation Order

### 1. Studio backend foundation

- Add `src/studio/` modules for metadata shaping, persistence, HTTP server, and recipe registry.
- Introduce a small SQLite-backed store under `~/.opencli/studio/studio.db`.
- Add tests for metadata classification and execute/history behavior before implementation.

### 2. CLI integration

- Add `opencli studio` and `opencli studio serve`.
- Support static asset serving from built Studio assets.
- Keep local dev and packaged build paths explicit.

### 3. Frontend application

- Create a dedicated `studio/` frontend app.
- Use Vue 3, Vue Router, Pinia, Naive UI, and ECharts.
- Deliver pages for Overview, Registry, Workbench, and Insights.

### 4. Recipes

- Start with lightweight recipe metadata and normalized UI cards for:
  - bilibili hot
  - google trends
  - reddit search
  - douyin hashtag
  - douyin stats

## Known Baseline Notes

- Full `npm test` is not currently clean on Windows in this workspace because of existing package export / dist expectations and Windows symlink restrictions in plugin tests.
- Feature work will use targeted tests plus build verification and will avoid masking those unrelated baseline issues.
