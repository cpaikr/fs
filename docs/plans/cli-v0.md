# V0 CLI Delivery Plan

Status: active design-to-implementation handoff. No package, executable,
build, or CLI acceptance fixture suite exists yet.

This plan owns mutable implementation state, phase gates, validation, blockers,
and the next action. The [CLI design](../cli/design.md) owns command intent, the
[CLI acceptance contract](../cli/acceptance.md) owns observable process
behavior, and the [roadmap](../../ROADMAP.md) owns strategic sequence.

## Objective

Deliver a deterministic, non-interactive reference CLI that:

- discovers the FS contract through help, guidance, schemas, and examples;
- fully validates FS documents from a path or standard input;
- reports conformance, calculations, and snapshot comparison separately; and
- atomically creates an exact-byte copy of a structurally conforming candidate
  without overwriting an existing path.

The first implementation milestone ends with `fs create`. Agent Skill
generation, snapshot recording, rendering, and public release follow as
separate gated phases.

## Current State

Completed baselines:

- [x] Product boundary and normative V0 semantic specification.
- [x] Initial document and result schemas.
- [x] Valid, invalid, calculation-result, and snapshot-diff fixture sets.
- [x] Authoring guidance and representative examples.
- [x] CLI command design and deterministic acceptance protocol.
- [x] Public `@cpai/fs` package identity and TypeScript, Node.js, Effect, npm,
  and pnpm delivery direction.

The schema and fixture baselines are not the final aligned contract. Phase 0
tracks the known numeric-scale and invalid-snapshot gaps.

Missing foundations:

- [ ] Remaining contract decisions encoded in schemas, fixtures, help, and
  generated guidance assets.
- [ ] Exact candidate Effect package source and public integration seam
  inspected, with uncertain behavior assigned to retained tests.
- [ ] CLI fixture schema, manifest, cases, and integrity check.
- [ ] TypeScript source, dependency lock, build, tests, CI, and packed package.
- [ ] Every CLI command implementation.

## Selected Delivery Constraints

- Use strict TypeScript with ESM and `NodeNext` semantics on maintained Node.js
  LTS majors beginning with Node 22.
- Use Effect 4, `effect/unstable/cli`, and `@effect/platform-node`. Pin the
  coordinated prerelease packages exactly and upgrade them as one tested set.
- Publish `@cpai/fs` with executable `fs`. Use pinned
  `npx -y @cpai/fs@<version>` commands for zero-global-install Agent Skill
  guidance. pnpm is repository tooling only; Bun is not required.
- Put a narrow public-API adapter around the command framework. It owns exact
  help, accepted built-ins, buffered output, tagged-error translation, and
  suppression of raw causes and stack traces.
- Use Effect logging for structured decision events. It is silent by default;
  enabled output is deterministic, bounded JSON Lines on standard error.
- Application modules do not write through the global console. The process
  adapter owns accepted output, and the custom logger owns diagnostics.
- Keep semantic validation and arithmetic pure. Use services at actual I/O and
  packaged-asset boundaries.
- Validate bundled Draft 2020-12 schemas with Ajv. Reject duplicate JSON
  members and unsafe numeric lexemes before schema validation.
- Effect Schema may model internal outcomes where it removes duplication, but
  the published JSON Schemas remain the sole artifact shape contract.
- Keep exact decimal parsing, arithmetic, comparison, and formatting behind one
  boundary. Use Effect `BigDecimal` only if it passes every fixture; otherwise
  use a private `BigInt`-backed representation.
- Package schemas, examples, and generated guidance from one owned asset
  boundary and verify their exact bytes in the packed package.
- Support Linux, macOS, and Windows on each Node.js LTS major declared by the
  package.

## Phase Overview

- Phase 0 closes contract gaps and inspects the Effect boundary.
- Phase 1 encodes the complete CLI acceptance suite.
- Phase 2 scaffolds the package and a fail-closed thin validation path.
- Phase 3 completes semantic validation, calculations, and snapshot diffs.
- Phase 4 adds discovery and bundled content commands.
- Phase 5 adds atomic `create`.
- Phase 6 generates agent guidance from one source.
- Phase 7 adds snapshot recording and rendering.
- Phase 8 completes release readiness.

Production implementation begins only after Phases 0 and 1. A partial
validator is never a releasable conformance command.

## Phase 0: Close Contracts and Inspect Effect

### Contract artifacts

- [x] Confirm invalid-snapshot, example-output, portable-guide, help,
  duplicate-member, and numeric-scale decisions.
- [ ] Add `not-comparable` and `invalid-snapshot` to the snapshot-diff schema.
- [ ] Add the expected invalid-snapshot result and pair it with
  `duplicate-snapshot-application-key.json`.
- [ ] Update the fixture guide for the invalid-snapshot result.
- [ ] Add inclusive safe-integer bounds to `unit.scale` in the document schema.
- [ ] Add scale boundary and out-of-range language-neutral fixtures.
- [ ] Define one portable authoring source and byte-stable installed-CLI and
  pinned-`npx` targets.
- [ ] Define exact top-level and per-command help Markdown.
- [ ] Add malformed and duplicate-member raw input outside the document
  manifest.

### Effect boundary

- [ ] Select exact coordinated Effect CLI, runtime, platform, logging, language
  service, and test package versions.
- [ ] Inspect their source, declarations, exports, and relevant upstream tests.
- [ ] Inspect `Command.runWith`, `CliOutput`, `CliError`, console services, and
  logger replacement as the initial public adapter candidates.
- [ ] Establish a public seam for command grammar, built-in gating, help,
  usage-error translation, stream ownership, runtime error suppression, and
  logger replacement without internal imports or parser duplication.
- [ ] Record inspected versions, source references, constraints, rejected
  approaches, and a retained production test for every source-opaque claim.
- [ ] Revise the dependency or runner choice if the accepted contract requires
  internal imports or recreated parsing.

Gate: every V0 artifact result is representable by aligned contracts and a
documented public Effect integration seam is viable. No throwaway executable is
needed.

## Phase 1: Build the Acceptance Suite

### Fixture foundation

- [ ] Add `fixtures/cli/case.schema.json` and `fixtures/cli/manifest.json`.
- [ ] Describe a shell-free process invocation, isolated workspace, optional
  standard input, output matchers, exit code, and exhaustive filesystem state.
- [ ] Support exact bytes, JSON Pointer equality, nonempty-string checks, exact
  ordinary stderr, and structured JSON Lines matching.
- [ ] Validate every reference and reject duplicate case identifiers without a
  CLI executable.

### Required behavior

- [ ] Cover `fs validate` for path and standard input, every aggregate status,
  snapshot match and mismatch, structural failures, invalid snapshots,
  malformed input, duplicate members, unsafe scale, missing input, and usage.
- [ ] Cover top-level and per-command help, representative `-h` aliases,
  rejected global version and completions, and command-local schema version.
- [ ] Cover silent and enabled logging, thresholds, the `warning` alias,
  bounded failure context, and logging invariance.
- [ ] Cover no-argument discovery and exact `guide`, `schema`, and `example`
  payloads, names, versions, outputs, missing parents, and overwrite refusal.
- [ ] Cover `create` for path and standard input, inconsistent calculations,
  structural refusal, malformed input, usage, missing parents, existing
  outputs, and error precedence.

Gate: every descriptor and referenced expected value validates without an
executable, and every observable field and filesystem effect is fixed.

## Phase 2: Scaffold and Fail-Closed Validation

### Package foundation

- [ ] Add `package.json`, an exact pnpm lock, strict TypeScript configuration,
  and explicit `type`, `bin`, `engines`, `packageManager`, and published files.
- [ ] Pin the inspected Effect stack, TypeScript, Ajv, parser, test tools,
  Effect language service, and `@effect/vitest` without install scripts.
- [ ] Separate command model, process adapter, logger, decoding, validation,
  result encoding, exact decimals, and packaged assets into focused modules.
- [ ] Add type-check, build, unit, fixture-integrity, acceptance, pack, and
  local npm/npx smoke commands.
- [ ] Compare bundled and unbundled ESM using retained package-size, cold local
  `npx`, and warm-startup measurements; keep one production layout.
- [ ] Start Linux, macOS, and Windows CI across declared Node.js LTS majors.

### Thin validation path

- [ ] Validate command grammar before reading input or touching output paths.
- [ ] Translate expected failures to tagged outcomes and unexpected defects to
  bounded `internal-error` output before
  `NodeRuntime.runMain({ disableErrorReporting: true })`.
- [ ] Read exact path or standard-input bytes once and decode UTF-8 fatally.
- [ ] Reject malformed syntax, trailing content, duplicate members, and unsafe
  numeric lexemes before JSON Schema validation.
- [ ] Evaluate `lossless-json` only if it preserves numeric lexemes, rejects
  duplicate members, and presents a narrow typed conversion boundary.
- [ ] Resolve bundled schemas offline and normalize Ajv diagnostics to stable
  codes and JSON Pointer paths.
- [ ] Retain adapter, logger, parsing, schema, package, asset, and I/O-order
  tests against the production entry point.
- [ ] Keep schema-valid input internal or fail it closed until Phase 3.

Gate: packed-process usage, parsing, schema-failure, adapter, logging, package,
and asset tests pass. No input can receive a false conformance success.

## Phase 3: Complete Validation

Implement deterministic pure stages for:

- [ ] identifiers, uniqueness, references, dates, and period definitions;
- [ ] fact coordinates, dimensions, units, and duplicate detection;
- [ ] statement axes and presentation references;
- [ ] rule scopes, assertions, roll-forwards, and unit invariants;
- [ ] validation snapshot structure and application-key uniqueness;
- [ ] exact arithmetic, tolerances, rule binding, skips, and errors;
- [ ] deterministic application and diagnostic ordering;
- [ ] snapshot match, mismatch, additions, changes, removals, and
  `not-comparable`; and
- [ ] the complete validation envelope and contextual help.

Gate: every valid document and example conforms, every invalid fixture fails at
its expected layer and path, every expected result matches, and all validation
acceptance cases pass for path and standard input.

## Phase 4: Discovery and Bundled Content

- [ ] Implement deterministic no-argument discovery without directory scans.
- [ ] Implement exact help and installed-CLI authoring guidance.
- [ ] Add one atomic no-replace writer shared by every output command.
- [ ] Implement all schema and example lookups with exact-byte output.
- [ ] Reject unknown names, versions, arguments, flags, and unnamed output.
- [ ] Verify generated guidance and packaged assets are current in CI.
- [ ] Add platform fault tests for the shared writer.

Gate: discovery, help, guide, schema, and example cases pass offline against the
packed executable, including write refusal and fault tests.

## Phase 5: Atomic Creation

- [ ] Buffer candidate bytes once, fully validate them, and write those bytes
  only when structurally conforming.
- [ ] Check an existing destination before validation and enforce no-overwrite
  again at commit time.
- [ ] Reuse the shared writer for path and standard-input cases.
- [ ] Test inconsistent calculations, structural refusal, identical and
  different existing files, races, and interrupted writes.

Gate: all `create` acceptance and fault-injection tests pass on supported
platforms without overwrite or observable partial output.

## Phase 6: Agent Guidance

- [ ] Generate the installable Agent Skill from the same maintained source as
  `fs guide authoring`.
- [ ] Exclude repository-only and live-state content.
- [ ] Render CLI commands as `fs` and Skill commands with the pinned
  `npx -y @cpai/fs@<version>` prefix.
- [ ] Fail CI when either generated target is stale.

Gate: generation is reproducible and byte-stable, and the two targets cannot
drift semantically.

## Phase 7: Remaining Commands

- [ ] Define acceptance fixtures before implementing `record-validation`.
- [ ] Implement deterministic snapshot replacement, structural refusal, and
  no-overwrite through the shared writer.
- [ ] Define acceptance fixtures before implementing `render`.
- [ ] Implement presentation-only HTML output through the shared writer.

Gate: each command passes its complete process, output, filesystem, and fault
suite before it is considered implemented.

## Phase 8: Release Readiness

- [ ] Replace placeholder schema identifiers with immutable public URLs.
- [ ] Decide whether V0 permits an optional constant `$schema` pointer.
- [ ] Verify product, package, executable, and release names.
- [ ] Run unit, conformance, acceptance, fault, generated-file, and package
  checks across supported platforms and Node.js LTS majors.
- [ ] Publish the npm package with provenance and smoke-test pinned `npx` and
  global installation.
- [ ] Publish concise installation and non-interactive usage documentation.

Gate: a clean checkout reproduces every generated asset, test, and package;
the installed packed CLI passes offline smoke cases, and registry installation
passes separately with network access.

## Progress Rules

- Update `Current State`, checkboxes, validation, blockers, and the next action
  in place.
- Keep only current evidence; do not append session transcripts or raw output.
- Do not mark a phase complete until its gate passes.
- Run the repository review workflow after each reviewable slice. Use an
  independent reviewer for shared contracts, semantic validation, arithmetic,
  snapshots, cross-platform writes, and generated agent guidance.

## Current Validation

Run `./scripts/check-docs.sh` from the repository root. It checks Markdown,
local links, JSON parsing, fixture-manifest shape and coverage, valid-document
schema conformance, invalid-fixture schema classification, and expected-result
schemas.

The current documentation and artifact tree passes that check.

Implementation, acceptance, package, and cross-platform checks remain
unavailable because their source and harnesses do not exist.

## Current Blockers

- The document schema does not yet enforce the normative safe-integer
  `unit.scale` range, and boundary fixtures are missing.
- The snapshot-diff schema and fixtures do not yet represent normative
  `not-comparable` / `invalid-snapshot` output.
- Exact candidate Effect source and public exports have not been inspected.
- CLI acceptance descriptors and their integrity check do not exist.

## Next Action

Finish Phase 0 in two lanes: align the remaining schemas, fixtures, help, and
generated-guidance contract; and inspect exact candidate Effect package source
and public exports. Record a viable public seam and assign every source-opaque
claim to a retained Phase 2 test. Then build the Phase 1 acceptance suite
before production implementation.
