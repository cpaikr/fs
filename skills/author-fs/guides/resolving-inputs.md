# Resolving Source Inputs

Use these lenses adaptively when the supplied material is not yet an
author-resolved financial model. Source material may be a workbook, CSV, PDF,
scan, image, webpage, accounting export, or a mixture. Choose the evidence and
tools that fit the material rather than forcing every source through one
sequence.

The target is a **statement-shaped model**: one entity and reporting scope,
explicit units and periods, ordered statements and items, one deliberate cell
state for every item-period, and only supported additive rollups. A
source-shaped cell dump, OCR transcript, or serialization of page geometry is
evidence, not that model.

## Explore the Source

- Inventory the supplied artifacts and determine the role of each one. Separate
  primary statements from trial balances, mappings, consolidation workings,
  checks, notes, and prior-period comparatives.
- Inspect the presentation as well as extracted text or values. Titles, merged
  headers, indentation, borders, number formats, hidden regions, page breaks,
  and formula structure often carry the statement boundaries and hierarchy.
- Find every distinct statement region. One file, worksheet, page, or webpage
  may contain multiple statements; one statement may span several regions.
- Identify the authoritative period axis and unit or scale from headings and
  surrounding context. Treat repeated headers, subtotals, check rows, notes,
  and blank separators according to their financial role rather than their
  rectangular position.
- Trace representative totals to detail and corroborate them with source
  formulas or adjacent disclosures. Use balance-sheet balance, profit subtotals,
  cash-flow continuity, and source check rows as corroboration while preserving
  reported values.

## Use Format-Specific Evidence

- For spreadsheets, render relevant sheets and inspect values, formulas,
  formatting, merged cells, hidden rows or columns, tables, named ranges, and
  calculated checks. Distinguish statement tables from workings before mapping
  rows into FS items.
- For text PDFs and webpages, preserve headings, table boundaries, reading
  order, footnotes, signs, and repeated column labels. Compare extracted tables
  with the visible presentation when alignment is uncertain.
- For scans and images, use OCR as a draft. Visually verify digits, decimal
  places, parentheses, minus signs, units, column alignment, and labels before
  accepting values.
- For multiple sources, assign each a role and reconcile conflicts using the
  most authoritative and internally coherent evidence. Keep source-specific
  representations separate when the user requests distinct FS documents.

## Resolve the Financial Model

- Recover entity and scope, statement boundaries, periods, units and scales,
  item meanings and order, values, groupings, and supported rollups from the
  source evidence.
- Preserve the distinction between reported zero, missing, and explicitly
  unavailable. Preserve stored signs and reported subtotal values.
- Build stable document-local identifiers from resolved meanings, not source
  coordinates. A source row or cell address may support an item but does not
  define its financial identity.
- Resolve reasonable ambiguity using corroborating evidence and professional
  judgment. Ask the author when the available material cannot support an
  internally coherent choice. Report material assumptions and unresolved
  limitations in the user response; keep them outside FS JSON.
- Keep distinct requested scopes as distinct documents. Each document may
  contain multiple statements, such as one balance sheet and one income
  statement recovered from the same worksheet.

Resolution is complete only when every prerequisite listed in **Resolve
Inputs** in the main Skill is present and internally consistent. Return to the
main Skill at that point, encode the candidate, and let the reference validator
judge FS conformance and rollup consistency.
