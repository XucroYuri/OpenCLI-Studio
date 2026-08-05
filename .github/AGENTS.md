<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# .github

## Purpose
GitHub Actions workflows, custom actions, and issue templates for the OpenCLI Studio project. Handles continuous integration, extension builds, documentation checks, E2E testing, security scanning, and release automation.

## Key Files
| File | Description |
|------|-------------|
| `workflows/build-extension.yml` | Build and package the Chrome Browser Bridge extension |
| `workflows/ci.yml` | Main CI pipeline -- lint, typecheck, unit tests, build |
| `workflows/doc-check.yml` | Documentation coverage and link validation |
| `workflows/docs.yml` | Build and deploy Vitepress documentation site |
| `workflows/e2e-headed.yml` | Headed E2E tests with browser (Chrome) |
| `workflows/release.yml` | Release automation -- versioning, changelog, npm publish |
| `workflows/security.yml` | Security scanning -- dependency audit, SAST, secret detection |
| `actions/setup-chrome/` | Custom GitHub Action for installing and configuring Chrome for testing |
| `ISSUE_TEMPLATE/` | Issue templates for bug reports and feature requests |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `workflows/` | GitHub Actions workflow definitions (7 workflows) |
| `actions/` | Custom composite/reusable GitHub Actions (`setup-chrome`) |
| `ISSUE_TEMPLATE/` | GitHub issue templates |

## For AI Agents

### Working In This Directory
- **Workflow Triggers**: Each YAML file defines `on:` triggers -- push, pull_request, schedule, workflow_dispatch.
- **CI Pipeline Order**: lint -> typecheck -> unit tests -> build -> (E2E tests in parallel) -> (security scan in parallel).
- **Chrome Setup**: `actions/setup-chrome/` is a custom action used by workflows that need a browser (E2E, extension build).
- **Release**: `release.yml` handles semantic versioning, changelog generation, and npm publishing.
- **Security**: `security.yml` runs dependency audits, CodeQL analysis, and secret scanning.

### Testing Requirements
- Workflows are validated by GitHub Actions on push.
- Test workflow changes in a branch before merging to main.
- Custom actions can be tested locally with `act` (GitHub Actions simulator).

### Common Patterns
- Workflows use consistent naming: lowercase with hyphens, descriptive job names.
- All workflows should have a `concurrency` group to prevent redundant runs.
- Use `actions/checkout@v4` with appropriate fetch-depth for changelog generation.
- Matrix builds: use `strategy.matrix` for Node/Bun version testing.
- Secrets: use `${{ secrets.* }}` for tokens and credentials, never hardcode.
- Cache: use `actions/cache@v4` or `actions/setup-node` caching for `node_modules`.
- New workflows should be added to branch protection rules if they gate merges.

## Dependencies

### External
- GitHub Actions platform
- Repository secrets: NPM_TOKEN, CHROME_WEB_STORE_*, deployment tokens
- External actions: `actions/checkout`, `actions/setup-node`, `actions/cache`, `github/codeql-action`

<!-- MANUAL: -->
