# V0 CLI Delivery Plan

Status: active. Contracts and the complete process acceptance suite through
`fs create` are settled, but no package, executable, build, or production CLI
implementation exists.

This file is the concise milestone index. Detailed scope, decisions, progress,
and validation evidence live in the linked child plans. The
[CLI design](../cli/design.md) owns command intent, the
[CLI acceptance contract](../cli/acceptance.md) owns observable process
behavior, and the [roadmap](../../ROADMAP.md) owns strategic sequence.

## Milestone

Deliver the packed `@cpai/fs` reference CLI through `fs create`. The milestone
includes complete discovery and bundled content, full validation, and atomic
exact-byte non-overwriting creation. It stops before Agent Skill generation,
`record-validation`, `render`, and release readiness.

## Aggregate State

| Phase | State | Detailed plan |
| --- | --- | --- |
| 0a. Contract alignment | Complete | [Contract alignment](cli-v0/phase-0-contracts.md) |
| 0b. Runtime and command seam | Complete | [Runtime integration](cli-v0/phase-0-effect.md) |
| 1. Acceptance suite | Complete | [Acceptance suite](cli-v0/phase-1-acceptance.md) |
| 2. Package and fail-closed validator | Not started | [Package foundation](cli-v0/phase-2-package.md) |
| 3. Complete semantic validation | Not started | [Semantic validation](cli-v0/phase-3-validation.md) |
| 4–5. Discovery, content, and creation | Not started | [Content and creation](cli-v0/phase-4-5-content-create.md) |

Production implementation begins only after both Phase 0 lanes and Phase 1
pass their gates. A partial validator is never a releasable conformance
command.

## Current Validation

`./scripts/check-docs.sh` passes for the aligned contracts, schemas, artifact
fixtures, raw inputs, maintained content, and all 76 CLI process descriptors.
The exact Effect package inspection and Node 22/24 argument-token probes also
pass. Package, implementation, packed-process, and cross-platform checks remain
unavailable because their source and harnesses do not exist.

## Current Blockers

- None. Phase 2 is ready to begin.

## Next Action

Create the pinned package and test harness, then implement the fail-closed
Phase 2 validation path against the fixed descriptors.
