# V0 CLI Delivery Plan

Status: complete through `fs create`.

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
| 2. Package and fail-closed validator | Complete | [Package foundation](cli-v0/phase-2-package.md) |
| 3. Complete semantic validation | Complete | [Semantic validation](cli-v0/phase-3-validation.md) |
| 4–5. Discovery, content, and creation | Complete | [Content and creation](cli-v0/phase-4-5-content-create.md) |

Production implementation begins only after both Phase 0 lanes and Phase 1
pass their gates. A partial validator is never a releasable conformance
command.

## Current Validation

`pnpm verify` passes strict typecheck, Effect diagnostics, 83 unit and fault
tests, all 76 packed-process cases, build, installed-tarball npm/npx smoke, and
exact checks for 46 packed files. The same gate passes in isolated Linux
environments on Node 22.17.0 and 24.15.0; CI enforces both versions on Linux,
macOS, and Windows. `./scripts/check-docs.sh` and `git diff --check` pass.

## Current Blockers

- None.

## Next Action

No in-milestone action remains. The next roadmap slice is Phase 6 Agent
Guidance, which is deliberately outside this milestone.
