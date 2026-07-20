# Analyst-Friendly HTML Rendering Plan

Status: Active.

## Outcome

`fs render` produces a deterministic, offline, self-contained convenience view
that lets financial analysts review an FS document and copy each complete
statement into Excel. The FS JSON Schema and semantic specification remain the
authoritative contract; presentation markup carries no additional financial
meaning.

## Current state

The first implementation slice is complete. `renderHtml(document)` now
orchestrates three focused internals: an opaque auto-escaping template seam, a
bounded line sink, and a shallow presentation analysis used by structural
preflight and rendering. Dynamic values are escaped by default, missing
validated references fail explicitly, and the emitted HTML remains byte-for-
byte identical to the current fixtures. The output contract still prohibits
scripts and fixes the emitted HTML and CSS; that contract changes with the copy
and usability slice, not with this foundation refactor.

`pnpm render:example` now rebuilds the tracked, multi-statement manufacturing
preview through the compiled CLI for quick local review while this work
continues.

The product direction is confirmed:

- analysts open the generated file locally and move statement data into Excel;
- a small inline script is acceptable, but the document remains offline and
  has no external runtime resources;
- copying operates per statement and includes an explicit unit column for every
  row, even when the visible table shows one common unit above the table;
- spreadsheet-native numeric transfer is preferred over exact lexical
  preservation; and
- the view is compact, trustworthy, utilitarian, and targets WCAG 2.2 AA.

## Scope

- Deepen the renderer behind its existing `renderHtml(document)` interface:
  resolve statement presentation once, escape dynamic text by default, and
  retain bounded two-pass encoding.
- Revise the rendering contract so inline behavior is allowed and current
  markup is deterministic without becoming a cross-version presentation
  guarantee.
- Add a discoverable per-statement copy action with accessible status,
  Excel-friendly clipboard data, complete unit context, delimiter
  normalization, and spreadsheet-formula protection for author text.
- Improve table naming, keyboard scrolling, responsive overflow cues, sticky
  context, numeric typography, print behavior, and multi-statement navigation.
- Verify emitted semantics and limits in unit and process tests, then exercise
  the standalone file and clipboard workflow in a browser and Excel.

Partial rectangular cell selection, sorting, filtering, resizing,
virtualization, inferred hierarchy, and subtotal styling are outside this plan.
A general template engine or data-grid library is not justified by the current
requirements.

## Decisions

- Keep native HTML tables as the semantic and no-script fallback.
- Keep the accepted finite-output budgets and atomic, non-overwriting writer.
- Use an internal streaming template implementation rather than an external
  template engine or materialized DOM tree.
- Keep line termination explicit in the bounded sink API. Build any resolved
  row or clipboard projection lazily after structural preflight so oversized
  input is rejected before row or cell materialization.
- Keep all executable script source fixed by the renderer; never interpolate
  author-controlled content into script source.
- Preserve `Missing` and `Unavailable` as explicit copied cell states while
  copying null grouping metadata as an empty cell.

## Validation

The foundation refactor passes type checking, strict Effect diagnostics, all
unit tests, all packed CLI acceptance cases, writer integration, documentation
checks, package inventory and execution checks, and `git diff --check`. The
unit suite includes a renderer-seam regression proving that dynamic value
strings cannot become markup. Existing exact render fixtures remain unchanged.
Running `pnpm render:example` also reproduced the tracked manufacturing preview
without a byte change or leftover temporary output.

Local Chromium rendered the tracked multi-statement example at desktop and
mobile widths; the local `file:` document was a secure context with Clipboard
API text writing available. The implementation will still include a fallback
for browsers where local clipboard access is unavailable.

## Next action

Revise the rendering contract for fixed inline behavior, then implement and
test a post-preflight per-statement clipboard projection. It will always include
Unit, preserve explicit missing states, normalize delimiters, and protect
author-controlled cells from spreadsheet formula interpretation before UI
wiring begins.
