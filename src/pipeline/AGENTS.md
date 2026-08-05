<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# src/pipeline

## Purpose
Command execution pipeline with a step-based architecture. Handles the core automation workflows: `explore` (inspect pages for capabilities), `synthesize` (generate JS adapters from exploration), `generate` (one-shot explore->synthesize->register), and `cascade` (auth strategy discovery). Also contains the pipeline executor, step registry, and template engine.

## Key Files
| File | Description |
|------|-------------|
| `index.ts` | Barrel export for the pipeline module |
| `executor.ts` | Pipeline executor -- runs steps in sequence with error handling and rollback |
| `registry.ts` | Step registry -- maps step names to implementations for dynamic pipeline assembly |
| `template.ts` | Template engine for generating adapter code from exploration results |
| `transform.ts` | Data transformation utilities for pipeline steps |
| `types.ts` | Pipeline-specific type definitions |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `steps/` | Individual pipeline step implementations (see `steps/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Steps in `steps/` are the atomic units. The executor chains them in order.
- Templates in `template.ts` generate JavaScript adapter code -- keep generated code clean and well-structured.
- The pipeline supports dry-run mode for previewing what would be generated.

### Testing Requirements
- Tests for executor and template: `executor.test.ts`, `template.test.ts`, `transform.test.ts`
- Step-level tests in `steps/` directory

### Common Patterns
- Pipeline steps implement a common interface with `execute(input, context)` and return step results
- Templates use a tagged template or string interpolation pattern for code generation

## Dependencies

### Internal
- `src/browser/` -- CDP integration for page exploration
- `src/analysis.ts` -- capability analysis consumed by synthesize step
- `clis/` -- generated adapters are written to this directory

### External
- TypeScript compiler API (for validating generated code)
- `js-yaml` (for YAML adapter definitions)

<!-- MANUAL: -->
