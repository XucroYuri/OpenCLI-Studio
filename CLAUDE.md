# OpenCLI Studio — AI Agent Onboarding Instructions

## Project Identity
- **Name**: OpenCLI Studio
- **Type**: Fork of [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI) — upstream syncs to this repo's `main` branch
- **Package**: `@jackwener/opencli` v1.7.4 (upstream v1.8.6 @ 399c0de — sync needed)
- **Stack**: TypeScript + Vue 3 + Chrome DevTools Protocol + 96 site adapters
- **Remote**: `origin` = XucroYuri/OpenCLI-Studio (fork), `upstream` = jackwener/OpenCLI (v1.8.6)

## Quick Reference (after initial setup)

```bash
npm install --ignore-scripts    # Install without postinstall side effects
npm run build                   # tsc + copy-yaml + build-manifest + studio:build
npm run typecheck               # TypeScript validation
npx vitest run                  # Run tests
node dist/src/main.js list      # Verify CLI works
npm run studio:dev:all          # Start full Studio dev stack (backend 3113 + frontend 4173)
```

## Onboarding Workflow (for new AI agents)

When you first open this project, follow these 6 phases:

### Phase 1: Deep Exploration
1. Read `package.json`, `tsconfig.json`, `README.md`, `README.zh-CN.md`
2. Check `git remote -v` and `git log -1 --format=%ci`
3. List top-level directory: `ls -la`
4. One-sentence summary: "A Studio-first fork of OpenCLI that adds a Vue 3 web workspace for browsing, selecting, running, and reviewing 96+ AI-powered CLI automation commands"

### Phase 2: AGENTS.md (if missing or stale)
- 19 AGENTS.md files should already exist covering all meaningful directories
- If missing, run `/oh-my-claudecode:deepinit`
- Validate: all parent references resolve correctly

### Phase 3: Security Configuration
- `.claude/settings.json` should already exist with `acceptEdits` + Bash whitelist
- Verify: `defaultMode: "acceptEdits"`, deny rules cover rm -rf/sudo/chown
- If missing, see `.omc/skills/project-onboard.md` for template

### Phase 4: Build Verification
```bash
node --version          # Should be >= 21.0.0
npm install --ignore-scripts
npx tsc --noEmit        # Type check
npm run build           # Full build
node dist/src/main.js list  # CLI smoke test
```

### Phase 5: Cleanup
- Check for duplicate documentation directories
- Check for stale log files or empty directories
- Every deletion must have a clear commit message

### Phase 6: Push to GitHub
- Use `gh auth status` to verify authentication
- Push via: `git -c credential.helper='!gh auth git-credential' push origin main`
- If push fails, try `gh` CLI directly — do NOT retry raw tokens

## Key Architecture

```
CLI (opencli bilibili hot --limit 5)
  → src/cli.ts (Commander.js parsing)
    → src/commanderAdapter.ts (dynamic command registration from cli-manifest.json)
      → clis/bilibili/hot.js (adapter execution)
        → src/browser/cdp.ts (Chrome DevTools Protocol)
          → Chrome Browser Bridge extension
            → Target website (reuses your Chrome login session)

Studio Web UI (http://127.0.0.1:4173)
  → studio/ (Vue 3 + Naive UI + Pinia)
    → src/studio/server.ts (backend API on port 3113)
      → same daemon → extension → browser pipeline
```

## Critical Files Map

| File | Role |
|------|------|
| `src/cli.ts` (1,249 lines) | Central CLI orchestration — all commands registered here |
| `src/commanderAdapter.ts` | Dynamically registers 96 adapters as Commander.js commands |
| `cli-manifest.json` (429KB) | Auto-generated command registry — parameter definitions for all adapters |
| `src/daemon.ts` | HTTP daemon (port 19825) bridging CLI with Chrome extension |
| `src/browser/cdp.ts` | Chrome DevTools Protocol connection management |
| `extension/src/background.ts` | Chrome extension service worker — CDP relay |
| `studio/src/` | Vue 3 SPA — 6 views, Pinia store, i18n (zh-CN/en) |
| `clis/` | 96 site adapters (bilibili, twitter, youtube, spotify, etc.) |
| `autoresearch/engine.ts` | Karpathy-style 8-phase autonomous improvement loop |

## Development Rules

1. **Fork sync**: Keep Studio-specific changes isolated. Sync upstream `main` regularly from `jackwener/OpenCLI`
2. **Branch strategy**: Create feature branches for all changes. PR to `main`.
3. **Build before commit**: Always run `npm run build` or at least `npx tsc --noEmit` before pushing
4. **Adapter patterns**: Each `clis/<site>/` adapter typically has YAML config + JS files per command
5. **Studio frontend**: Vue 3 Composition API with `<script setup lang="ts">`, Naive UI components
6. **Testing**: `npm test` for unit tests, `npm run test:e2e` for browser tests (needs Chrome)
7. **Security**: `.claude/settings.json` enforces `acceptEdits` mode — do not weaken deny rules without review

## Avoid

- Modifying archived/legacy directories unless explicitly asked
- Hardcoding credentials or API keys
- Adding dependencies without clear justification
- Pushing directly to `main` without PR review
- Using `rm -rf`, `sudo`, `chown` (blocked by deny rules anyway)
