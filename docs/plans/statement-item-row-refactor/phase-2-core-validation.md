# Phase 2: Document Model and Structural Validation

This phase replaces the in-process document model and structural validator.
It begins the atomic runtime cutover described by the
[plan index](../statement-item-row-refactor.md); it is not an independently
mergeable compatibility stage.

## Module Interface

Keep `validateDocument(value)` in `src/validation/validate.ts` as the external
validation interface. Replace the implementation behind it so callers do not
coordinate schema parsing, semantic registries, rollup graphs, or snapshot
checks themselves.

Do not add a legacy `Document`, V0-to-row transformer, dual validator, schema
switch, or feature flag. The repository is unreleased and the accepted change
is replacement-only.

## Implementation

- Replace `src/validation/model.ts` with the accepted document, item-cell,
  rollup-result, and snapshot types.
- Update `src/validation/schema.ts` only as needed for the new schemas and
  deterministic public diagnostic normalization.
- Rewrite `src/validation/semantic.ts` around statement-local item registries
  and nested-map invariants.
- Replace coordinate identity in `src/validation/identity.ts` with the accepted
  rollup application identity. Retain deterministic diagnostic comparison.
- Adapt `src/validation/validate.ts` to the chosen format and result versions
  while preserving schema-before-semantic-before-calculation ordering.

## Structural Invariants

- Unique document-wide unit, period, and statement identifiers.
- Unique, syntactically valid document-level `groupingColumns` identifiers.
- Real Gregorian dates, valid durations, and no duplicate period definitions.
- Unique item identifiers within each statement.
- Resolved, duplicate-free statement period references.
- `values` keys exactly equal the containing statement's periods.
- `groupings` keys exactly equal `groupingColumns`.
- Resolved item units and valid value/grouping cell states.
- Resolved non-self `rollupTo` references within the same statement, an acyclic
  rollup graph, and exact unit equality on every rollup edge.
- Valid and uniquely keyed embedded snapshots under the new application shape.

## Tests

- Replace schema and semantic tests with observable cases at the
  `validateDocument` interface whenever possible.
- Prove that duplicate item identifiers fail within one statement but the same
  identifier may be reused, and resolves locally, in different statements.
- Keep focused direct tests only for reusable calendar or diagnostic-ordering
  behavior that is not clearer through the interface.
- Delete tests whose only purpose is a removed dimension, fact-coordinate, or
  general-rule implementation detail.

## Gate

- The new schema and semantic fixture matrices pass targeted schema and
  semantic tests.
- Diagnostics have exact codes and JSON Pointer paths in deterministic order.
- No old document type or compatibility branch remains.
- Full typecheck may remain temporarily red only where Phases 3–4 have not yet
  replaced direct consumers of the shared `Document` type; that state stays on
  the unmerged cutover branch and is recorded in the plan index.
