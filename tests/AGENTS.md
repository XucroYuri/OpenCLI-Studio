<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# tests

## Purpose
End-to-end and smoke test suites for OpenCLI. E2E tests verify complete workflows from CLI invocation through adapter execution to output. Smoke tests quickly validate that the core system is operational after changes.

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `e2e/` | End-to-end tests -- full CLI workflows with browser interaction |
| `smoke/` | Smoke tests -- quick validation that core systems work |

## For AI Agents

### Working In This Directory
- E2E tests may require a running Chrome instance and the Browser Bridge extension loaded.
- Run with `npm run test:e2e` for end-to-end tests.
- Run with `npm run test:all` to include all test suites.
- Smoke tests are designed to be fast -- they should complete in seconds, not minutes.

### Testing Requirements
- Tests use Vitest with the e2e project configuration.
- CI runs e2e tests in headed mode via `.github/workflows/e2e-headed.yml`.

### Common Patterns
- E2E tests use real CLI invocations via `child_process.exec` or `execa`
- Each test should set up its own state and clean up after itself
- Use timeouts appropriate for browser interaction (browser commands can take seconds)

## Dependencies

### Internal
- `src/` -- the CLI engine being tested
- `extension/` -- Browser Bridge needed for browser-backed tests
- `.github/workflows/e2e-headed.yml` -- CI configuration

### External
- Vitest 4 -- test framework
- Chrome/Chromium -- browser for browser-backed tests

<!-- MANUAL: -->
