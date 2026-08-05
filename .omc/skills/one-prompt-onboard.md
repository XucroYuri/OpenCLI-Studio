---
name: one-prompt-onboard
description: |
  Single-prompt project onboarding. Paste this into any AI coding agent
  to execute the full 6-phase pipeline: explore, document, secure, verify,
  clean, and push. Designed for Claude Code, Codex CLI, and OpenCode.
triggers:
  - Onboard this project
  - Initialize the repository
  - Set up all AGENTS.md
  - Full project setup
  - Bootstrap the codebase
  - One prompt to rule them all
---

# One-Prompt Project Onboarding

Paste the following prompt into any AI coding agent (Claude Code, Codex CLI, OpenCode)
to fully onboard a repository in one shot.

## The Prompt

```
You are onboarding this repository for AI-assisted development. Execute the following
6 phases IN ORDER. Do not skip phases. Do not mix phases. Report progress at each step.

## PHASE 1: DISCOVER
Read ALL of these files if they exist:
- README.md (all language variants)
- package.json / pyproject.toml / go.mod / Cargo.toml / CMakeLists.txt
- .env.example / .env
- Makefile / Dockerfile / docker-compose.yml
- .gitignore
- tsconfig.json / vite.config.ts / next.config.js etc.

Report: project name, one-sentence description, full tech stack, git remote URL,
last commit date, top-level directory listing.

## PHASE 2: DOCUMENT
For EVERY directory containing source code (not node_modules, .git, dist, build):
- Write an AGENTS.md file containing: Purpose, Key Files table, Subdirectories table,
  For AI Agents (working instructions + testing + patterns), Dependencies.
- Each AGENTS.md references its parent: <!-- Parent: ../AGENTS.md -->
- Root AGENTS.md has no parent reference.
- Skip empty directories, tooling directories (.claude, .omc), and leaf directories
  whose contents are already described in their parent's AGENTS.md.

Then write a CLAUDE.md at the project root containing:
- Project identity (name, description, stack, remote)
- Quick reference commands (build, test, dev, run)
- Architecture overview
- Key files map (file → role)
- Development rules and red lines

## PHASE 3: SECURE
Create .claude/settings.json with:
- defaultMode: "acceptEdits"
- allow: only commands this project actually needs (adapt to tech stack)
- deny: rm -rf, rm -r, sudo, chown, system file redirect
- included plugins: oh-my-claudecode, superpowers, typescript-lsp

Update .gitignore to allow .claude/settings.json while keeping other .claude/* ignored.
Also allow .omc/skills/*.md if the directory exists.

## PHASE 4: VERIFY
Run these checks:
- Runtime version (node --version / python3 --version / go version / rustc --version)
- Install dependencies
- Type check (tsc --noEmit / mypy / cargo check)
- Build (npm run build / make / cargo build)
- Run tests (npm test / pytest / go test / cargo test)
Report pass/fail for each. Do NOT fix failures — just report them.

## PHASE 5: CLEAN
Scan for:
- Duplicate documentation directories or files
- Empty directories (only __init__.py or similar)
- Stale log files
- Configuration drift between CI and local config
List every finding with a recommended action (merge/delete/keep). Wait for confirmation
before executing any deletions.

## PHASE 6: PUSH
- Verify: git status --short shows only expected changes
- Commit each logical group separately (docs, config, cleanup)
- Push to origin main (or master — CHECK the branch!)
- If push fails, try: SSH, HTTPS with gh credential helper, HTTPS with token
- Report: commit hash, branch, remote URL, PR link if applicable.
```

## Usage

Copy the prompt block above. Open your AI coding agent in the target repository.
Paste it. Let it run. Review the output at each phase boundary.

Works with:
- Claude Code (Anthropic)
- Codex CLI (OpenAI)
- OpenCode
- Gemini CLI

Expected runtime: 3-10 minutes per project depending on size.
