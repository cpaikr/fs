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

- Inventory the supplied artifacts and determine the role of each one.
  Distinguish primary statements and their comparative period columns from
  trial balances, mappings, consolidation workings, checks, and notes.
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
  item meanings and order, values, and supported rollups from the source
  evidence.
- Preserve the distinction between reported zero, missing, and explicitly
  unavailable. Preserve stored signs and reported subtotal values.
- Build stable document-local identifiers from resolved meanings, not source
  coordinates. A source row or cell address may support an item but does not
  define its financial identity.
- Keep project-only classifications, mappings, and presentation tags outside
  FS. When a source category changes a value's financial meaning, represent it
  through a distinct item's identifier and human-readable text.
- Add a rollup only when a source formula, explicit presentation hierarchy, or
  user direction confirms the direct additive relationship. Arithmetic
  agreement and row order may corroborate a rollup but do not establish one;
  leave `rollupTo` absent when the direct relationship remains uncertain.
- Resolve reasonable ambiguity using corroborating evidence and professional
  judgment. Ask the user only when the evidence cannot support a defensible
  choice and the alternatives would materially change the financial meaning.
  Report material assumptions and unresolved limitations in the user response;
  keep them outside FS JSON.
- Keep distinct requested scopes as distinct documents. Each document may
  contain multiple statements, such as one balance sheet and one income
  statement recovered from the same worksheet.

## Complete the Source-Fidelity Gate

Once every **Resolve Inputs** prerequisite is present and internally
consistent, return to the main Skill and prepare the create candidate. Apply
this gate to that complete candidate before reference validation:

- Account for every supplied artifact and relevant statement region. Record
  its role in the resolved model or the reason it was excluded.
- Trace each resolved entity and scope, statement and item, period, unit and
  scale, value state and stored sign, and rollup to source evidence or a
  material assumption disclosed to the user.
- After encoding, compare the complete candidate with the visible source.
  Verify statement boundaries, labels and order, period columns, units and
  scales, signs, values, and reported totals. The reference validator
  proves FS conformance and rollup consistency, not source fidelity.
- Reconcile corroborating totals and checks without replacing a reported value
  merely to force arithmetic consistency.

Source resolution is complete only when every supplied artifact is accounted
for, the encoded candidate passes the source comparison, and material
assumptions or unresolved limitations are disclosed outside FS JSON. Return to
the main Skill at reference validation, then create the output after the
candidate conforms.
