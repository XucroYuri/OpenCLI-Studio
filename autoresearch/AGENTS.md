<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# autoresearch

## Purpose
Autonomous evolutionary improvement engine based on Karpathy's autoresearch pattern. Runs an 8-phase unbounded loop: precondition checks -> review -> ideate -> modify -> commit -> verify -> guard -> decide (keep/discard/crash). Uses a constraint + mechanical metric + unbounded iteration model to autonomously improve OpenCLI adapter reliability (browser pass rates, save adapter quality, skill quality). Configured via preset files with goal, scope, metric, direction, verify command, and optional guard.

## Key Files
| File | Description |
|------|-------------|
| `engine.ts` | Core 8-phase autonomous iteration loop (364 lines) -- the heart of autoresearch |
| `config.ts` | Type definitions (`AutoResearchConfig`, `IterationResult`) and CLI arg parser |
| `logger.ts` | TSV-format append-only results logger with metadata header and pattern recognition |
| `eval-all.ts` | Combined test suite runner -- runs browse + V2EX + Zhihu tasks, reports combined score |
| `eval-browse.ts` | Browse adapter test runner (generic browser reliability evaluation) |
| `eval-save.ts` | Save adapter test runner (xiaohongshu, zhihu save adapter evaluation) |
| `eval-skill.ts` | Skill quality evaluation runner |
| `eval-publish.ts` | Publish adapter test runner |
| `eval-v2ex.ts` | V2EX adapter reliability test runner |
| `eval-zhihu.ts` | Zhihu adapter reliability test runner |
| `run-browse.sh` | Shell wrapper to launch browse reliability improvement loop |
| `run-save.sh` | Shell wrapper to launch save adapter improvement loop |
| `run-skill.sh` | Shell wrapper to launch skill quality improvement loop |
| `browse-tasks.json` | Task definitions for browse adapter tests |
| `save-tasks.json` | Task definitions for save adapter tests |
| `publish-tasks.json` | Task definitions for publish adapter tests |
| `v2ex-tasks.json` | Task definitions for V2EX adapter tests |
| `zhihu-tasks.json` | Task definitions for Zhihu adapter tests |
| `baseline-browse.txt` | Cached browse baseline metric |
| `baseline-skill.txt` | Cached skill baseline metric |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `commands/` | CLI entrypoints for the autoresearch workflow |
| `presets/` | Preset configurations defining goal/scope/metric/verify for each improvement target |
| `save-adapters/` | Target save adapters being improved (xiaohongshu, zhihu variants) |

### commands/
| File | Description |
|------|-------------|
| `run.ts` | Main autonomous iteration loop entrypoint (`/autoresearch` command) |
| `plan.ts` | Interactive configuration wizard -- walks through goal, scope, metric, verify, guard |
| `fix.ts` | Iterative error elimination -- auto-detects broken state and iteratively fixes |
| `debug.ts` | Hypothesis-driven debugging for specific failing tasks (scientific method loop) |

### presets/
| File | Description |
|------|-------------|
| `index.ts` | Preset registry -- maps preset names to their configs |
| `browser-reliability.ts` | Preset: increase browser adapter pass rate |
| `save-reliability.ts` | Preset: increase save adapter pass rate |
| `combined-reliability.ts` | Preset: increase combined (browse + save) pass rate |
| `v2ex-reliability.ts` | Preset: increase V2EX adapter pass rate |
| `zhihu-reliability.ts` | Preset: increase Zhihu adapter pass rate |
| `skill-quality.ts` | Preset: improve skill quality metrics |

### save-adapters/
| File | Description |
|------|-------------|
| `xhs-explore-deep.ts` | Xiaohongshu deep exploration save adapter |
| `xhs-note-comments.ts` | Xiaohongshu note comments save adapter |
| `xhs-search-full.ts` | Xiaohongshu full search save adapter |
| `zhihu-hot-detail.ts` | Zhihu hot detail save adapter |
| `zhihu-question-full.ts` | Zhihu full question save adapter |
| `zhihu-search-detail.ts` | Zhihu search detail save adapter |

## For AI Agents

### Working In This Directory
- The engine (`engine.ts`) requires a **clean git working tree** to start -- it commits each iteration.
- Presets define the complete experiment config: goal, scope (glob patterns), metric name, direction (`higher`/`lower`), verify command (shell command outputting a number), and optional guard.
- The engine delegates "ideate + modify" to a callback -- the calling agent (e.g., Claude) does the actual code changes.
- Each iteration: the agent proposes a change -> engine commits it -> verify command runs -> metric compared -> keep or rollback.
- After 5+ consecutive discards, the engine provides increasingly aggressive "stuck hints" to break out of local optima.
- Results are logged as TSV with columns: iteration, commit, metric, delta, guard, status, description.

### Testing Requirements
- The eval scripts (`eval-*.ts`) are the verify commands used by presets.
- Each eval script runs a suite of tasks and outputs a SCORE line (e.g., `SCORE=56/59`).
- Baselines in `baseline-*.txt` are initial reference metrics.
- Run evals standalone to ensure they work before wiring them into the engine loop.

### Common Patterns
- Presets follow `AutoResearchConfig` interface: `{ goal, scope, metric, direction, verify, guard?, iterations?, minDelta? }`
- Eval scripts output `SCORE=N/M` or a raw number for the engine to parse
- Commands use `#!/usr/bin/env npx tsx` shebang for direct execution
- Task JSON files define arrays of test cases for eval scripts

## Dependencies

### Internal
- `src/` -- the OpenCLI engine being improved (in-scope files for modification)
- `clis/` -- adapters targeted by reliability improvement presets

### External
- Node.js child_process (execSync, execFileSync) for git and shell operations
- `npx tsx` -- TypeScript execution runtime

<!-- MANUAL: -->
