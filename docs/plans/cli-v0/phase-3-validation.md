# Phase 3: Complete Semantic Validation

Status: complete.

This plan completes the pure semantic pipeline required by the
[semantic specification](../../semantic-spec.md) and its language-neutral
fixtures. It turns the Phase 2 fail-closed path into a complete validator.

## Structural Semantics

- [x] Validate identifiers, uniqueness, references, Gregorian dates, and
  period definitions.
- [x] Validate fact coordinates, dimensions, units, and duplicates.
- [x] Validate statement axes and presentation references.
- [x] Validate rule scopes, assertion coordinates, roll-forward constraints,
  and unit invariants.
- [x] Validate embedded snapshot structure and application-key uniqueness.
- [x] Produce deterministic structural diagnostics ordered by path then code.

## Calculation and Snapshot Semantics

- [x] Implement one exact-decimal boundary for parsing, arithmetic,
  comparison, and formatting. Use Effect `BigDecimal` only if it passes every
  fixture; otherwise use a private `BigInt`-backed representation.
- [x] Implement tolerances, rule binding, application skips, and evaluation
  errors with deterministic precedence and ordering.
- [x] Derive every aggregate calculation status without evaluating
  structurally nonconforming input.
- [x] Implement snapshot match, mismatch, additions, changes, removals, and
  `not-comparable` for invalid snapshots.
- [x] Encode the complete validation envelope and contextual help.

## Gate

Every valid document and example conforms, every invalid fixture fails at its
expected layer and path, every expected result matches, and all validation
acceptance cases pass for path and standard input.

## Validation Evidence

The pure suite matches every valid document, named schema/semantic failure,
calculation result, and snapshot diff. Additional tests retain complete
diagnostic ordering, malformed snapshot handling, numeric-lexeme limits,
exact decimal operations, and Gregorian early-year/leap-century binding. All
25 packed validation and logging cases pass from the installed tarball.
