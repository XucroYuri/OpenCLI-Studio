<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# src/commands

## Purpose
Daemon-related CLI commands registered with the `opencli` CLI. These are the built-in commands for managing the OpenCLI daemon lifecycle -- starting, stopping, checking status, and viewing logs.

## Key Files
| File | Description |
|------|-------------|
| `daemon.ts` | Daemon management commands: `opencli daemon start`, `opencli daemon stop`, `opencli daemon status`, `opencli daemon logs` |
| `daemon.test.ts` | Tests for daemon commands |

## For AI Agents

### Working In This Directory
- Daemon commands interact with the HTTP daemon defined in `src/daemon.ts` (port 19825).
- Commands are registered in `src/cli.ts` using Commander.js.
- The daemon is the bridge between CLI and browser -- if it's not running, browser-backed adapters won't work.

### Testing Requirements
- Tests verify daemon lifecycle: start, status, stop sequences
- Tests mock HTTP calls to the daemon rather than requiring a real Chrome instance

### Common Patterns
- Commander.js command pattern: define subcommands with options and action handlers
- Commands use the project's exit code conventions

## Dependencies

### Internal
- `src/daemon.ts` -- the daemon service itself
- `src/cli.ts` -- command registration

### External
- Node.js built-in modules (child_process, http)

<!-- MANUAL: -->
