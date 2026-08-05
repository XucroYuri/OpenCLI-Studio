<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# docs

## Purpose
Vitepress-powered documentation site for OpenCLI Studio. Covers getting started, browser/desktop adapter guides, advanced CDP usage, developer contribution docs, architecture documentation, and full Chinese (zh-CN) translations of all content sections.

## Key Files
| File | Description |
|------|-------------|
| `.vitepress/` | Vitepress configuration, theme, sidebar, and nav definitions |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `.vitepress/` | Vitepress config, theme customization, sidebar/nav |
| `guide/` | User-facing guides (6 pages) |
| `developer/` | Developer documentation (7 pages) |
| `advanced/` | Advanced usage documentation (6 pages) |
| `adapters/` | Adapter-specific docs (browser/ and desktop/ subdirs) |
| `zh/` | Full Chinese translations mirroring the en structure |
| `superpowers/` | Plans and specs for feature development |
| `adapters-doc/` | Cross-adapter documentation |

### guide/ Files
| File | Description |
|------|-------------|
| `browser-bridge.md` | Guide for using the Chrome Browser Bridge extension |
| `electron-app-cli.md` | Guide for Electron app CLI adapter |
| `getting-started.md` | Getting started tutorial |
| `installation.md` | Installation instructions for OpenCLI |
| `plugins.md` | Plugin system documentation |
| `troubleshooting.md` | Common issues and troubleshooting steps |

### developer/ Files
| File | Description |
|------|-------------|
| `ai-workflow.md` | AI agent workflow documentation for developers |
| `architecture.md` | System architecture overview |
| `contributing.md` | Contribution guidelines and workflow |
| `studio.md` | Studio-specific developer docs |
| `testing.md` | Testing guide for developers |
| `ts-adapter.md` | TypeScript adapter development guide |
| `yaml-adapter.md` | YAML adapter development guide |

### advanced/ Files
| File | Description |
|------|-------------|
| `android-chrome.md` | Android Chrome remote debugging setup |
| `cdp.md` | Chrome DevTools Protocol deep dive |
| `download.md` | Download pipeline documentation |
| `electron.md` | Electron app integration details |
| `rate-limiter-plugin.md` | Rate limiter plugin documentation |
| `remote-chrome.md` | Remote Chrome connection setup |

## For AI Agents

### Working In This Directory
- **Framework**: Vitepress (Vue-powered static site generator).
- **Config**: `.vitepress/` directory contains `config.ts` with sidebar, nav, and theme settings.
- **Content**: Markdown files, use Vitepress-specific extensions (::: tip, ::: warning, ::: info containers).
- **i18n**: Chinese translations in `zh/` directory mirror the English structure exactly -- every page in `guide/`, `developer/`, `advanced/`, and `adapters/` has a corresponding `zh/` version.
- **Links**: Internal links use relative paths; cross-language links use explicit paths.

### Testing Requirements
- Dev server: `npm run docs:dev` (hot-reload).
- Build check: `npm run docs:build` (catches broken links and config errors).
- Preview build: `npm run docs:preview`.
- Doc coverage: `npm run check-doc-coverage` (runs `scripts/check-doc-coverage.sh`).

### Common Patterns
- New docs pages must be added to the Vitepress sidebar config in `.vitepress/`.
- Documentation follows: guide (user-facing) -> developer (contributor-facing) -> advanced (power users).
- Chinese translations must mirror the English page structure and be kept in sync.
- Adapter docs go in `adapters/browser/` or `adapters/desktop/` based on target platform.

## Dependencies

### Internal
- `scripts/check-doc-coverage.sh` -- doc coverage checker
- `.github/workflows/docs.yml` -- CI deployment

### External
- Vitepress, Vue 3

<!-- MANUAL: -->
