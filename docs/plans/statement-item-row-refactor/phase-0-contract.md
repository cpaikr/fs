# Phase 0: Target Contract

This phase turns the accepted direction in
[ADR 0001](../../adr/0001-replace-dimensional-members-with-item-grouping.md)
into a complete normative contract before machine-readable artifacts or
runtime code change. The [plan index](../statement-item-row-refactor.md) owns
live state and the next action.

## Entry Contract

The row shape, nested maps, grouping semantics, mixed item units, and additive
rollup behavior are fixed. This phase must not reopen dimensions, shared facts,
general formulas, reusable taxonomies, or a second serialization.

## Decisions to Close

1. Choose the artifact `formatVersion` and result/snapshot version literals.
   Because V0 is unreleased, prefer one replacement contract rather than a
   compatibility version unless an external consumer is identified.
2. Define the exact serialized error application for a missing or unavailable
   rollup cell, including reason names and a cell identity based on statement,
   item, and period.
3. Define exact mixed-unit HTML behavior. A renderer must identify each row's
   unit when a statement is heterogeneous and may collapse a common unit only
   under a deterministic rule.
4. Decide whether custom groupings appear in HTML or remain data-only. They
   must never acquire implicit arithmetic or hierarchy either way.
5. Preserve the independently accepted limits and error contract from
   [ADR 0002](../../adr/0002-bound-render-output.md), and define their exact
   precedence relative to any new row-model rendering failures.

## Normative Rewrite

- Rewrite `docs/semantic-spec.md` around document metadata, unit and period
  definitions, statements, item rows, nested cell maps, grouping declarations,
  rollups, results, snapshots, diagnostics, and deterministic ordering.
- Rewrite `docs/authoring.md` from the current define-facts/add-presentation
  workflow to direct statement-item authoring.
- Update `docs/cli/design.md` only where validation, snapshots, bundled
  examples, or rendering meaning changes; preserve command grammar and writer
  safety unless a concrete contract dependency requires otherwise.
- Update `docs/cli/acceptance.md` with exact result objects, error precedence,
  rendered HTML, and required cases.
- Reconcile `docs/product-scope.md` and `docs/glossary.md` with the final
  normative wording without duplicating the specification.

## Required Semantic Detail

- Complete closed JSON grammar, including the accepted rule that
  `groupingColumns` may be omitted when unused while every item still carries
  an empty `groupings` map.
- Statement-local item identity and deterministic statement/item/period order.
- Exact `values` keys versus statement periods and exact `groupings` keys
  versus `groupingColumns`.
- Decimal, missing, unavailable, and zero states.
- Rollup reference, acyclicity, direct-child, stored-sign, unit, tolerance,
  error, and consistency rules.
- Application ordering and stable key `{statement, parent, period}`.
- Complete structural diagnostic codes and JSON Pointer paths.
- Snapshot validity and diff behavior after removing `not-evaluated`, skipped
  applications, rule identifiers, and dimensional coordinates.

## Gate

- No unresolved semantic placeholder remains in an owning contract.
- Every target behavior has one owner and every affected CLI result is exact.
- Completed historical plans remain unchanged.
- `./scripts/check-docs.sh` and `git diff --check` pass for the contract slice,
  or the plan index records any deliberate contract/artifact drift that cannot
  close until Phase 1.
