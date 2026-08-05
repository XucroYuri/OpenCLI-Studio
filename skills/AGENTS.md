<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# skills

## Purpose
Agent skills for OpenCLI workflows, distributed via `npx skills add jackwener/opencli`. Each skill provides structured guidance for AI agents working with OpenCLI -- from one-shot command generation to full browser exploration and adapter creation. These are the canonical references for agents using OpenCLI programmatically.

## Key Files
| Directory | Description |
|-----------|-------------|
| `opencli-usage/SKILL.md` | General usage reference -- CLI commands, configuration, troubleshooting, exit codes, output formats |
| `opencli-browser/SKILL.md` | Browser control skill -- live page inspection, CDP-based steering, interactive workflows |
| `opencli-explorer/SKILL.md` | Full exploration workflow -- the complete browser exploration methodology, 5-tier authentication strategy decision tree, debugging guide. Contains `references/` subdirectory with supplementary docs |
| `opencli-oneshot/SKILL.md` | Single command generation -- just a URL + one-line goal, 4 steps to a working command. Simplest entry point |
| `opencli-autofix/SKILL.md` | Auto-fix skill -- diagnoses and fixes common adapter issues automatically |
| `smart-search/SKILL.md` | Smart search capability with `references/` subdirectory |

## For AI Agents

### Working In This Directory
- Skills follow the Agent Skills specification with SKILL.md as the entry point.
- Skills are distributed via the `npx skills` CLI and consumed by AI coding agents.
- `opencli-explorer` is the recommended starting point for agents needing a reusable command for a site.
- `opencli-browser` is for agents that need to inspect or steer the page directly.
- `opencli-oneshot` is the quickest path for one-off command generation.

### Testing Requirements
- Skills are tested through agent usage -- verify they produce correct guidance when loaded.
- Update skills when adapter patterns or CLI commands change significantly.

### Common Patterns
- SKILL.md files use structured markdown with step-by-step workflows
- Decision trees documented with flow charts or nested lists
- References subdirectory for supplementary material referenced from SKILL.md

## Dependencies

### Internal
- All OpenCLI commands and adapters (skills reference the full CLI surface)
- `clis/` -- adapters that skills help agents create and use

### External
- `npx skills` CLI -- distribution mechanism
- AI coding agents (Claude Code, Cursor, Codex) -- consumers

<!-- MANUAL: -->
