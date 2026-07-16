# Phase 1: CLI Acceptance Suite

Status: complete.

This plan encodes the complete observable CLI contract before production
implementation. The [acceptance contract](../../cli/acceptance.md) is
authoritative for behavior; these fixtures provide executable evidence rather
than a second prose definition.

## Fixture Foundation

- [x] Add `fixtures/cli/case.schema.json` and `fixtures/cli/manifest.json`.
- [x] Model shell-free process invocation, isolated workspace staging,
  optional standard input, expected streams and exit code, and exhaustive
  filesystem state.
- [x] Support exact bytes, JSON Pointer equality, nonempty-string assertions,
  exact ordinary standard error, and structured JSON Lines matching.
- [x] Validate every referenced path and reject duplicate case identifiers
  without requiring a CLI executable.
- [x] Extend `scripts/check-docs.sh` with a focused integrity command that
  runs before package installation.

## Required Behavior Matrix

- [x] Cover `validate` by path and standard input, every aggregate status,
  snapshot match and mismatch, structural failures, invalid snapshots,
  malformed input, trailing content, duplicate members, unsafe scale, missing
  input, and usage.
- [x] Cover top-level and per-command help, representative `-h` aliases,
  rejected global version/completion built-ins, and command-local schema
  version selection.
- [x] Cover silent and enabled logging, thresholds, the `warning` alias,
  bounded failure context, and logging invariance.
- [x] Cover no-argument discovery and exact `guide`, `schema`, and `example`
  payloads, names, versions, outputs, missing parents, and overwrite refusal.
- [x] Cover `create` for path and standard input, calculation inconsistency,
  structural refusal, malformed input, usage, missing parents, existing
  outputs, and error precedence.
- [x] Use a conforming deliberately noncanonical candidate so exact-copy cases
  can detect reserialization rather than merely compare equivalent JSON.
- [x] Keep fault-only guarantees such as write-call order, commit races, and
  crash atomicity visible as retained Phase 2, 4, or 5 integration tests rather
  than pretending black-box fixtures can prove them.

## Descriptor Invariants

- Every case runs in a fresh workspace with fixed environment inputs and no
  shell parsing.
- JSON values ignore object member order and insignificant whitespace while
  preserving ordered arrays and exact field presence.
- Bundled schemas, examples, guide Markdown, and created document candidates
  use exact-byte comparisons.
- Filesystem expectations are exhaustive and exclude only the staged
  executable.
- Ordinary cases require empty standard error. Logging cases use exact or
  structural JSON Lines matchers without changing other outcomes.

## Gate

Every descriptor and referenced expected value validates without an
executable, and every observable process field and filesystem effect through
`fs create` is fixed.

## Validation Evidence

`./scripts/check-docs.sh` validates all 76 closed descriptors, their referenced
values and byte sources, ordered manifest coverage, unique selectors, JSON
Pointer exhaustiveness, log bounds, and complete workspace/home effects. The
suite covers every validation aggregate and failure layer, exact help and
installed guidance, deterministic discovery, all schema and example payloads,
and non-overwriting output behavior. Fourteen `create` cases fix exact
noncanonical path/stdin copies, calculation-inconsistent success, malformed
and structural refusals, usage precedence, missing parents, identical and
different existing outputs, and invalid-input/existing-output precedence.
Phase 2 retains boundary-order tests; Phases 4–5 retain writer fault, race, and
crash-atomicity tests that black-box fixtures cannot prove.
