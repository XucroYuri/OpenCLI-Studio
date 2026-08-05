<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# OpenCLI Studio

## Purpose
A Studio-first fork of [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI) that adds a Vue 3 web workspace for browsing, selecting, running, and reviewing AI-powered CLI automation commands. Turns any website or Electron app into a CLI -- 96+ built-in adapters cover Chinese and global platforms. The Studio layer adds i18n (zh-CN/en), creator-oriented rankings, category-driven registry browsing, readiness guidance, and workbench execution. Package name is `@jackwener/opencli` (v1.7.4), CLI command is `opencli`.

## Key Files
| File | Description |
|------|-------------|
| `package.json` | npm package manifest (`@jackwener/opencli` v1.7.4), Node >= 21, ESM, scripts, dependencies |
| `tsconfig.json` | TypeScript config: ES2022 target, Node16 module, strict mode, outputs to `dist/` |
| `vitest.config.ts` | Vitest config with projects: unit, extension, adapter, e2e |
| `bun.lock` | Bun lockfile (Bun >= 1.0 also supported as runtime) |
| `cli-manifest.json` | Auto-generated manifest of all 96+ CLI adapters and their commands |
| `CHANGELOG.md` | Release history and changelog |
| `LICENSE` | Apache 2.0 |
| `CONTRIBUTING.md` | Contribution guide |
| `PRIVACY.md` | Privacy policy |
| `TESTING.md` | Testing guide |
| `README.md` | English README |
| `README.zh-CN.md` | Chinese README |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | Core TypeScript source -- CLI engine, daemon, browser, pipeline, Studio backend (see `src/AGENTS.md`) |
| `studio/` | Vue 3 Studio frontend SPA (see `studio/AGENTS.md`) |
| `extension/` | Chrome Browser Bridge extension (see `extension/AGENTS.md`) |
| `clis/` | 96 CLI site adapters (see `clis/AGENTS.md`) |
| `docs/` | Vitepress documentation site (see `docs/AGENTS.md`) |
| `skills/` | Agent skills for OpenCLI workflow (see `skills/AGENTS.md`) |
| `scripts/` | Build, postinstall, and dev orchestration scripts |
| `tests/` | E2E and smoke test suites |
| `designs/` | Design assets |
| `autoresearch/` | Auto-research output artifacts |
| `.github/` | CI workflows, issue templates, custom actions |

## For AI Agents

### Working In This Directory
- This is a **fork** of `jackwener/OpenCLI`. Keep Studio-specific logic isolated from upstream core where possible.
- The package name is `@jackwener/opencli` (kept for upstream compatibility), CLI command is `opencli`.
- Sync strategy: 1) sync upstream `main` regularly, 2) rebase Studio module, 3) keep fork-specific UX/localization/ranking isolated.
- Use `npm install` (or `bun install`) after modifying `package.json`.
- The project uses ESM (`"type": "module"`).

### Testing Requirements
- `npm test` -- unit + extension + adapter tests via Vitest
- `npm run test:e2e` -- end-to-end tests
- `npm run studio:test` -- Studio frontend tests
- `npm run typecheck` -- TypeScript type checking
- `npm run studio:verify` -- full verification (typecheck + tests)

### Common Patterns
- All TypeScript source in `src/`, compiled output in `dist/`
- Adapters in `clis/<site>/` follow a consistent pattern per site
- Studio is a Vue 3 + Vite SPA, built separately then served
- The CLI core uses Commander.js for argument parsing
- Browser automation uses Chrome DevTools Protocol via a daemon-extension bridge

## Dependencies

### Runtime
- Node.js >= 21.0.0 (or Bun >= 1.0)
- Chrome/Chromium for browser-backed commands

### External (key)
- `commander` ^14.0.3 -- CLI framework
- `cli-table3` ^0.6.5 -- terminal tables
- `js-yaml` ^4.1.0 -- YAML
- `turndown` ^7.2.2 -- HTML-to-Markdown
- `undici` ^8.0.2 -- HTTP client
- `ws` ^8.18.0 -- WebSocket
- Vue 3, Vue Router, Pinia, Naive UI -- Studio frontend
- Vite 8, TypeScript 6, Vitest 4 -- build/dev tooling

<!-- MANUAL: -->
