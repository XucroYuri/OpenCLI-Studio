# OpenCLI Studio Upstream Sharing Cut List

## Purpose

Keep the fork moving without losing the path back to `jackwener/OpenCLI`.

This note identifies which Studio changes are good upstream candidates, which parts should remain fork-specific for now, and what to prepare before asking for contributor-style sharing.

## Clean Upstream Candidates

These changes are relatively self-contained and do not require the upstream repo to adopt the full Studio product layer:

- `src/studio/metadata.ts`
  - richer command metadata shaping
  - safer choice inference for known fixed-value args
  - capability / risk / surface typing that can improve any registry-driven UI
- `src/studio/site-taxonomy.ts`
  - broader market/category coverage for existing sites
  - generic command-tag counting utilities
- `src/studio/recipes.ts`
  - read-only or trend-oriented recipe definitions that simply compose existing commands
- `src/studio/server.ts`
  - local API additions that expose existing runtime data instead of inventing fork-only behavior
  - good candidates: richer command detail payloads, snapshots/jobs plumbing, plugin/external inventory, site access checks
- `src/studio/types.ts`
  - API contract types that mirror the local server payloads and stay UI-agnostic
- tests under `src/studio/*.test.ts`
  - especially metadata, recipes, server, ops, and store coverage

## Fork-Specific Layers To Keep Isolated

These are product decisions for OpenCLI Studio and should not be proposed upstream as-is:

- `studio/src/**`
  - visual design, route structure, page composition, and local-first UX details
- creator-oriented ranking and editorial ordering
  - keep explicit ranking logic configurable if upstream ever wants a neutral default
- fork branding and release routing
  - repo URL, release page, browser bridge download targets, README fork framing
- large zh-CN content additions aimed at Studio discovery UX
  - useful locally, but upstream likely needs separate editorial review and scope trimming

## Compatibility Layers Or Upstream Support Still Needed

- ranking configuration should be injectable
  - upstream will likely need a neutral ordering mode instead of the current creator-first site priorities
- Studio API surface should stay optional
  - upstream may accept backend/runtime primitives before accepting the full frontend shell
- package metadata needs a cleaner fork/upstream split
  - repository URLs, release links, and docs pointers should not require hand-editing per sync
- cross-platform verification needs tightening
  - current Windows baseline still has unrelated symlink/path test failures outside Studio

## Contributor-Style Sharing Packet

When preparing an upstream share request, split it into small patches:

1. metadata + taxonomy + tests
2. recipes and registry/API enrichment
3. ops/readiness/runtime helpers that stay local-first and CLI-compatible

For each patch, prepare:

- the user-facing problem it solves
- why it is reusable outside this fork
- exact tests that pass
- which parts remain fork-only and were intentionally excluded

## Recommended Next-Version Follow-Ups

- move creator-priority tables behind a config layer so Studio can keep its opinionated defaults without hard-coding them into generic metadata shaping
- isolate fork-only i18n/catalog decoration from upstream command metadata so upstream syncs stay low-conflict
- add a narrow Windows-safe verification script for Studio work that excludes known unrelated plugin symlink failures
- keep backend Studio payloads generic enough that an upstream CLI TUI or alternate frontend could reuse them later
