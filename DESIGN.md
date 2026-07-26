# Analyst HTML Design System

Status: Approved for FS `0.2`. Retains the "Folio" rendering direction shipped
by the `0.1` renderer while removing user-defined grouping-column presentation.
Folio replaced the earlier "Charter" floating-sheet direction (rejected: timid
scale, dead space at desktop widths, stock controls).

This document owns the visual and interaction direction of the standalone HTML
convenience view. The [semantic specification](docs/semantic-spec.md) remains
authoritative for financial meaning, and the
[CLI acceptance contract](docs/cli/acceptance.md) owns observable rendering
behavior.

## Approved Direction

"Folio" — a bound financial report. A deep oxblood title band anchors the
document with the entity name in large serif; below it, statements fill one
72rem measure on white, the way filed statements span a page. Hierarchy comes
from typography, alignment, and the accountant's own rule vocabulary
(hairlines between rows, a strong rule above subtotals, a double rule below
rollup roots) rather than fills, cards, or dashboard chrome. A system serif
carries identity (entity name, statement titles); everything else is the
platform sans with tabular figures. Claret is used with commitment — band,
ordinals, active states, primary action — but never for financial
classification.

The HTML is a generated reading and transfer surface. Row hierarchy, subtotal
emphasis, and rollup-check results are derived strictly from the FS document's
own `rollupTo` relationships and a fresh calculation over the validated
document — the view displays what the document encodes and nothing more.

## Visual System

System font stacks only, so the document remains self-contained: `ui-serif,
Georgia` for identity, `system-ui` sans for everything else, tabular figures
for all numerals. Every full-width band centers its content on a shared
72rem measure (`padding-inline: max(gutter, 50% - measure/2)`), so the page
needs no wrapper containers.

| Token | Value | Use |
| --- | --- | --- |
| Surface | `#ffffff` | Page and reading surface |
| Band | `#3a141d` | Oxblood masthead band |
| Band ink | `#ffffff` / `#d9bcc3` | Title / supporting text on the band |
| Band status | `#93d8a8` `#f4abaf` `#e8c481` | Check glyphs on the band |
| Ink | `#1a1c20` | Primary text and strong rules |
| Secondary ink | `#54575d` | Metadata, captions, supporting copy |
| Hairline | `#dcdde0` | Row separators and light structure |
| Claret | `#802636` | Accent: band family, links, focus, ordinals, primary |
| Footer | `#f4f4f5` | Colophon band |
| Status ok | `#216e3a` | Satisfied checks, copy success |
| Status fail | `#a4232b` | Unsatisfied checks, copy failure |
| Status warn | `#7a5200` | Checks that could not run |

All text pairs clear WCAG 2.2 AA (ink on white 16.9:1, secondary ink 7.2:1,
claret 9.3:1, band ink 15.5:1, band supporting text 8.7:1). Claret signals
identity and interaction, never financial classification. Negative values
stay ordinary ink; status colors are always paired with a glyph (`=`, `≠`,
`!`) and a literal word.

## Document Topology

- A masthead identifies the entity and scope (serif h1) and carries a
  document-level rollup-check summary (count and outcome). The summary uses
  `≠` when any check is not satisfied, otherwise `!` when a check could not be
  evaluated. In either case it links to the first statement carrying an issue,
  so the document's most important signal is one activation from its proof.
- A sticky horizontal index links every statement in document order; the fixed
  script marks the statement currently in view with a claret underline, and
  the scrolled-to-end position marks the last statement, which the observer
  band alone cannot reach. A statement with not-satisfied checks carries a
  small `≠` flag in its index link; one whose only issue is an unevaluable
  check carries `!`. Both flags include visually hidden text.
- Each statement section holds, in order: an ordinal-prefixed serif title, a
  progressive table-tools row, one native table, a rollup-checks disclosure
  (when the statement has rollups), and one handoff area.
- The document closes with a colophon: a quiet light-gray footer band stating
  the format version and that the FS JSON document is authoritative. No
  timestamp — rendered files stay deterministic.
- Statement anchors and row relationships use renderer-owned ordinal and index
  identifiers. Author identifiers never become executable code or raw HTML
  attributes.

## Statement Presentation

- Text columns (Item and Unit) and their headers align left; period
  value columns and their headers align right with tabular figures on a shared
  right edge that indentation never disturbs.
- The item-label column is sticky during horizontal scroll, closed by a
  hairline, so numbers never lose their row identity.
- Displayed decimals get comma digit grouping (`1,000`); the copied TSV keeps
  the exact undecorated decimal.
- Tables span the full content measure like filed statements: the item column
  absorbs spare width so figures hold the right edge of the measure, and the
  page never splits into a narrow table beside dead space.
- Statement, item, and period order are preserved exactly.
- Rollup hierarchy from the document: parent (subtotal) rows are bold with a
  strong rule above (the accountant's summing rule); rollup roots close with a
  double rule below, per accounting convention; child rows indent by depth in
  the label cell only, with the disclosure triangle absolutely positioned so
  labels share the row baseline with every other cell.
- Derived group-heading rows restate a rollup parent's label above its
  contiguous subtree (classic published-statement style), carry no values,
  never enter copied TSV, and hide with the group when it collapses.
- Heterogeneous statements show the compact unit label per row; the full
  `label (measure, scale n)` text lives in the caption (homogeneous), the
  tooltip, and copied TSV, so complete context still leaves the view.
- Missing and unavailable cells remain explicit italic text states.
- No cards, shadows, gradients, pill tabs, charts, dashboard metrics, zebra
  stripes, or spreadsheet chrome.

## Progressive Interactions

All interactivity is renderer-owned fixed script, absent without JavaScript,
and purely presentational — copied TSV and the underlying table never change.

- Row collapse: each subtotal row gets a rotating-triangle disclosure button
  (≥ 24px target, WCAG 2.5.8); collapsing hides all transitive descendants and
  reveals a `· n rows` count. Statement-level "Collapse rollups" /
  "Expand all" buttons act on every parent at once. Printing forces collapsed
  rows visible.
- Column visibility: heterogeneous statements expose a `Columns` menu (native
  details disclosure styled as a button) with one checkbox for the conditional
  Unit column. Narrow viewports start with that column unchecked so values fit
  the first screen. Homogeneous statements have no hideable columns and no
  menu.
- Controls share one vocabulary: flat 4px radius, quiet border, no shadows,
  filled-claret primary for `Copy for Excel`, bordered secondaries for tools —
  clustered at the table's right edge so every control touches what it acts
  on; the frozen-pane hairline on the sticky label column appears only when
  the table actually overflows.
- Tooltip: a singleton dark tooltip appears after a ~400 ms hover delay — or
  immediately on keyboard focus — over value cells, anchored near the
  right-aligned number, restating the row and column context (item, period,
  full unit, value, item description when present). Value cells
  form a roving tabindex per table with arrow-key movement, and the focused
  cell exposes the tooltip as its accessible description, so no information is
  pointer-only.
- Motion is limited to a 120 ms triangle rotation, disabled under
  `prefers-reduced-motion`.

## Validation Display

Each statement with rollups gets a native `<details>` disclosure summarizing
its checks (`n rollup checks · all satisfied`, `· m not satisfied`, and/or
`· k not checked`) and a
check table: formula from item labels (`Total assets = Cash + Inventory`),
period, verbatim actual / expected / difference / tolerance decimals, and a
glyph-plus-word result (`= Satisfied`, `≠ Not satisfied`, `! Not checked`).
A disclosure whose checks all satisfy renders collapsed; one holding a
not-satisfied or not-checked result renders expanded, so an issue is visible
without hunting. Results always come from a fresh calculation over the validated
document; embedded snapshots are never displayed.

## Excel Handoff

Each statement has one visible `Copy for Excel` button after its checks. Its
accessible name includes the statement label. The status region reserves space
so `Copied` or failure feedback does not move content; success is green ink,
failure alone may be status-fail red. The help line states that the copy is
the complete statement regardless of collapsed rows or hidden columns, so the
paste never silently disagrees with the screen. The button is progressive
enhancement: the inert copy source stores TSV as JSON string text, and the
semantic table is always the complete no-script fallback.

## Responsive and Print Behavior

- Bands are full-bleed at every width; the shared gutter steps 2.5rem →
  1.5rem (64rem) → 1rem (44rem). Below 44rem the masthead stacks, metadata
  and handoff recompose into one column, and the horizontal-scroll cue
  appears.
- The native table scrolls horizontally inside a keyboard-focusable region.
- Focus is a 2px claret outline everywhere; no interaction depends on hover or
  color alone.
- Print removes navigation, tools, clipboard controls, and the canvas; forces
  collapsed rows visible; repeats table headers; uses black ink.

## Implementation Fidelity

Semantic HTML and CSS with one fixed progressive-enhancement script. Exact
presentation bytes are a release-level regression surface via the executable
render fixtures; update `fixtures/cli/expected/render/*.html` and the rendered
examples together with any presentation change.
