# Phase 3: Complete Semantic Validation

Status: not started; blocked on Phase 2.

This plan completes the pure semantic pipeline required by the
[semantic specification](../../semantic-spec.md) and its language-neutral
fixtures. It turns the Phase 2 fail-closed path into a complete validator.

## Structural Semantics

- [ ] Validate identifiers, uniqueness, references, Gregorian dates, and
  period definitions.
- [ ] Validate fact coordinates, dimensions, units, and duplicates.
- [ ] Validate statement axes and presentation references.
- [ ] Validate rule scopes, assertion coordinates, roll-forward constraints,
  and unit invariants.
- [ ] Validate embedded snapshot structure and application-key uniqueness.
- [ ] Produce deterministic structural diagnostics ordered by path then code.

## Calculation and Snapshot Semantics

- [ ] Implement one exact-decimal boundary for parsing, arithmetic,
  comparison, and formatting. Use Effect `BigDecimal` only if it passes every
  fixture; otherwise use a private `BigInt`-backed representation.
- [ ] Implement tolerances, rule binding, application skips, and evaluation
  errors with deterministic precedence and ordering.
- [ ] Derive every aggregate calculation status without evaluating
  structurally nonconforming input.
- [ ] Implement snapshot match, mismatch, additions, changes, removals, and
  `not-comparable` for invalid snapshots.
- [ ] Encode the complete validation envelope and contextual help.

## Gate

Every valid document and example conforms, every invalid fixture fails at its
expected layer and path, every expected result matches, and all validation
acceptance cases pass for path and standard input.

## Validation Evidence

Language-neutral fixtures exist, but no validator or implementation test suite
exists.
