<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# src/studio

## Purpose
Studio backend glue -- the API server that the Vue 3 frontend communicates with. Provides readiness checks (login state, dependencies, site access), workbench command execution orchestration, metadata management, recipe scheduling, and site taxonomy. Runs on port 3113 when started via `npm run studio:backend` or `npm run studio:dev:all`.

## Key Files
| File | Description |
|------|-------------|
| `server.ts` | HTTP API server -- Express-style routing for Studio frontend |
| `store.ts` | Server-side state store -- presets, results, configuration |
| `readiness.ts` | Readiness checks -- verifies browser connection, login state, dependency availability |
| `ops.ts` | Operations utilities -- health checks, diagnostics |
| `metadata.ts` | Adapter metadata management and serving |
| `site-access.ts` | Site access checks -- verifies target sites are reachable and authenticated |
| `site-taxonomy.ts` | Site categorization and taxonomy for registry browsing |
| `recipes.ts` | Recipe/preset management for reusable command patterns |
| `scheduler.ts` | Task scheduler for background operations and periodic checks |
| `open-browser.ts` | Browser launch and connection management from Studio context |
| `types.ts` | TypeScript type definitions for Studio backend |
| `command.ts` | Command execution orchestration from Studio workbench |

## For AI Agents

### Working In This Directory
- The Studio backend is a lightweight HTTP server, not a full Express app. Keep it simple.
- API routes are registered in `server.ts`. New endpoints should follow the existing pattern.
- Readiness checks in `readiness.ts` gate the workbench -- commands won't execute if checks fail.
- The store in `store.ts` is in-memory by default. Consider persistence needs carefully.
- All files export TypeScript functions consumed by `server.ts`.

### Testing Requirements
- Test files follow `*.test.ts` naming alongside source files.
- `npm run studio:verify` runs Studio-specific tests.
- Server tests should mock HTTP requests rather than starting a real server where possible.

### Common Patterns
- API handlers: `(req, res) => { ... }` pattern with JSON responses
- Readiness checks return structured results with status, message, and suggested actions
- Error responses follow the project's exit code conventions (77=auth, 78=config, 69=unavailable)

## Dependencies

### Internal
- `src/daemon.ts` -- daemon status checks for readiness
- `src/discovery.ts` -- adapter discovery for metadata
- `src/browser/` -- CDP integration for browser checks
- `studio/` (frontend) -- consumes this API

### External
- Node.js HTTP module (built-in)
- `ws` -- WebSocket for daemon communication

<!-- MANUAL: -->
