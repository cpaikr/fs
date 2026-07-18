# V0 Release Candidate Plan

Status: In progress. The working tree based on `dev` contains the reviewed npm
identity, documentation system, and Agent Skill. The complete local release
gate passes on both supported Node.js lines on macOS, but this exact revision
has no integrated cross-platform proof. Publication is outside this
documentation run.

This plan owns the live V0 release-candidate state, release decisions,
validation, blockers, and next action. The
[semantic specification](../semantic-spec.md) owns artifact meaning, the
[CLI design](../cli/design.md) owns command intent, the
[CLI acceptance contract](../cli/acceptance.md) owns observable process
behavior, and the [roadmap](../../ROADMAP.md) owns strategic sequence.
Completed plans are historical delivery evidence, not current status.

## Objective

Prepare `@sjunepark/fs@0.1.0` as a robust CLI-only V0 release for untrusted and
agent-generated input, prove the exact packed candidate on every supported
runtime, and hand that unchanged candidate to a separately authorized release
workflow.

Candidate preparation and release remain separate. The source repository stays
private through preparation. Release makes it public and verifies anonymous
access before npm publication, then tags and creates the GitHub release only
after publication succeeds.

## Release Decisions

- The npm identity is `@sjunepark/fs`; V0 uses package version `0.1.0`, artifact
  `formatVersion: "0.1"`, and Apache-2.0.
- The immutable V0 schema base is
  `https://cpaikr.github.io/fs/schema/0.1/`. Published document,
  validation-result, and snapshot-diff schema bytes must match the repository.
  An incompatible change requires a new versioned path.
- The public specification is
  `https://cpaikr.github.io/fs/spec/0.1/`. Package-facing guidance must not
  depend on access to the private source repository.
- Validation remains offline against bundled schemas and semantic rules. The
  optional document `$schema`, when present, is exactly the document schema
  URL.
- V0 is CLI-only. Package exports expose the executable, command-delivered
  assets, and deliberately allowed package metadata, not implementation
  modules.
- Public input is untrusted. Resource use and failures are bounded,
  deterministic, and redacted. Operational limit failures do not change
  artifact conformance.
- Native actions, discovery, and pathless bundled content do not require a
  working directory. Only relative path resolution may acquire it.
- Required documentation tools are exact lockfile dependencies and run from a
  frozen, lifecycle-disabled installation. Required CI does not download
  executables with `npx`.
- The unreleased CLI contract and implementation may be revised in place. V0
  adds no legacy reader, alias, deprecated path, dual behavior, or compatibility
  layer.
- `@effect/platform-node-shared` remains the Node adapter because it provides
  the required filesystem, path, process, terminal, signal, and stream services
  without the unused peer surface of the prior aggregate package.
- Candidate proof covers every declared Node.js line on Linux, macOS, and
  Windows, followed by the dependent npm publication dry run on the exact
  candidate head.

## Completed Candidate Foundation

The prior `@cpai/fs` candidate established the semantic contract, schemas,
examples, fixtures, generated guidance, validator, snapshot workflow, renderer,
atomic writer, CLI, package boundary, and hermetic release gates. It also:

- bounded input, structural diagnostics, and exact-decimal work;
- replaced recursive parsing and order-sensitive decimal aggregation;
- separated native/pathless actions from application I/O and added stable
  working-directory failures for relative paths;
- sealed deep package imports and verified exact retained package assets;
- closed pathless asset, structural-diagnostic amplification,
  snapshot-decimal-budget, and shipped-document routing defects; and
- retained deterministic, redacted results and atomic no-overwrite behavior
  across the complete command surface.

The review follow-up and hardening checkpoints were merged by PRs `#11` through
`#14`. Final prior-candidate proof is merge commit `8d5f617`; push run
`29639266777` passed the complete supported OS and Node.js matrix,
documentation, production audit, and dependent npm publication dry run on that
integrated commit.

## Current Revision

The working tree based on `dev`:

- changes package metadata, runtime discovery, installed-package checks,
  current CLI guidance, and generated Agent Skill commands to
  `@sjunepark/fs`;
- makes the Skill's create and repair branches explicit, loads the exact
  contract first, and gates completion on structural conformance and successful
  output creation;
- derives Skill package identity and version from `package.json` and validates
  generated guide, Skill, and metadata parity; and
- preserves the artifact format, operational CLI contract, public schema and
  specification URLs, and repository identity.

On 2026-07-18, live checks found `cpaikr/fs` private with `main` as its default
branch, no tag or GitHub release, and no published
`@sjunepark/fs@0.1.0`. This is the expected pre-release state.

The prior cross-platform run does not prove the revised package identity or
Skill. Documentation harmonization and the current code-review pass have no
unresolved material findings. This revision becomes a verified candidate only
after commit and fresh exact-head CI.

## Remaining Work

### Candidate proof

1. Commit and push the reviewed revision without changing its validated bytes.
2. Run the complete supported OS and Node.js matrix and its dependent npm
   publication dry run on the exact candidate head.
3. Reconcile any material finding in its owning contract, implementation, or
   this plan, then repeat exact-head proof.
4. Freeze the verified candidate for release.

### Release handoff

After the candidate proof succeeds and release is explicitly authorized:

1. Promote the verified candidate with commit preservation.
2. Make `cpaikr/fs` public and verify anonymous access to the source, license,
   issue, homepage, and package-repository routes.
3. Publish the exact verified tarball only after repository visibility
   succeeds.
4. Verify the public package, then tag the exact commit, create the GitHub
   release, and mark the V0 roadmap milestone complete.

## Validation

The current working tree passes:

- `pnpm release:check` on both supported Node.js lines on macOS;
- `pnpm audit:prod`;
- generated guide, Agent Skill, and metadata parity checks within
  `pnpm check:docs`;
- the official Agent Skill structure validator;
- a fresh-context Skill execution that followed the exact pinned commands and
  stopped at the expected unpublished-package boundary; and
- `git diff --check`.

The release gate covers documentation and contract artifacts, type and strict
Effect diagnostics, unit and packed-process acceptance suites, writer crash and
concurrency integration, installed-tarball checks, and npm's publication dry
run. Fresh integrated Linux, macOS, and Windows proof remains pending for this
revision.

## Blockers

No product decision is blocked. Publication is blocked until the reviewed
revision has exact-head cross-platform proof and its dependent npm publication
dry run. Repository visibility and publication remain user-owned release
actions.

## Next Action

Commit and push the unchanged candidate revision so the complete
cross-platform matrix and dependent npm dry run can prove its exact head.
