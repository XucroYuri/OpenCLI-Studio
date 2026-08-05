<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# src/pipeline/steps

## Purpose
Individual pipeline step implementations. Each file represents one stage in the automation workflow -- page exploration, capability extraction, adapter synthesis, command generation, auth cascade probing. Steps are composed by the pipeline executor in `src/pipeline/executor.ts`.

## Key Files
| File | Description |
|------|-------------|
| `browser.ts` | Step: open and control a browser page for exploration |
| `download.ts` | Step: download page content and assets |
| `fetch.ts` | Step: HTTP fetch with auth handling |
| `intercept.ts` | Step: network request interception and capture |
| `tap.ts` | Step: tap/click interaction simulation |
| `transform.ts` | Step: transform captured data into structured adapter definitions |
| `framework.ts` | Step: detect and analyze JavaScript framework usage on target pages |
| `interact.ts` | Step: multi-step user interaction simulation |
| `store.ts` | Step: persist generated adapter artifacts |
| `command.ts` | Step: register generated adapter as a usable `opencli` command |

## For AI Agents

### Working In This Directory
- Each step file exports a step function/object consumed by the executor.
- Steps should be idempotent where possible -- the executor may retry on transient failures.
- New steps must be registered in `src/pipeline/registry.ts` before they can be used in pipelines.

### Testing Requirements
- Step tests: `*.test.ts` files alongside step implementations
- Test each step in isolation with mocked inputs before integration testing

### Common Patterns
- Step signature: `execute(input: StepInput, context: PipelineContext): Promise<StepResult>`
- Steps throw typed errors that the executor handles (retry, skip, abort)
- Context object is mutable and passed between steps for data sharing

## Dependencies

### Internal
- `src/pipeline/executor.ts` -- consumes steps
- `src/pipeline/registry.ts` -- step registration
- `src/browser/` -- CDP operations used by browser/interaction steps
- `src/analysis.ts` -- capability analysis

<!-- MANUAL: -->
