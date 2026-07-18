# V0 Release Candidate Plan

Status: Verified candidate. Phases 0–4 are complete on `dev`. The repository
remains private and the CLI-only package unpublished while separate Phase 5
release authorization is absent.

This plan owns live Roadmap step-11 state, decisions, validation, blockers,
and the next action. The [semantic specification](../semantic-spec.md) owns
artifact meaning, the [CLI design](../cli/design.md) owns command intent, the
[CLI acceptance contract](../cli/acceptance.md) owns observable process
behavior, and the [roadmap](../../ROADMAP.md) owns strategic sequence.
Completed plans are historical delivery evidence, not current status.

## Milestone

Prepare `@cpai/fs@0.1.0` as a robust CLI-only V0 release for untrusted and
agent-generated input. Close the review findings, deepen the implementation
where its interfaces permit invalid states or leak boundary concerns, and
prove the exact packed candidate on every supported runtime.

Keep candidate remediation separate from release. The source repository stays
private while remediation is in progress. A separately authorized release
workflow will promote the verified candidate, make the repository public
immediately before npm publication, verify anonymous access, and only then
publish, tag, or create a GitHub release.

## Fixed Decisions

### Existing V0 contract

- The npm identity is `@cpai/fs`; V0 uses package version `0.1.0` and artifact
  `formatVersion: "0.1"`.
- V0 uses Apache-2.0.
- The immutable V0 schema base is
  `https://cpaikr.github.io/fs/schema/0.1/`. The document,
  validation-result, and snapshot-diff schemas have canonical `$id` values
  under that base.
- An optional document `$schema`, when present, is exactly the document schema
  URL. Validation remains offline against bundled schemas and semantic rules.
- Published schema bytes must match the repository schemas. An incompatible
  change requires a new versioned path.
- The public specification is
  `https://cpaikr.github.io/fs/spec/0.1/`; package-facing guidance must not
  require access to a private source repository.
- Supported runtime proof covers every declared Node.js line on Linux, macOS,
  and Windows, followed by an npm publication dry run.

### Confirmed remediation policy

- The public CLI treats input as untrusted. Resource use and failures must be
  bounded, deterministic, and redacted for agent-generated and external
  documents.
- Resource limits are operational CLI policy, not artifact conformance rules.
  Exceeding a CLI limit produces an explicit stable operational result; it
  does not make the FS document semantically nonconforming.
- V0 is CLI-only. Package exports must seal implementation modules rather than
  create an accidental JavaScript or TypeScript library contract.
- Help, version, completions, and discovery do not depend on a valid current
  working directory. Path-dependent commands translate an unavailable working
  directory into a stable operational result.
- Required documentation executables belong in the lockfile and run from a
  frozen, lifecycle-disabled installation. Required CI does not download fresh
  executable packages through `npx`.
- The unpublished `0.1` CLI contract, error vocabulary, executable fixtures,
  and implementation may be revised directly. Artifact-format changes are not
  implied by the operational limit policy. Do not add legacy readers, aliases,
  deprecated paths, dual behavior, or compatibility layers.
- All justified internal hardening in this plan lands before V0. Retain the
  current Node platform package unless a smaller adapter proves simpler and
  equally reliable across signals, streams, terminals, exit codes, and every
  supported platform.
- Keep `cpaikr/fs` private through remediation. During the authorized release
  workflow, make it public immediately before npm publication and verify the
  package's repository metadata through anonymous access.
- Deliver the Phase 0 contract and executable descriptors before their runtime
  implementation as separate commits in one Phases 0–2 boundary-remediation
  PR. Required CI executes every descriptor, so a contract-only PR cannot be a
  green integration checkpoint. The PR preserves phase order internally and
  no Phase 3 work begins before it is reviewed and merged into updated `dev`.

## Delivered Candidate

- The semantic contract, schemas, examples, fixtures, generated guidance,
  validator, snapshot workflow, renderer, atomic writer, and CLI are
  implemented and aligned.
- Versioned schemas and the semantic specification are deployed at their
  public HTTPS URLs. The deployed schemas were verified byte-for-byte against
  the repository and their cross-schema references were validated.
- Package metadata, licensing, exact packed-package verification, installed
  CLI smoke coverage, cross-platform CI, and npm publication dry-run coverage
  are present.
- The schema-publication, release-candidate, and remediation pull requests were
  merged into `dev` with commit preservation. Phase 4 was integrated by PR #14
  as merge commit `8d5f617`; exact push run `29639266777` passed every required
  gate on that integrated commit.
- As verified on 2026-07-18, `cpaikr/fs` is private with `main` as its default
  branch, no tag or GitHub release exists, and npm does not have
  `@cpai/fs@0.1.0`.

Roadmap step 11 remains open because a verified candidate is not a release.

## Review Follow-up Delivered

The review applied these contract-preserving safe fixes:

- Snapshot diagnostics classify only `/validationSnapshot` and its descendants
  as an invalid embedded snapshot. An unrelated property sharing that prefix
  retains normal snapshot comparison, with unit and packed-process coverage.
- Unused decimal multiplication, an unused result alias, and an unused test
  dependency were removed.
- Required GitHub Action revisions were pinned to already-audited commits.
- Package-facing README routes no longer point public readers to repository-only
  files.
- Repository documentation was reconciled around this plan as the sole owner
  of live release status.

## Remediation Plan

The integration checkpoints are sequential. Phase 0 contract commits precede
the Phase 1–2 implementation in their combined checkpoint. Each checkpoint
passes focused validation, receives code review, and is merged into updated
`dev` before the next checkpoint begins. No compatibility slice or parallel
old path is permitted.

### Phase 0: Fix the operational contract

Status: Complete on `dev` through PR #12.

- Define bounded input behavior in the CLI design and acceptance contract.
  Select byte, nesting, and computational limits from representative artifacts,
  adversarial measurements, and supported-runtime evidence rather than
  arbitrary convenience values.
- Add explicit stable and redacted result codes for resource-limit and
  working-directory failures. Fix their stream roles, exit codes, logging
  context, help, filesystem effects, and precedence against parsing,
  validation, output preflight, and writer failures.
- Specify that native actions and discovery complete without application path
  context. Only path-dependent operations may acquire a working directory.
- Specify the CLI-only package boundary: supported entry points are the
  executable, packaged assets exposed through commands, and deliberately
  allowed package metadata—not deep implementation imports.
- Update executable descriptors before implementation. Replace the current
  unpublished behavior in place without aliases or fallback envelopes.

### Phase 1: Bound parsing and exact arithmetic

Status: Complete on `dev` through PR #12.

- Replace recursive JSON descent with an iterative duplicate-aware scanner
  that retains UTF-8, trailing-content, duplicate-member, numeric-precision,
  and syntax guarantees while enforcing the confirmed operational limits.
- Bound both file and standard-input reads so excessive input is stopped at
  the boundary rather than fully accumulated before rejection.
- Redact unexpected scanner and runtime failures; only stable owned messages
  may reach the operation result.
- Normalize exact decimals without per-zero large-integer division. Aggregate
  rollup children without repeatedly rescaling an accumulator according to
  author order.
- Add adversarial cancellation, high-scale ordering, excessive-input, nesting,
  and stable-error regressions. Equivalent valid child order must not
  materially change calculation cost or results.

### Phase 2: Deepen application boundaries

Status: Complete on `dev` through PR #12.

- Parse native actions and discovery without constructing application I/O.
  Acquire the current directory lazily for path-dependent operations and keep
  a true outer defect boundary around service construction and execution.
- Load command implementation and compile the AJV document validator only when
  a document operation requires them. Measure help and version startup before
  and after the change.
- Model calculation and validation outcomes as discriminated unions whose
  status fixes the permitted applications. Carry the validated `Document` on
  conforming branches so consumers do not cast or rebuild proof.
- Return typed input and output failures through orchestration. Encode once at
  the process edge; logging must not parse serialized standard output.
- Assess a smaller Node adapter with installed size, startup, and full behavior
  evidence. Change dependencies only if the alternative is both simpler and
  equally reliable; otherwise record retention of the tested platform layer.

### Phase 3: Seal packaging and hermeticize required gates

Status: Complete on `dev` through PR #13.

- Add an `exports` allowlist for the CLI-only package and an installed-tarball
  negative test proving implementation deep imports are unavailable.
- Keep exact tarball inventory, retained asset bytes, native help, document
  operations, and package metadata under installed-package smoke coverage.
- Add documentation tools as exact development dependencies, update the
  lockfile, replace `npx` execution with `pnpm exec`, and make the documentation
  CI job use the same frozen, lifecycle-disabled installation boundary as
  other required jobs.
- Keep GitHub Actions SHA-pinned and production dependency auditing explicit.

### Phase 4: Prove the remediated candidate

Status: Complete on `dev` through PR #14.

- Run focused contract, parser, decimal, startup, process, package-boundary,
  and documentation tests for every changed seam.
- Run `pnpm release:check`, the production dependency audit, and
  `git diff --check` on the integrated candidate.
- Run the complete supported OS and Node.js matrix, followed by its dependent
  npm publication dry run on the exact candidate head.
- Perform independent implementation, design, complexity, security, package,
  and documentation review. Close every material finding or record a new
  explicit owner decision in this plan.

### Phase 5: Release handoff

- Keep the verified candidate unchanged while release authorization is sought.
- In the authorized release workflow, promote the verified candidate with
  commit preservation, make `cpaikr/fs` public, and verify anonymous source,
  license, issue, homepage, and package-repository routes.
- Publish the exact verified tarball only after repository visibility succeeds.
  Tagging, the GitHub release, and Roadmap completion follow successful npm
  publication; none are candidate-remediation actions.

## Known Temporary Drift

No known artifact-format, operational-contract, package-boundary, or shipped-
documentation drift remains in the candidate. Phase 4 closed the pathless
asset defect, structural-diagnostic amplification, snapshot-decimal budget
bypass, and repository-only shipped-document routes with focused executable
regressions.

The preserved review follow-up was merged to `dev` by PR #11 as merge commit
`6741e34`. The ordered Phase 0 contract and Phase 1–2 implementation commits
were merged by PR #12 as merge commit `8b15542` after the complete required
matrix, dependent npm dry run, and independent reviews reported no remaining
material finding.

The package-sealing and hermetic-gate checkpoint was merged by PR #13 as merge
commit `4f4fef7`. Exact push run `29638095553` passed the complete OS and Node.js
matrix, documentation, production audit, and dependent npm dry run on that
integrated commit.

The final-proof checkpoint was merged by PR #14 as merge commit `8d5f617`.
Exact push run `29639266777` passed the complete Linux, macOS, and Windows
matrix on Node.js 22.17.0 and 24.15.0, documentation, production audit, and the
dependent npm publication dry run on that integrated commit.

## Validation

The merged candidate passed the full repository and release-candidate gates,
including documentation, type checking, strict Effect diagnostics, unit and
boundary tests, packed-process acceptance, writer crash and concurrency
integration, installed-tarball smoke, the supported OS/Node matrix, and npm's
publication dry run.

The integrated review follow-up passes `pnpm release:check`: documentation and
contract artifacts, type checking, strict Effect diagnostics, unit and
boundary tests, packed-process acceptance, writer crash and concurrency
integration, installed-tarball smoke, and npm's publication dry run. The
production dependency audit reports no known vulnerability, and
`git diff --check` passes. Independent final-diff review found and closed one
package-README routing issue, then reported no remaining material finding.

The bounded-CLI checkpoint passes type checking, strict Effect diagnostics,
unit and adversarial boundary tests, packed-process acceptance, writer crash
and concurrency integration, and installed-tarball verification. Exact and
first-excess cases cover byte, nesting, value, and decimal budgets; unavailable
working-directory cases cover native actions, discovery, bundled content,
standard input, absolute paths, and relative-path failure. The complete
`pnpm release:check` gate and npm publication dry run pass on the checkpoint;
the production dependency audit reports no known vulnerability, and
`git diff --check` passes.

Independent implementation review found two boundary errors: invalid syntax
at the exact JSON-value ceiling could be mislabeled as a limit failure, and the
executable still provisioned application I/O for pathless invocations. Both
were corrected with focused regressions; rereview reported no remaining
material finding.

The smaller Node adapter assessment selected
`@effect/platform-node-shared`: it exposes the same filesystem, path, stdio,
terminal, child-process, and signal runtime implementations used by the prior
aggregate package while removing the unused Redis peer dependency. A clean
installed candidate fell from about 111 MiB to 60 MiB. Repeated process startup
measurements improved from roughly 400 ms on Node.js 22 and 370 ms on Node.js
24 to roughly 200 ms on both supported lines for native help and version.

The Phase 3 checkpoint passes the complete `pnpm release:check` gate on Node.js
24.15.0 and the installed-tarball package-boundary check on both supported
Node.js lines. Its lockfile-backed documentation gate and frozen,
lifecycle-disabled install pass; the explicit production dependency audit
reports no known vulnerability, and `git diff --check` passes. Independent
review found one ambiguous drift statement, which was corrected before the
exact cross-platform integration proof passed.

The Phase 4 checkpoint passes `pnpm release:check` on Node.js 24.15.0,
installed-tarball checks on both supported Node.js lines, the production audit,
and `git diff --check`. Independent implementation, design, complexity,
security, package, and documentation review found broken shipped-document
routes, an escaping pathless asset defect, schema and semantic diagnostic
amplification, and a snapshot-decimal path around the intended budgets. Each
finding is fixed with focused exact-boundary or installed-package evidence;
rereview reports no material residual finding. A measured 50,000-item invalid
input now returns a 202-byte stable refusal in about 0.3 seconds instead of
roughly 31 MiB in 11.7 seconds, while maintained large conforming input remains
accepted. Exact integrated-commit cross-platform CI and the dependent npm dry
run provide the integration proof.

## Blockers

No product decision is blocked. Release actions remain intentionally blocked
until a separate Phase 5 action is authorized.

## Next Action

Keep the exact verified candidate unchanged and stop before Phase 5 while
release authorization remains absent. A later authorized release workflow may
promote this candidate without modifying it.
