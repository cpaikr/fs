# Agent Guidance, Snapshot Recording, and Rendering Plan

Status: Active.

This plan owns mutable task state, gates, validation, blockers, and the next
action for Roadmap step 9. The [semantic specification](../semantic-spec.md)
owns artifact meaning, the [CLI design](../cli/design.md) owns command intent,
the [CLI acceptance contract](../cli/acceptance.md) owns observable process
behavior, and the [roadmap](../../ROADMAP.md) owns strategic sequence.

## Milestone

Deliver an installable Agent Skill generated from the portable authoring
source, then add `fs record-validation` and `fs render` through separate
contract-first slices. Preserve the completed Effect-native command,
validation, logging, and atomic-write guarantees. Stop before Roadmap step 10:
placeholder schema identifiers, release-wide cross-platform verification, and
V0 release remain out of scope.

## Decisions

- Agent Skill guidance and `fs guide authoring` remain renderings of
  `content/guide/authoring.md.template`; the Skill rendering pins one exact npm
  package version and must work outside a repository checkout.
- The repository-distributed Skill lives at
  `.agents/skills/author-fs/SKILL.md`. It is installable from the repository and
  is not duplicated in the npm tarball; its pinned commands invoke that npm
  package when the Skill runs.
- The Skill stays concise and routes to published contracts and bundled CLI
  discovery instead of embedding schemas, examples, or the semantic
  specification in default agent context.
- Each new command starts with aligned CLI acceptance prose and executable
  fixtures. Implementation follows only after the target process behavior is
  fixed.
- Both commands reuse the existing complete validator and atomic,
  non-overwriting writer. Structural nonconformance prevents output;
  calculation inconsistency does not.
- Snapshot recording writes a new ordinary FS document and replaces any
  existing `validationSnapshot`; it does not retain history or mutate the
  input.
- Rendering is a deterministic, standalone HTML projection of the flat
  presentation model. It must not infer hierarchy, calculations, missing
  facts, taxonomy, or financial meaning.
- Rendered tables follow semantic presentation order. Columns are
  period-major with the first listed axis changing slowest; exact stored
  decimals are not rescaled, and missing and unavailable cells stay distinct.
- The HTML has fixed embedded styling and no scripts or external resources.
  All author-controlled displayed text is escaped; rules, snapshots,
  identifiers, and descriptions are not displayed.

## Phase State

- [x] Phase 0: generate and validate the installable Agent Skill from the
  shared source.
- [x] Phase 1: fix `record-validation` grammar, results, streams, and
  filesystem effects in acceptance prose and fixtures.
- [x] Phase 2: implement the packed `record-validation` command and pass its
  fixture and fault/integration gates.
- [x] Phase 3: fix deterministic `render` HTML and failure behavior in
  acceptance prose and fixtures.
- [ ] Phase 4: implement the packed `render` command and pass its fixture and
  fault/integration gates. In progress.
- [ ] Phase 5: complete full repository validation and review proving every
  step-9 deliverable.

## Current State

Roadmap steps 1–8, the step-9 Agent Skill, and the `record-validation`
contract and implementation slices are complete. The
repository-distributed `author-fs` Skill is generated from the shared portable
authoring template with exact-version `npx` commands. The package contains the
complete validator, atomic no-overwrite writer, and packed snapshot-recording
command. Snapshot recording replaces an existing valid snapshot, refuses
structural nonconformance, reports the created document as a snapshot match,
and preserves input and destination safety.

The render contract and 17 executable cases fix standalone bytes, metadata,
flat table ordering, cell lookup and display, escaping, validation gates,
process envelopes, filesystem precedence, discovery, and help. The suite has
117 total descriptors. Implementation now begins against that fixed boundary.

## Known Temporary Drift

- Discovery, root help, and render cases intentionally fail the implementation
  gate until the new command is wired and packed.

## Validation

The completed step-8 baseline is recorded in the
[CLI milestone index](cli-v0.md). The active-plan slice passes
`./scripts/check-docs.sh` and `git diff --check`. The Agent Skill slice passes
deterministic generated-byte checks, exact-version acceptance and rejection,
the Skill validator in an ephemeral PyYAML environment, and
`./scripts/check-docs.sh`. A fresh-context refusal test also stopped on an
incomplete financial model without inventing decisions. Later step-9 gates
include targeted tests, `pnpm verify`, packed-install execution, and repeat
documentation and whitespace checks.

The completed `record-validation` slice passes `pnpm verify`: typecheck, zero
strict Effect diagnostics, 100 unit and boundary tests, all 100 packed-process
cases, five writer crash points, early contender-exit detection, 16-way writer
contention, and installed-tarball npm/npx smoke for 41 cleanly built packed
files. `./scripts/check-docs.sh` passes with exact generated documents that
revalidate as snapshot matches, and `git diff --check` passes.

The render contract slice passes `./scripts/check-docs.sh`, including all 117
CLI descriptors and the new conforming presentation fixture, plus
`git diff --check`. Its expected implementation-gate failure is limited to
the absent `render` discovery and command surface. Contract review strengthened
the presentation fixture so reversed and subset display order, exact unit and
dimension matching, and dimensionless lookup cannot pass accidentally through
definition-order or wildcard implementations.

## Blockers

None.

## Next Action

Implement a pure deterministic HTML renderer, complete the validated document
model needed by presentation, wire the Effect command through the shared
process and atomic writer boundaries, and satisfy the 17 render cases.
