# Phase 3: Rollups, Results, and Snapshots

This phase replaces general calculations and dimensional application identity
with direct additive rollups. It continues the atomic runtime cutover in the
[plan index](../statement-item-row-refactor.md).

## Calculation Module

- Rewrite `src/validation/calculate.ts` to discover direct children from each
  statement's `rollupTo` references.
- Evaluate one application for each parent with direct children and each
  period selected by the statement.
- Compare the explicit reported parent against the sum of direct child values
  using stored signs, coefficient one, and the unit's default tolerance.
- Return missing or unavailable cell errors using the exact Phase-0 payload.
- Order applications by statement order, parent item order, and period order;
  order failing cells parent-first and then child item order.
- Produce only `not-defined`, `consistent`, or `inconsistent` after structural
  conformance. Remove skipped, `not-evaluated`, boundary-period, assertion, and
  roll-forward paths.

Keep `src/validation/decimal.ts` as the exact arithmetic module unless a failing
target case proves it insufficient.

## Snapshot Modules

- Rewrite `src/validation/snapshot.ts` for
  `{statement, parent, period}` application keys and the reduced statuses.
- Preserve deterministic added, removed, changed, and unchanged diff ordering.
- Update `src/record-validation.ts` to record the new result while preserving
  replacement of an existing snapshot, input immutability, and writer safety.
- Update artifact-sensitive orchestration in `src/process.ts`; do not change
  unrelated process, logging, or filesystem precedence.

## Tests

- Passing, failing, and tolerance-boundary direct subtotals.
- Multi-level rollups proving direct children are counted exactly once.
- Mixed-unit statements with valid same-unit rollup edges.
- Missing and unavailable parent and child values with deterministic first
  failure.
- No-rollup documents and structural-failure `not-run` behavior.
- Snapshot match, mismatch, invalid snapshot, application addition/removal,
  and record-then-revalidate behavior.
- Exact record-validation bytes match the shared expected documents established
  in Phase 1; do not add unit-local copies of those outputs.

## Gate

- Targeted calculation, snapshot, validation, process, and
  record-validation tests pass against the Phase-1 fixtures.
- Recorded documents exactly match the Phase-1 expected bytes and revalidate as
  snapshot matches.
- Result and snapshot outputs exactly match the published schemas.
- No general calculation-rule type, evaluator, fixture, or result status
  remains outside historical documentation.
