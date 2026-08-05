<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# extension

## Purpose
Chrome Browser Bridge extension (Manifest V3). Acts as the intermediary between the OpenCLI CLI daemon and Chrome/Chromium. The CLI sends commands to the local HTTP daemon (port 19825), which relays them via WebSocket to this extension, which then executes CDP operations in the browser. This architecture allows `opencli` commands to reuse the user's existing Chrome login sessions without requiring separate authentication.

## Key Files
| File | Description |
|------|-------------|
| `manifest.json` | Chrome extension manifest (Manifest V3) with required permissions |
| `package.json` | Extension package config (`opencli-extension` v1.0.0, compat >= 1.7.0) |
| `popup.html` | Extension popup UI (shown when clicking extension icon) |
| `popup.js` | Extension popup logic |
| `tsconfig.json` | TypeScript config for extension source |
| `vite.config.ts` | Vite 6 build config for the extension |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | Extension source code |
| `scripts/` | Extension build/release scripts |
| `icons/` | Extension icon assets |
| `store-assets/` | Chrome Web Store listing assets |
| `dist/` | Built extension output (load unpacked from here) |

### src/ Files
| File | Description |
|------|-------------|
| `background.ts` | Service worker -- handles daemon WebSocket connection and CDP relay |
| `cdp.ts` | Chrome DevTools Protocol API calls from within the extension context |
| `identity.ts` | Extension identity and messaging helpers |
| `protocol.ts` | Message protocol definition for daemon-extension communication |

### scripts/ Files
| File | Description |
|------|-------------|
| `package-release.mjs` | Packages the extension for Chrome Web Store release |

## For AI Agents

### Working In This Directory
- This is a Manifest V3 Chrome extension. The service worker (`src/background.ts`) is the core runtime.
- The extension communicates with the daemon via WebSocket. The protocol is defined in `src/protocol.ts`.
- CDP operations execute in the extension context with `chrome.debugger` API.
- Build with `npm run build` (from extension directory) or `vite build`.
- To load for development: open `chrome://extensions`, enable Developer mode, click "Load unpacked", select the `dist/` directory.

### Testing Requirements
- Extension tests run as part of the main project: `npm test -- --project extension`
- Manual testing: load unpacked in Chrome, run `opencli doctor` to verify connectivity.

### Common Patterns
- Service worker handles all daemon messages via a message router pattern
- CDP commands are async and return structured results
- Extension uses `chrome.storage` for persistent state

## Dependencies

### Internal
- `src/daemon.ts` -- the daemon that this extension connects to

### External
- `@types/chrome` ^0.0.287 -- Chrome extension API types
- Chrome/Chromium browser -- runtime environment
- Vite 6 -- build tool

<!-- MANUAL: -->
