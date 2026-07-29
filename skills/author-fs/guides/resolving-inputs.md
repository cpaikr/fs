# Resolving Source Inputs

Use these lenses adaptively when source material must be converted into a new
FS document or compared with an existing FS document. Source material may be a
workbook, CSV, PDF, filing, scan, image, webpage, accounting export, or a
mixture. Choose the evidence and tools that fit the material rather than
forcing every source through one sequence.

For a conversion, the target is a **statement-shaped model**: one entity and
reporting scope, explicit units and periods, ordered statements and items, one
deliberate cell state for every item-period, and only supported additive
rollups. A source-shaped cell dump, OCR transcript, or serialization of page
geometry is evidence, not that model. For an explicit comparison of existing
FS JSON, preserve the document and use these lenses to inspect its fidelity;
do not resolve or replace its financial choices unless the user requests a
change.

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

Apply this gate only after the complete FS JSON candidate exists and the
reference validator reports conforming status. Render that exact candidate to
a fresh scratch HTML path, then use the rendered HTML as the primary comparison
surface against the original source. Inspect the source in its visible or
native presentation whenever possible; extracted text, OCR, formulas, and
metadata remain supporting evidence.

If reference validation fails during a conversion, repair the candidate under
the main Skill's authoring boundary before comparing it. Resolve an operational
render failure without changing the candidate's financial meaning. If a
source-faithful, conforming candidate remains unrenderable, report the blocker
and do not claim the conversion or comparison is complete. For an explicit
comparison request involving an existing FS document, preserve the document
and report any validation or render blocker unless the user also asks for
repair.

Perform a judgment-based review rather than substituting a scripted diff or
deterministic matcher. Automated extraction, search, calculations, and logging
may help navigate or corroborate the evidence, but they do not decide source
fidelity. During the review:

- Account for every supplied artifact and relevant statement region. Record
  its role in the resolved model or comparison, or the reason it was excluded.
- Compare entity and scope; statement coverage and boundaries; item labels,
  hierarchy, and order; period columns; units and scales; signs and values;
  zero, missing, and unavailable states; and reported totals. Check for
  omissions, duplicates, transposed periods, and shifted rows or columns.
- Trace each visible result to source evidence or to a material assumption
  disclosed to the user. Revisit the FS JSON only for authoring details that
  the renderer intentionally omits; do not replace the visual comparison with
  a JSON-to-source comparison.
- Reconcile corroborating totals and checks without replacing a reported value
  merely to force arithmetic consistency.

For a conversion, correct every supported discrepancy, repeat reference
validation, and render each revision to a new scratch path; do not create the
deliverable until the review passes. For an explicit comparison request, do
not silently rewrite the FS document: report discrepancies with enough evidence
for the user to act, using whatever presentation best fits the source. When no
discrepancy is found, a concise completion statement is sufficient. Keep review
HTML, logs, and other intermediate evidence internal unless the user requests
them or they are useful for explaining a discrepancy.

Source fidelity is established only when every supplied artifact is accounted
for, the rendered candidate passes this source comparison, and material
assumptions or unresolved limitations are disclosed outside FS JSON. The
reference validator establishes FS conformance and separately reports rollup
consistency; neither result proves source fidelity.
