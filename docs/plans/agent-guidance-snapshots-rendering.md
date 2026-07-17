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

## Phase State

- [ ] Phase 0: generate and validate the installable Agent Skill from the
  shared source. In progress.
- [ ] Phase 1: fix `record-validation` grammar, results, streams, and
  filesystem effects in acceptance prose and fixtures.
- [ ] Phase 2: implement the packed `record-validation` command and pass its
  fixture and fault/integration gates.
- [ ] Phase 3: fix deterministic `render` HTML and failure behavior in
  acceptance prose and fixtures.
- [ ] Phase 4: implement the packed `render` command and pass its fixture and
  fault/integration gates.
- [ ] Phase 5: complete full repository validation and review proving every
  step-9 deliverable.

## Current State

Roadmap steps 1–8 are complete. The package contains the shared portable
authoring template, deterministic installed and exact-version `npx`
renderings, the complete validator, and the atomic no-overwrite writer. It
does not yet contain the installable Agent Skill or expose
`record-validation` and `render` in the command tree.

The active plan and authority routing are established. The next slice will
generate the Agent Skill without changing completed CLI behavior.

## Known Temporary Drift

- The CLI design names `record-validation` and `render`, but their detailed
  acceptance behavior, fixtures, and implementation are intentionally absent
  until their contract-first phases.
- The shared authoring renderer supports exact-version `npx` output, but no
  installable Skill artifact is generated or packed yet.

## Validation

The completed step-8 baseline is recorded in the
[CLI milestone index](cli-v0.md). The active-plan slice passes
`./scripts/check-docs.sh` and `git diff --check`. Later step-9 gates include
targeted tests, `pnpm verify`, packed-install execution, and repeat
documentation and whitespace checks.

## Blockers

None.

## Next Action

Finish the generated Agent Skill contract and artifact, validate its structure
and exact bytes, review the slice, and commit the passing unit before defining
the `record-validation` acceptance fixtures.
