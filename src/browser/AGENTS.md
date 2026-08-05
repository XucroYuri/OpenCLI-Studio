<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# src/browser

## Purpose
Chrome DevTools Protocol (CDP) integration layer. Provides low-level browser control -- page navigation, DOM manipulation, network interception, CDP connection management, target resolution, stealth mode, and the daemon-client bridge. All browser-backed `opencli` commands ultimately flow through this directory.

## Key Files
| File | Description |
|------|-------------|
| `index.ts` | Barrel export for all browser module exports |
| `cdp.ts` | Core CDP connection management -- connect to Chrome/Chromium, send commands, manage sessions |
| `page.ts` | High-level page operations: navigate, wait for selectors, click, type, scroll, extract content |
| `base-page.ts` | Base page class with shared page lifecycle and error handling |
| `bridge.ts` | Communication bridge between CLI daemon and Browser Bridge Chrome extension |
| `daemon-client.ts` | HTTP client for communicating with the local OpenCLI daemon |
| `dom-snapshot.ts` | Captures structured DOM snapshots for analysis and content extraction |
| `dom-helpers.ts` | DOM query and manipulation helper utilities |
| `stealth.ts` | Anti-detection measures for browser automation |
| `tabs.ts` | Chrome tab management -- list, create, close, focus tabs |
| `target-resolver.ts` | Resolves CDP targets (pages, workers, iframes) by URL or type |
| `target-errors.ts` | Structured error types for CDP target resolution failures |
| `errors.ts` | Browser-specific error types and handling |
| `utils.ts` | Shared browser utility functions |

## For AI Agents

### Working In This Directory
- All CDP operations are async. Respect Chrome's connection lifecycle.
- The `page.ts` module is the primary API for adapter authors -- it wraps raw CDP into ergonomic page operations.
- Stealth mode (`stealth.ts`) is critical for sites with bot detection. Don't weaken it without careful testing.
- DOM snapshots use a specific format understood by the analysis pipeline -- maintain backward compatibility.
- CDP connection uses `OPENCLI_CDP_ENDPOINT` env var for remote browsers (useful for Docker/remote Chrome).

### Testing Requirements
- Test files follow `*.test.ts` naming convention alongside source files.
- Browser tests may require a running Chrome instance -- check CI workflow (`.github/workflows/ci.yml`) for headed/headless setup.

### Common Patterns
- CDP commands use protocol methods (e.g., `Page.navigate`, `Runtime.evaluate`)
- Page operations return typed results with error discrimination
- DOM snapshots are structured JSON, consumed by `analysis.ts` and adapter generation pipelines

## Dependencies

### Internal
- `src/daemon.ts` -- the daemon that this module's bridge client talks to
- `src/analysis.ts` -- consumes DOM snapshots for capability analysis

### External
- `undici` -- HTTP client for CDP REST endpoints
- `ws` -- WebSocket for CDP bidirectional communication
- Chrome/Chromium -- CDP endpoint (local or remote)

<!-- MANUAL: -->
