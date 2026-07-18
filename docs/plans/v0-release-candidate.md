# V0 Release Candidate Plan

Status: In progress. The reviewed candidate is merged to `main` at `b06de25`.
Its complete supported OS and Node.js matrix, documentation gate, production
audit, and dependent npm publication dry run pass. Release Please setup is in
progress; repository visibility, npm publication, tag, and GitHub release are
pending.

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
- Release Please owns version bumps, the release manifest, changelog, tag, and
  GitHub release. Its push workflow prepares release PRs without tagging; its
  separately dispatched release stage runs only after npm publication is
  verified.
- Before `1.0.0`, backward-compatible features bump the package patch version
  and breaking changes bump its minor version.

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

The candidate merged to `main`:

- changes package metadata, runtime discovery, installed-package checks,
  current CLI guidance, and generated Agent Skill commands to
  `@sjunepark/fs`;
- makes the Skill's create and repair branches explicit, loads the exact
  contract first, and gates completion on structural conformance and successful
  output creation;
- derives Skill package identity and version from `package.json` and validates
  generated guide, Skill, and metadata parity;
- defines the excluded value period globally so the extra-value fixture
  isolates the statement map-key mismatch, keeps recorded empty application
  arrays independent, tests the first excess JSON value, and uses rollup
  terminology in example discovery; and
- preserves the artifact format, operational CLI contract, public schema and
  specification URLs, and repository identity.

On 2026-07-18, exact-head push run `29647831201` proved `b06de25` on every
declared OS and Node.js line, then passed documentation, production audit, and
the dependent npm publication dry run. Live checks found `cpaikr/fs` private
with `main` as its default branch, no tag or GitHub release, and no published
`@sjunepark/fs@0.1.0`. This is the expected pre-release state.

Release Please setup is being prepared on top of the merged candidate. Its
workflow and ownership documentation are not package payload, and the initial
manifest records `0.0.0`; the setup commit supplies the one-time
`Release-As: 0.1.0` input.

## Remaining Work

### Candidate proof

Complete. The verified package payload is frozen at `b06de25`; release setup
and generated release artifacts must not change that payload.

### Release handoff

After the candidate proof succeeds and release is explicitly authorized:

1. Merge the Release Please setup with commit preservation.
2. Review and merge its generated `0.1.0` release PR without changing the
   packed payload.
3. Make `cpaikr/fs` public and verify anonymous access to the source, license,
   issue, homepage, and package-repository routes.
4. Publish the exact verified tarball only after repository visibility
   succeeds.
5. Verify the public package, then dispatch Release Please to tag the release
   PR merge commit and create the GitHub release.
6. Mark the V0 roadmap milestone complete.

## Validation

The current working tree passes:

- `pnpm release:check` on the active supported Node.js line on macOS;
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
run. Exact-head Linux, macOS, and Windows proof is complete for `b06de25`.

## Blockers

No product decision is blocked. Repository visibility, npm publication, and
the separately dispatched tag and GitHub release remain explicit release
actions.

## Next Action

Validate and merge the Release Please setup, then review the generated `0.1.0`
release PR.
