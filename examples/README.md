# V0 Examples

These examples provide conformance evidence for the normative
[semantic specification](../docs/semantic-spec.md). They demonstrate artifact
behavior; they do not define statement contents or act as partially completed
documents. See the [authoring guide](../docs/authoring.md) for the encoding
workflow.

## Files

- `minimal.json` proves that document, entity, and scope identifiers,
  dimensions, and calculation rules are optional. Its calculation status is
  `not-defined`.
- `manufacturing-group.json` combines materially different presentations over
  one entity rather than treating each statement as a separate artifact. It is
  structurally conforming and deliberately calculation-inconsistent.

## Manufacturing Example Evidence

- **Multiple statements:** income, balance sheet, cash flow, equity, and
  manufacturing presentations.
- **Non-period axis:** `changes-in-equity.dimensions` presents equity
  components.
- **Passing and failing totals:** `gross-profit-subtotal` and
  `manufacturing-cost-subtotal`.
- **Shared fact:** `net-income` appears in income and cash-flow presentations.
- **Distinct facts reconciled explicitly:** `net-income-reconciliation`.
- **Roll-forward:** `cash-roll-forward` relates opening, movement, and closing
  balances.
- **First, consecutive, and gapped periods:** `fy2023`, `fy2024`, and `fy2028`.
- **Overlapping durations:** `fy2025`, `q1-2025`, and `ytd-h1-2025`.
- **Temporal binding:** `fy2024` and `q2-2025` are unambiguous, while `fy2025`
  and `q1-2025` demonstrate ambiguity.
- **Exact values:** facts and units cover decimals, scales, measures, zero, and
  explicit unavailability.
- **Missing versus unavailable:** 2025 treasury-share statement coordinates
  are absent; separate 2024 treasury-share and 2025 inventory coordinates are
  explicitly unavailable.
- **Flat presentation:** income and balance-sheet statements demonstrate
  headings and explicit period order.

The intentionally incorrect 2025 gross-profit value proves that structural
conformance and calculation consistency are separate outcomes.
