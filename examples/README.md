# V0 Examples

These examples provide conformance evidence for the current `0.1`
[semantic specification](../docs/semantic-spec.md). They demonstrate complete
artifacts rather than acting as partially completed authoring templates. See
the [authoring guide](../docs/authoring.md) for the encoding workflow.

## Files

- `minimal.json` is the smallest complete statement-row document. It omits
  optional identifiers, grouping columns, rollups, and validation snapshot, so
  its calculation status is `not-defined`.
- `manufacturing-group.json` combines income, balance-sheet, cash-flow, equity,
  and manufacturing statements for one entity. It carries the optional
  canonical `$schema` discovery pointer, is structurally conforming, and is
  deliberately calculation-inconsistent.

## Manufacturing Example Evidence

- Statements own their ordered items and select their display periods.
- Income uses a nested revenue and cost-of-sales subtotal graph; the explicit
  2025 gross-profit value is deliberately inconsistent with its direct
  children.
- Balance sheet, cash flow, equity, and manufacturing statements include
  satisfied rollups alongside that failure.
- Item identifiers such as `materials` and `labor` repeat across statements,
  proving item and rollup identity is statement-local.
- `majorGroup` and `valuation` demonstrate exact grouping maps, including null
  grouping cells.
- Most rows use KRW millions while the EPS row uses KRW per share, proving
  mixed-unit statement presentation without permitting mixed-unit rollup
  edges.
- Values include exact decimals, signs, zero, and explicit unavailability.

Structural conformance and calculation consistency are separate outcomes; the
example is valid even though one rollup application is unsatisfied.
