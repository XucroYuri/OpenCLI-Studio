<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# src/scripts

## Purpose
CLI-internal runtime scripts invoked during command execution. These are NOT build scripts (those are in `/scripts/`). They provide runtime capabilities: opening browsers for automation, running scheduled tasks, managing recipes, and serving the Studio API. Invoked by the CLI core (`src/cli.ts`) during command processing.

## Key Files
| File | Description |
|------|-------------|
| `server.ts` | Studio API server runtime (started by `opencli studio serve`) |
| `open-browser.ts` | Opens and connects to a browser for automation sessions |
| `scheduler.ts` | Task scheduler for recurring and deferred operations |
| `recipes.ts` | Recipe execution runtime -- runs saved command presets |
| `ops.ts` | Operational utilities for runtime diagnostics |
| `metadata.ts` | Adapter metadata runtime access |
| `store.ts` | Runtime key-value store for CLI state |
| `site-access.ts` | Runtime site access verification |
| `site-taxonomy.ts` | Runtime site categorization |
| `types.ts` | TypeScript types shared across runtime scripts |
| `command.ts` | Runtime command dispatch |

## For AI Agents

### Working In This Directory
- These are runtime modules, not build tooling. They execute during `opencli` command processing.
- `server.ts` is the entry point for `opencli studio serve --port 3113`.
- Changes here affect the Studio backend runtime behavior.
- Test files follow `*.test.ts` naming alongside source files.

### Testing Requirements
- Tests in `*.test.ts` files alongside each module
- `npm run studio:verify` includes tests for these files

### Common Patterns
- Functions take typed parameters and return promises
- Error handling follows project exit code conventions
- Server uses Node.js built-in HTTP module

## Dependencies

### Internal
- `src/cli.ts` -- invokes these scripts
- `src/daemon.ts` -- daemon interaction for browser scripts

<!-- MANUAL: -->
