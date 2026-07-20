# V0 Release Candidate Plan

Status: Complete. `@sjunepark/fs@0.1.0` is public on npm, `cpaikr/fs` is public,
and GitHub release `v0.1.0` tags release commit `1f1d736`.

This completed plan records the final V0 release state, release decisions,
validation, and follow-up boundary. The
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
the dependent npm publication dry run. Release setup and generated release
artifacts did not change the verified package payload.

## Release Result

### Candidate proof

Complete. The verified package payload is frozen at `b06de25`; release setup
and generated release artifacts did not change that payload.

### Release handoff

Complete. Release Please setup merged through PR `#17`, its runner correction
through PR `#18`, and generated release PR `#19` at commit `1f1d736`. The
generated changelog gate correction merged separately through PR `#20`.

The repository was made public and anonymous access to the source, license,
issues, specification, and schemas succeeded before npm publication. The exact
verified tarball was published as
[`@sjunepark/fs@0.1.0`](https://www.npmjs.com/package/@sjunepark/fs/v/0.1.0).
Release Please workflow run `29649239716` then created tag and
[GitHub release `v0.1.0`](https://github.com/cpaikr/fs/releases/tag/v0.1.0) at
`1f1d736`.

## Validation

The released revision passes:

- `pnpm release:check` on the active supported Node.js line on macOS;
- `pnpm audit:prod`;
- generated guide, Agent Skill, and metadata parity checks within
  `pnpm check:docs`;
- the official Agent Skill structure validator;
- a clean registry install and execution reporting `fs v0.1.0`; and
- `git diff --check`.

The release gate covers documentation and contract artifacts, type and strict
Effect diagnostics, unit and packed-process acceptance suites, writer crash and
concurrency integration, installed-tarball checks, and npm's publication dry
run. Exact-head Linux, macOS, and Windows proof is complete for `b06de25`. The
published tarball matches the locally verified artifact at SHA-1
`941b024b7c7c03523202143594cd5ccd547270d9` and SHA-256
`4a0adf25abb822c2af94236eafdea6f8774d447953f234a753ab8a13d53706c5`.

## Blockers

None. V0 release work is complete.

## Next Action

No V0 release action remains. Start a focused plan before pursuing a later
roadmap direction.
