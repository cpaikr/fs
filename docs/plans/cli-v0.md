# V0 CLI Delivery Plan

Status: active. The repository contains the settled artifact and CLI contracts,
schemas, examples, and language-neutral fixtures, but no package, executable,
build, or CLI acceptance suite.

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
| 1. Acceptance suite | Not started | [Acceptance suite](cli-v0/phase-1-acceptance.md) |
| 2. Package and fail-closed validator | Not started | [Package foundation](cli-v0/phase-2-package.md) |
| 3. Complete semantic validation | Not started | [Semantic validation](cli-v0/phase-3-validation.md) |
| 4–5. Discovery, content, and creation | Not started | [Content and creation](cli-v0/phase-4-5-content-create.md) |

Production implementation begins only after both Phase 0 lanes and Phase 1
pass their gates. A partial validator is never a releasable conformance
command.

## Current Validation

`./scripts/check-docs.sh` passes for the aligned contracts, schemas, fixtures,
raw inputs, exact help inventory, and installed-guide generation. The exact
Effect package inspection and Node 22/24 argument-token probes also pass.
Implementation, acceptance, package, and cross-platform checks remain
unavailable because their source and harnesses do not exist.

## Current Blockers

- CLI acceptance descriptors and their integrity check do not exist.

## Next Action

Build and validate the complete Phase 1 acceptance descriptor suite before
adding production source.
