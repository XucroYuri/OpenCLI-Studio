<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# src

## Purpose
Core TypeScript source for the OpenCLI CLI engine. Contains the CLI entrypoint, command registration, browser automation via Chrome DevTools Protocol, the daemon/extension bridge, adapter discovery and generation pipelines, media/article download support, Studio backend API, and all shared utilities and types. This is the heart of the automation runtime -- everything that makes `opencli <site> <command>` work.

## Key Files
| File | Description |
|------|-------------|
| `main.ts` | CLI entrypoint -- bootstraps Commander.js, registers all commands and adapters |
| `cli.ts` | Central CLI orchestration (53KB) -- command registration, argument parsing, output formatting |
| `daemon.ts` | HTTP daemon (port 19825) that bridges CLI with the Chrome Browser Bridge extension |
| `discovery.ts` | Auto-discovers installed CLI adapters from `clis/` directory and plugins |
| `build-manifest.ts` | Generates `cli-manifest.json` -- catalog of all adapters and their commands |
| `commanderAdapter.ts` | Adapter layer that maps CLI adapter definitions to Commander.js commands |
| `cascade.ts` | Auth strategy cascade: probes PUBLIC -> COOKIE -> HEADER fallback paths |
| `analysis.ts` | Analyzes browser pages for automation capabilities and API discovery |
| `capabilityRouting.ts` | Routes discovered capabilities to appropriate execution strategies |
| `completion.ts` | Shell completion support for opencli commands |
| `completion-fast.ts` | Optimized fast-path completion for common commands |
| `completion-shared.ts` | Shared completion utilities |
| `constants.ts` | Project-wide constants and configuration defaults |
| `diagnostic.ts` | Structured diagnostic context capture on failures (OPENCLI_DIAGNOSTIC mode) |
| `doctor.ts` | System health checks -- verifies Node version, Chrome availability, daemon status |
| `electron-apps.ts` | Electron desktop app adapter framework -- CDP-backed control of Cursor, Codex, Notion, etc. |
| `errors.ts` | Custom error classes with exit codes following sysexits.h conventions |
| `types.ts` | Core TypeScript type definitions for the entire project |
| `logger.ts` | Logging utility with verbosity levels |
| `launcher.ts` | Process launcher for the CLI daemon and subprocess management |
| `utils.ts` | Shared utility functions |
| `registry-api.ts` | API for querying and managing the adapter registry programmatically |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `browser/` | Chrome DevTools Protocol integration -- page control, DOM snapshots, stealth, target resolution, bridge client (see `browser/AGENTS.md`) |
| `commands/` | Daemon-related CLI commands (`daemon.ts`) |
| `download/` | Media and article download pipeline -- supports images, videos, audio, articles |
| `pipeline/` | Command execution pipeline with step-based architecture (explore, synthesize, generate, cascade) (see `pipeline/AGENTS.md`) |
| `scripts/` | CLI-internal scripts for browser opening and dev tooling |
| `studio/` | Studio backend glue -- API server, readiness checks, workbench orchestration, store management (see `studio/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- All files are TypeScript, compiled with `tsc` to `dist/`. Run `npm run build` after changes.
- The `cli.ts` file is the largest and most critical -- it orchestrates all command registration. Be careful with changes here.
- Error handling uses custom exit codes (0=success, 2=usage, 66=empty, 69=unavailable, 75=tempfail, 77=auth, 78=config, 130=interrupt).
- When adding a new adapter, update both the adapter in `clis/` and ensure `discovery.ts` and `build-manifest.ts` handle it correctly.
- The daemon model: CLI communicates with a local HTTP daemon, which relays to the Chrome extension via WebSocket. Port defaults to 19825.

### Testing Requirements
- Test files live alongside source files (`*.test.ts` convention).
- `npm test` runs all unit tests for this directory.
- Run `npm run typecheck` to validate TypeScript before committing.

### Common Patterns
- Barrel exports via `index.ts` in subdirectories
- Vitest for testing with `*.test.ts` naming
- Commander.js command pattern: define command schema, register with `cli.ts`
- CDP operations are async, using `undici` for HTTP and `ws` for WebSocket

## Dependencies

### Internal
- `clis/` -- site adapter definitions consumed by discovery
- `extension/` -- Chrome extension that the daemon communicates with

### External
- `commander` -- CLI framework
- `undici` -- HTTP client for CDP and API calls
- `ws` -- WebSocket for daemon-extension communication
- `js-yaml` -- YAML parsing for adapter configs
- `cli-table3` -- Terminal table output
- `turndown` -- HTML to Markdown conversion

<!-- MANUAL: -->
