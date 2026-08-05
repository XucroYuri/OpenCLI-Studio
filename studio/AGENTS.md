<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# studio

## Purpose
Vue 3 single-page application providing the OpenCLI Studio web workspace. Offers six views: Overview (creator-oriented bundles), Registry (category-driven adapter browsing), Workbench (command execution and result review), Templates, Checks (readiness/diagnostic guidance), and About. Supports Chinese/English i18n with browser-language auto-detection, information-first result rendering with table-priority output, and a compact product-oriented layout tuned for repeated use.

## Key Files
| File | Description |
|------|-------------|
| `index.html` | SPA entry point |
| `vite.config.ts` | Vite 8 build config -- dev server on 127.0.0.1:4173 |
| `tsconfig.json` | TypeScript config for Vue SFC compilation (vue-tsc) |
| `vitest.config.ts` | Vitest config for Studio-specific tests |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | Vue application source (see below) |

### src/components/
| File | Description |
|------|-------------|
| `ChartPanel.vue` | Chart visualization panel for workbench results |
| `CommandReadinessBanner.vue` | Readiness status banner (login, deps, setup prompts) |
| `PresetShelf.vue` | Saved preset command shelf for quick reuse |
| `ResultPanel.vue` | Command result display panel |
| `SavePresetButton.vue` | Save current command as a preset |

### src/layouts/
| File | Description |
|------|-------------|
| `StudioLayout.vue` | Root layout with navigation, sidebar, and content area |

### src/views/
| File | Description |
|------|-------------|
| `HeroView.vue` | Landing/hero page |
| `InsightsView.vue` | Analytics and insights dashboard |
| `OpsView.vue` | Operations and management view |
| `OverviewView.vue` | Creator-focused overview bundles and helpers |
| `RegistryView.vue` | Category-driven adapter registry browser |
| `WorkbenchView.vue` | Command execution workbench with argument input and results |

### src/stores/
| File | Description |
|------|-------------|
| `studio.ts` | Main Pinia store for Studio application state |
| `studio.test.ts` | Store tests |

### src/lib/
| File | Description |
|------|-------------|
| `api.ts` | Backend API client (communicates with Studio server on port 3113) |
| `chart-layout.ts` | Chart layout configuration and defaults |
| `compare.ts` | Command result comparison utilities |
| `dashboard.ts` | Dashboard data aggregation |
| `display.ts` | Display formatting and rendering utilities |
| `export.ts` | Export results (CSV, JSON, etc.) |
| `i18n.ts` | Internationalization -- zh-CN and en, browser-language auto-detect |
| `ops.ts` | Operations/health check utilities |
| `overview-combos.ts` | Overview combo/bundle definitions |
| `preset-state.ts` | Preset save/load state management |
| `readiness.ts` | Readiness guidance -- login state, dependency checks, setup prompts |
| `registry.ts` | Registry data access and filtering |
| `results.ts` | Result parsing and transformation |
| `routes.ts` | Vue Router route definitions |
| `status-tone.ts` | Status color/icon mapping (success, warning, error, info) |
| `timeline.ts` | Timeline data handling |
| `workbench-args.ts` | Workbench argument parsing and validation |

## For AI Agents

### Working In This Directory
- This is a Vue 3 SPA using Composition API with `<script setup lang="ts">`.
- Naive UI is the component library -- use its components for consistency.
- Pinia store in `src/stores/studio.ts` is the central state. All views read/write through it.
- The backend API is at `http://127.0.0.1:3113` (see `src/lib/api.ts`).
- i18n keys are defined in `src/lib/i18n.ts` -- add new keys there for new UI strings.
- Run `npm run studio:dev` for frontend-only dev, or `npm run studio:dev:all` for full stack.

### Testing Requirements
- `npm run studio:test` -- Studio-specific tests via Vitest
- `npm run studio:typecheck` -- vue-tsc type checking
- Store tests in `src/stores/studio.test.ts`, lib tests alongside source (`*.test.ts`)

### Common Patterns
- Views are route-level components, components are reusable widgets
- Use `defineAsyncComponent` for lazy-loaded views
- Pinia store uses `defineStore` with composition API style
- All text visible to users must go through i18n

## Dependencies

### Internal
- `src/studio/` (backend) -- Studio API server on port 3113

### External
- Vue 3.5, Vue Router 4.6, Pinia 3.0 -- framework
- Naive UI 2.44 -- component library
- Vite 8 -- build tool
- vue-tsc 2.2 -- type checking

<!-- MANUAL: -->
