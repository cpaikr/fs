# Analyst HTML Design System

Status: Approved. Documents the "Charter" rendering direction shipped by the
current renderer.

This document owns the visual and interaction direction of the standalone HTML
convenience view. The [semantic specification](docs/semantic-spec.md) remains
authoritative for financial meaning, and the
[CLI acceptance contract](docs/cli/acceptance.md) owns observable rendering
behavior.

## Approved Direction

"Charter" — a modernized institutional annual report. A cool paper-gray canvas
frames a white sheet; hierarchy comes from typography, alignment, and the
accountant's own rule vocabulary (hairlines between rows, a strong rule above
subtotals, a double rule above rollup roots) rather than fills, cards, or
dashboard chrome. A system serif carries identity (entity name, statement
titles); everything else is the platform sans with tabular figures.

The HTML is a generated reading and transfer surface. Row hierarchy, subtotal
emphasis, and rollup-check results are derived strictly from the FS document's
own `rollupTo` relationships and a fresh calculation over the validated
document — the view displays what the document encodes and nothing more.

## Visual System

System font stacks only, so the document remains self-contained: `ui-serif,
Georgia` for identity, `system-ui` sans for everything else, tabular figures
for all numerals.

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#eef0f1` | Cool paper-gray page background |
| Sheet | `#ffffff` | Document reading surface |
| Ink | `#191b1e` | Primary text and strong rules |
| Secondary ink | `#565b61` | Metadata, captions, supporting copy |
| Hairline | `#d8dadc` | Row separators and light structure |
| Claret | `#802636` | Single accent: links, focus, location, controls |
| Claret wash | `#f5e9ec` | Pressed toggle background |
| Status ok | `#216e3a` | Satisfied checks, copy success |
| Status fail | `#a4232b` | Unsatisfied checks, copy failure |
| Status warn | `#7a5200` | Checks that could not run |

All text pairs clear WCAG 2.2 AA (ink on sheet 17.2:1, secondary ink 6.9:1,
claret 9.3:1). Claret signals interaction and location, never financial
classification. Negative values stay ordinary ink; status colors are always
paired with a glyph (`=`, `≠`, `!`) and a literal word.

## Document Topology

- A masthead identifies the entity and scope (serif h1) and carries a
  document-level rollup-check summary (count and outcome).
- A sticky horizontal index links every statement in document order; the fixed
  script marks the statement currently in view with a claret underline.
- Each statement section holds, in order: an ordinal-prefixed serif title, a
  progressive table-tools row, one native table, a rollup-checks disclosure
  (when the statement has rollups), and one handoff area.
- Statement anchors and row relationships use renderer-owned ordinal and index
  identifiers. Author identifiers never become executable code or raw HTML
  attributes.

## Statement Presentation

- Text columns (Item, Unit, groupings) and their headers align left; period
  value columns and their headers align right with tabular figures on a shared
  right edge that indentation never disturbs.
- The item-label column is sticky during horizontal scroll, closed by a
  hairline, so numbers never lose their row identity.
- Displayed decimals get comma digit grouping (`1,000`); the copied TSV keeps
  the exact undecorated decimal. Grouping-column headers and toggle chips show
  a humanized form of the declared identifier (`majorGroup` → `Major group`);
  TSV headers keep the identifier verbatim.
- Tables pack to content width like a printed statement rather than
  stretching to fill the sheet.
- Statement, item, grouping, and period order are preserved exactly.
- Rollup hierarchy from the document: parent (subtotal) rows are bold with a
  strong rule above (the accountant's summing rule); rollup roots close with a
  double rule below, per accounting convention; child rows indent by depth in
  the label cell only, with the disclosure triangle absolutely positioned so
  labels share the row baseline with every other cell.
- Heterogeneous statements show the compact unit label per row; the full
  `label (measure, scale n)` text lives in the caption (homogeneous), the
  tooltip, and copied TSV, so complete context still leaves the view.
- Missing and unavailable cells remain explicit italic text states.
- No cards, shadows, gradients, pill tabs, charts, dashboard metrics, zebra
  stripes, or spreadsheet chrome.

## Progressive Interactions

All interactivity is renderer-owned fixed script, absent without JavaScript,
and purely presentational — copied TSV and the underlying table never change.

- Row collapse: each subtotal row gets a rotating-triangle disclosure button;
  collapsing hides all transitive descendants and reveals a `· n rows` count.
  Statement-level "Collapse rollups" / "Expand all" buttons act on every
  parent at once. Printing forces collapsed rows visible.
- Column toggles: `aria-pressed` buttons hide or show the Unit column and each
  grouping column; on shows `✓` plus wash fill, off shows `○`, so the pair
  reads as toggles rather than action buttons. Narrow viewports start with
  these columns off so values fit the first screen.
- Tooltip: a singleton dark tooltip appears after a ~400 ms hover delay over
  value cells, anchored near the right-aligned number, restating the row and
  column context (item, period, full unit, groupings, value, and item
  description when present). Descriptions also appear as secondary item text,
  so the tooltip duplicates visible content and no information is hover-only.
- Motion is limited to a 120 ms triangle rotation, disabled under
  `prefers-reduced-motion`.

## Validation Display

Each statement with rollups gets a native `<details>` disclosure summarizing
its checks (`n rollup checks · all satisfied`, `· m not satisfied`, and/or
`· k not checked`) and a
check table: formula from item labels (`Total assets = Cash + Inventory`),
period, verbatim actual / expected / difference / tolerance decimals, and a
glyph-plus-word result (`= Satisfied`, `≠ Not satisfied`, `! Not checked`).
Results always come from a fresh calculation over the validated document;
embedded snapshots are never displayed.

## Excel Handoff

Each statement has one visible `Copy for Excel` button after its checks. Its
accessible name includes the statement label. The status region reserves space
so `Copied` or failure feedback does not move content; success is green ink,
failure alone may be status-fail red. The button is progressive enhancement:
the inert copy source stores TSV as JSON string text, and the semantic table
is always the complete no-script fallback.

## Responsive and Print Behavior

- The sheet is centered with a hairline frame at wide widths and becomes
  full-bleed below 64rem; below 44rem metadata and handoff recompose into one
  column and the horizontal-scroll cue appears.
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
