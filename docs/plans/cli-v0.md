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
| 2. Package and fail-closed validator | In progress | [Package foundation](cli-v0/phase-2-package.md) |
| 3. Complete semantic validation | Complete | [Semantic validation](cli-v0/phase-3-validation.md) |
| 4–5. Discovery, content, and creation | In progress | [Content and creation](cli-v0/phase-4-5-content-create.md) |

Production implementation begins only after both Phase 0 lanes and Phase 1
pass their gates. A partial validator is never a releasable conformance
command.

## Current Validation

`./scripts/check-docs.sh` passes for the aligned contracts and 76 process
descriptors. Strict typecheck, 54 unit tests, build, installed-tarball npm/npx
smoke, and exact packed-asset checks pass. The packed harness passes 62 cases:
all discovery/content plus validation and logging. Create, writer fault, and
cross-platform CI gates remain open.

## Current Blockers

- None. Remaining Phase 2 work is implementation, not an external blocker.

## Next Action

Implement `create` with the complete validator and shared writer, then finish
retained package, writer-fault, runtime-measurement, and platform gates.
