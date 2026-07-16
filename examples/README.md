# V0 examples

The examples are conforming FS documents and are normative evidence for the
[semantic specification](../docs/semantic-spec.md).

`minimal.json` proves that document, entity, and scope identifiers, dimensions,
and calculation rules are optional. A document with no calculation rules has
calculation status `not-defined`.

`manufacturing-group.json` deliberately combines materially different views
over one entity rather than treating each statement as a separate artifact:

| Required evidence | Location |
| --- | --- |
| Multi-period income, balance sheet, cash flow, manufacturing statements | `statements` |
| Non-period equity axis | `changes-in-equity.dimensions` |
| Passing and failing supplied subtotals | `gross-profit-subtotal` and `manufacturing-cost-subtotal` |
| One fact in two statements | `net-income` in income and cash-flow presentations |
| Two distinct facts expected to agree | `net-income-reconciliation` assertion |
| Opening, movement, and closing balances | `cash-roll-forward` |
| First period, consecutive periods, internal gap | `fy2023`, `fy2024`, `fy2028` |
| Annual, quarterly, and YTD overlap | `fy2025`, `q1-2025`, `ytd-h1-2025` |
| Unambiguous and ambiguous temporal binding | `fy2024`/`q2-2025` and `fy2025`/`q1-2025` |
| Exact decimals, scales, units, zero, unavailable | facts and unit definitions |
| Missing and unavailable facts | 2025 treasury-share statement coordinates are absent; the separate 2024 treasury-share and 2025 inventory coordinates are explicitly unavailable |
| Flat heading and explicit period order | income and balance-sheet presentations |

The intentionally inconsistent 2025 gross-profit value demonstrates that a
structurally conforming document can have calculation status `inconsistent`.
