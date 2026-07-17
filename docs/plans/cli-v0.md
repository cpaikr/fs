# V0 CLI Delivery Plan

Status: Effect-native CLI implementation and local gates complete; supported
platform CI verification remains.

This file is the concise milestone index. Detailed scope, decisions, progress,
and validation evidence live in the linked child plans. The
[CLI design](../cli/design.md) owns command intent, the
[CLI acceptance contract](../cli/acceptance.md) owns observable process
behavior, and the [roadmap](../../ROADMAP.md) owns strategic sequence.

## Milestone

Deliver the packed `@cpai/fs` reference CLI through `fs create`, then migrate
that surface to the revised Effect-native contract. The milestone includes
complete discovery and bundled content, full validation, atomic exact-byte
non-overwriting creation, and the `effect/unstable/cli` runner. It stops before
Agent Skill generation, `record-validation`, `render`, and release readiness.

## Aggregate State

| Phase | State | Detailed plan |
| --- | --- | --- |
| 0a. Contract alignment | Complete | [Contract alignment](cli-v0/phase-0-contracts.md) |
| 0b. Runtime and command seam | Complete | [Runtime integration](cli-v0/phase-0-effect.md) |
| 1. Acceptance suite | Complete | [Acceptance suite](cli-v0/phase-1-acceptance.md) |
| 2. Package and fail-closed validator | Complete | [Package foundation](cli-v0/phase-2-package.md) |
| 3. Complete semantic validation | Complete | [Semantic validation](cli-v0/phase-3-validation.md) |
| 4–5. Discovery, content, and creation | Complete | [Content and creation](cli-v0/phase-4-5-content-create.md) |
| 6. Effect-native CLI contract and migration | In progress | [Effect-native CLI migration](cli-v0/phase-6-effect-cli.md) |

Phases 0–5 record the completed pre-migration implementation. Phase 6
deliberately supersedes only the command grammar and native presentation
decisions identified in its plan. A partial validator is never a releasable
conformance command.

## Current Validation

The current Effect-native implementation passes `pnpm verify` on supported
Node 22.17.0: strict typecheck, zero strict Effect diagnostics, 92 unit and
fault tests, all 81 revised packed-process cases, five child-process crash
points, early contender-exit detection, 16-way writer contention, and
installed-tarball npm/npx smoke for 39 cleanly built packed files. The packed
help checks include the production entry point with color-capable terminal
state and reject CSI and OSC escapes.

The same full suite passed locally on Node 24.15.0 before the final
packaging-test hardening; the final pack check passes on both supported Node
versions. Full isolated Linux verification also passes on both versions.
`./scripts/check-docs.sh` and `git diff --check` pass. CI is configured for
both Node versions on Linux, macOS, and Windows, but has not run for these
local commits.

## Known Temporary Drift

None. The private Effect command tree, typed application boundary, fixtures,
and packed executable implement the revised contract. Artifact semantics,
operation results, exact bundled content, logging, and filesystem behavior
remain unchanged.

## Current Blockers

- The current PR head has not completed the GitHub-hosted Linux, macOS, and
  Windows CI matrix.

## Next Action

Require all six supported Node/platform CI legs and the documentation check to
pass, then close Phase 6 and Roadmap step 8.
