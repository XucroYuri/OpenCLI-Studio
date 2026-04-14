# OpenCLI Studio Next Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continue OpenCLI Studio from the current shipped contributor-console baseline into a more self-healing, better-documented, and higher-coverage local analysis surface without weakening the existing CLI architecture.

**Architecture:** Keep Studio split into `src/studio/` for the local API/runtime layer and `studio/` for the Vue application. Continue to reuse the existing registry, execution, plugin, doctor, and history/snapshot plumbing instead of forking adapter logic into the frontend. Prefer metadata, readiness, and recipe shaping over per-command bespoke pages.

**Tech Stack:** TypeScript, Node HTTP server, existing OpenCLI runtime, Vue 3, Vue Router, Pinia, Naive UI, SVG chart rendering, Vite, Vitest, Vue TSC.

---

## Resume Context

### Repository Boundary

- Target repo boundary: `E:\Code\Github\OpenCLI`
- Active branch at this checkpoint: `feature/opencli-studio`
- Remote branch: `origin/feature/opencli-studio`

### Current Studio Baseline

Studio currently includes:

- CLI entrypoints: `opencli studio`, `opencli studio serve`
- Pages: `Overview`, `Registry`, `Workbench`, `Insights`, `Ops`
- Persisted local state: history, presets, favorites, snapshots, jobs
- Safer navigation defaults and advanced-mode gating
- Registry `surface/mode/capability/risk` classification
- Ops inventory for plugins and external CLIs
- Workbench and Insights readiness notices driven by doctor/plugin state
- SVG-based chart rendering replacing the earlier `echarts` dependency

### Recent Git Checkpoints

- `2c7c9d9` `feat: add studio ops inventory api`
- `1fd613d` `feat: add studio ops console`
- `25f8bff` `feat: add studio ops install guidance`
- `3af543f` `feat: add studio command readiness notices`
- `f8eb523` `perf: replace studio echarts charts with svg`

### Fresh Verification Baseline

Run these before starting new feature work so you know the branch is still healthy:

```bash
npm run studio:test
npm run studio:typecheck
npm run studio:build
npx vitest run src/cli.test.ts src/studio/command.test.ts src/studio/metadata.test.ts src/studio/server.test.ts src/studio/store.test.ts src/studio/scheduler.test.ts src/studio/ops.test.ts --project unit
npm run typecheck
```

Expected baseline:

- Studio tests: `11 passed`
- Root targeted unit tests: `7 passed`
- `studio:build`: no `echarts` large-chunk warning
- Root `typecheck`: exit code `0`

### Important Current Files

- Backend/runtime:
  - `src/studio/server.ts`
  - `src/studio/metadata.ts`
  - `src/studio/ops.ts`
  - `src/studio/recipes.ts`
  - `src/studio/store.ts`
- Frontend shell/pages:
  - `studio/src/App.vue`
  - `studio/src/router.ts`
  - `studio/src/views/OverviewView.vue`
  - `studio/src/views/RegistryView.vue`
  - `studio/src/views/WorkbenchView.vue`
  - `studio/src/views/InsightsView.vue`
  - `studio/src/views/OpsView.vue`
- Frontend logic:
  - `studio/src/stores/studio.ts`
  - `studio/src/lib/readiness.ts`
  - `studio/src/lib/ops.ts`
  - `studio/src/lib/results.ts`
  - `studio/src/lib/chart-layout.ts`
  - `studio/src/lib/preset-state.ts`
  - `studio/src/lib/routes.ts`
  - `studio/src/lib/registry.ts`

### Guardrails

- Do not reintroduce `echarts` unless a concrete visualization requirement cannot be met with the current SVG layer.
- Do not fork CLI execution logic into the frontend.
- Do not remove advanced-mode safeguards around non-safe commands.
- Prefer new tests in `src/studio/*.test.ts` and `studio/src/lib/*.test.ts` before implementation changes.
- Keep milestone commits small and push after each major phase.

## Task 1: Turn Readiness Warnings Into Remediation Flows

**Files:**

- Modify: `studio/src/lib/readiness.ts`
- Modify: `studio/src/views/OpsView.vue`
- Modify: `studio/src/views/WorkbenchView.vue`
- Modify: `studio/src/views/InsightsView.vue`
- Modify: `studio/src/styles.css`
- Test: `studio/src/lib/readiness.test.ts`
- Test: `studio/src/lib/ops.test.ts`

- [ ] Extend `studio/src/lib/readiness.test.ts` with cases for actionable remediation copy, not just status classification.
- [ ] Run `npm run studio:test -- src/lib/readiness.test.ts` and confirm the new tests fail for the expected missing remediation fields.
- [ ] Update `studio/src/lib/readiness.ts` so readiness objects can include remediation actions such as:
  - open `Ops`
  - rerun doctor with live mode
  - inspect plugin coverage
  - copy external install command when available
- [ ] Update `studio/src/views/WorkbenchView.vue` and `studio/src/views/InsightsView.vue` so readiness banners render those remediation actions directly instead of only showing passive warnings.
- [ ] Update `studio/src/views/OpsView.vue` so the relevant cards expose those same actions consistently.
- [ ] Run:

```bash
npm run studio:test -- src/lib/readiness.test.ts src/lib/ops.test.ts
npm run studio:typecheck
```

- [ ] Commit:

```bash
git add studio/src/lib/readiness.ts studio/src/lib/readiness.test.ts studio/src/views/WorkbenchView.vue studio/src/views/InsightsView.vue studio/src/views/OpsView.vue studio/src/styles.css
git commit -m "feat: add studio remediation flows"
```

## Task 2: Add Command Documentation, Examples, and Operator Hints

**Files:**

- Modify: `src/studio/server.ts`
- Modify: `src/studio/types.ts`
- Modify: `studio/src/types.ts`
- Modify: `studio/src/stores/studio.ts`
- Modify: `studio/src/views/WorkbenchView.vue`
- Modify: `studio/src/views/RegistryView.vue`
- Modify: `studio/src/styles.css`
- Test: `src/studio/server.test.ts`
- Test: `src/studio/metadata.test.ts`

- [ ] Add backend tests in `src/studio/server.test.ts` for richer command detail payloads, including description/help/example-oriented fields derived from existing command metadata.
- [ ] Run `npx vitest run src/studio/server.test.ts src/studio/metadata.test.ts --project unit` and confirm those tests fail because the detail payload is still too thin.
- [ ] Extend the Studio command detail response in `src/studio/server.ts` and `src/studio/types.ts` so the frontend can retrieve a single command’s richer metadata without recomputing it client-side.
- [ ] Use existing argument metadata to surface:
  - required vs optional fields
  - choices
  - default values
  - safer example invocation snippets
- [ ] Update `studio/src/views/WorkbenchView.vue` to add a compact docs panel for the selected command.
- [ ] Update `studio/src/views/RegistryView.vue` to make command cards clearer about what each command is for before the user opens Workbench.
- [ ] Run:

```bash
npx vitest run src/studio/server.test.ts src/studio/metadata.test.ts --project unit
npm run studio:typecheck
npm run studio:test -- src/lib/routes.test.ts src/lib/registry.test.ts
```

- [ ] Commit:

```bash
git add src/studio/server.ts src/studio/types.ts studio/src/types.ts studio/src/stores/studio.ts studio/src/views/WorkbenchView.vue studio/src/views/RegistryView.vue studio/src/styles.css src/studio/server.test.ts src/studio/metadata.test.ts
git commit -m "feat: add studio command documentation panels"
```

## Task 3: Expand High-Value Recipe Coverage Without Losing Generic Inheritance

**Files:**

- Modify: `src/studio/recipes.ts`
- Modify: `studio/src/views/InsightsView.vue`
- Modify: `studio/src/views/OverviewView.vue`
- Modify: `studio/src/lib/results.ts`
- Modify: `studio/src/lib/chart-layout.ts`
- Test: `src/studio/server.test.ts`
- Test: add `studio/src/lib/results.test.ts` if missing

- [ ] Add recipe-level tests covering at least one new cross-platform recipe and one platform-specific recipe.
- [ ] Run `npx vitest run src/studio/server.test.ts --project unit` and confirm failures point at missing recipe ids or payloads.
- [ ] Extend `src/studio/recipes.ts` with the next safest/highest-value recipe cluster, prioritizing read-only and trend-oriented flows such as:
  - cross-platform hot topic comparison
  - bilibili vs douyin topical ranking comparison
  - xueqiu / public market pulse comparison
- [ ] Keep recipe additions metadata-driven: id, title, description, tags, command, default args.
- [ ] Update `studio/src/views/InsightsView.vue` so larger recipe catalogs remain legible via better grouping or filtering.
- [ ] Update `studio/src/views/OverviewView.vue` to surface the newly added high-value recipes.
- [ ] If new result shapes need it, extend `studio/src/lib/results.ts` and `studio/src/lib/chart-layout.ts` minimally without reintroducing heavy chart dependencies.
- [ ] Run:

```bash
npx vitest run src/studio/server.test.ts --project unit
npm run studio:test
npm run studio:build
```

- [ ] Commit:

```bash
git add src/studio/recipes.ts studio/src/views/InsightsView.vue studio/src/views/OverviewView.vue studio/src/lib/results.ts studio/src/lib/chart-layout.ts src/studio/server.test.ts
git commit -m "feat: expand studio recipe coverage"
```

## Task 4: Deepen Snapshot and Compare UX

**Files:**

- Modify: `studio/src/views/WorkbenchView.vue`
- Modify: `studio/src/views/InsightsView.vue`
- Modify: `studio/src/lib/compare.ts`
- Modify: `studio/src/lib/export.ts`
- Modify: `studio/src/components/ResultPanel.vue`
- Test: add `studio/src/lib/compare.test.ts` and `studio/src/lib/export.test.ts` if needed

- [ ] Add targeted tests for comparison summaries and export artifacts so UX changes are grounded in stable outputs.
- [ ] Run the new targeted tests first and confirm they fail before implementation.
- [ ] Improve compare output so it highlights:
  - added vs removed rows
  - changed scalar fields
  - obvious directional changes for numeric series
- [ ] Expose those summaries more directly in `ResultPanel` rather than forcing users to infer them from raw JSON.
- [ ] Keep exports aligned with the improved compare model.
- [ ] Run:

```bash
npm run studio:test
npm run studio:typecheck
```

- [ ] Commit:

```bash
git add studio/src/views/WorkbenchView.vue studio/src/views/InsightsView.vue studio/src/lib/compare.ts studio/src/lib/export.ts studio/src/components/ResultPanel.vue
git commit -m "feat: improve studio compare summaries"
```

## Task 5: Final Handoff Discipline For Any Next Session

**Files:**

- Modify: `docs/developer/studio.md`
- Modify: `docs/superpowers/plans/opencli-studio/2026-04-14-opencli-studio-next-phase-handoff.md`

- [ ] Update this handoff plan when any milestone lands or priorities change.
- [ ] Keep `docs/developer/studio.md` pointing at the latest handoff plan so a future agent can resume with minimal exploration.
- [ ] Before ending any future session, run:

```bash
git status --short
git log --oneline -6
```

- [ ] Then run the narrowest verification commands that prove the latest claim, commit, and push:

```bash
git push origin feature/opencli-studio
```

## Execution Notes For The Next Agent

- Start by reading:
  - `docs/developer/studio.md`
  - `docs/superpowers/plans/opencli-studio/2026-04-14-opencli-studio-next-phase-handoff.md`
- Then inspect the last few commits:

```bash
git log --oneline -8
```

- Do not spend time rediscovering the Studio architecture from scratch unless the verification baseline has regressed.
