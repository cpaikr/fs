# V0 CLI Delivery Plan

Status: Effect-native CLI migration in progress; implementation through
`fs create` remains complete under the prior adapter.

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

The retained pre-migration baseline last passed `pnpm verify`: strict
typecheck, Effect diagnostics, 96 unit and fault tests, all 80 historical
packed-process cases, five child-process crash points, 16-way writer
contention, build, installed-tarball npm/npx smoke, and exact checks for 46
packed files. The same baseline passed in isolated Linux environments on Node
22.17.0 and 24.15.0; CI enforces both versions on Linux, macOS, and Windows.

The revised 80-case descriptor suite and its semantic native-text matcher pass
fixture integrity and `./scripts/check-docs.sh`; `git diff --check` also passes.
The packed-process suite is expected to remain red until the old adapter is
replaced and does not yet prove Phase 6 complete.

## Known Temporary Drift

The CLI design, acceptance contract, and process fixtures now define the
Effect-native surface. The exact help assets, `util.parseArgs` adapter, and
related source and unit tests still implement the superseded contract until
Phase 6 migrates them. The maintained authoring guide and revised fixtures use
the canonical command forms, so the old adapter does not yet satisfy the
packed-process suite. Artifact semantics, operation results, exact bundled
content, logging, and filesystem behavior are not drifting.

## Current Blockers

- None.

## Next Action

Define the private public-API `effect/unstable/cli` command tree with refined
operand and command-local flag cardinality, then dispatch its handlers into
the existing typed application boundary without changing retained operation
results or filesystem behavior.
