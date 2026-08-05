<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# scripts

## Purpose
Build, postinstall, and dev orchestration scripts for the OpenCLI project. These scripts handle cleaning build artifacts, copying assets, fetching adapter metadata, running the Studio dev stack, and syncing upstream releases. They are invoked by npm lifecycle hooks and package.json scripts.

## Key Files
| File | Description |
|------|-------------|
| `clean-dist.cjs` | Removes the `dist/` output directory before build |
| `copy-yaml.cjs` | Copies YAML adapter config files from `clis/` into `dist/` during build |
| `fetch-adapters.js` | Fetches adapter metadata (run during `postinstall`) |
| `postinstall.js` | Post-install setup hook -- initializes configuration, fetches adapters |
| `prepare.cjs` | npm prepare lifecycle hook |
| `studio-dev-all.cjs` | Launches the full Studio dev stack (backend on 3113 + frontend on 4173) |
| `sync-upstream-releases.cjs` | Syncs release assets from upstream `jackwener/OpenCLI` to the fork's release page |
| `check-doc-coverage.sh` | Documentation coverage checker |

## For AI Agents

### Working In This Directory
- Scripts are CommonJS (`.cjs`) or ES modules (`.js`, `.mjs`). Check the extension.
- `studio-dev-all.cjs` orchestrates the Studio development environment -- both the backend API server and frontend Vite dev server.
- `sync-upstream-releases.cjs` is fork-specific -- it pulls release assets from the upstream repo.
- Build scripts are invoked by npm scripts in package.json -- don't call them directly unless you know the context.

### Testing Requirements
- Scripts should be tested by running the npm scripts that invoke them (e.g., `npm run build`, `npm run postinstall`).
- No dedicated test files for scripts -- they are validated through the CI pipeline.

### Common Patterns
- Scripts use Node.js built-in modules (fs, path, child_process)
- Error handling with process.exit(1) on failure
- Some scripts use `fetch` (Node 21+) for HTTP requests

## Dependencies

### Internal
- `package.json` scripts section -- invokes these scripts
- `clis/` -- adapter files copied by copy-yaml.cjs

### External
- Node.js >= 21 (uses `fetch`, `fs`, `path`, `child_process`)

<!-- MANUAL: -->
