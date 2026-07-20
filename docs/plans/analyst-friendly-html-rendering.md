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
validated references fail explicitly, and that foundation slice preserved the
former output byte-for-byte. The revised contract now permits only renderer-
owned fixed inline behavior and treats current presentation bytes as a release-
level regression surface rather than a cross-version guarantee.

`pnpm render:example` now rebuilds the tracked, multi-statement manufacturing
preview through the compiled CLI for quick local review while this work
continues.

The product and visual directions are confirmed. The approved review-index
system is recorded in [`DESIGN.md`](../../DESIGN.md):

- analysts open the generated file locally and move statement data into Excel;
- a small inline script is acceptable, but the document remains offline and
  has no external runtime resources;
- copying operates per statement and includes an explicit unit column for every
  row, even when the visible table shows one common unit above the table;
- spreadsheet-native numeric transfer is preferred over exact lexical
  preservation;
- the view is compact, trustworthy, utilitarian, and targets WCAG 2.2 AA;
- the visual system uses a warm working-paper canvas, neutral ink, hairline
  rules, and restrained teal interaction cues;
- statement navigation conveys ordinal location without inventing completion
  state; and
- the approved mock's inferred section index and total styling are omitted
  because FS does not encode those presentation semantics.

The foundation and rendering-contract slices are merged into `dev`. The
presentation implementation is complete on its delivery branch: native tables
now use the approved review-index system, responsive overflow guidance, print
rules, a sticky statement index, and progressive per-statement Excel handoff.
Clipboard TSV is streamed through the bounded sink after structural preflight,
includes unit context, normalizes delimiters, and protects formula-prefixed
author text. Exact fixtures and the tracked examples have been regenerated from
the implementation.

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

## Delivery strategy

1. **Design:** inspect the manufacturing statement at desktop, narrow-screen,
   and print widths; complete the Impeccable direction, palette, and mock
   approval gates; then record the approved visual system and interaction
   vocabulary in `DESIGN.md`.
2. **Contract:** revise the CLI acceptance contract before observable behavior
   changes. Permit only renderer-owned fixed inline behavior, keep external
   resources and author-controlled executable content prohibited, and define
   the deterministic statement copy projection and fallback behavior.
3. **Implementation:** build the TSV projection only after structural
   preflight, wire one safely named copy action and status region per statement,
   retain native tables as the no-script fallback, and refine screen,
   responsive, overflow, sticky-context, and print presentation without adding
   financial interpretation.
4. **Verification:** add focused unit and packed-process acceptance coverage,
   regenerate exact fixtures through supported repository commands, run the
   complete repository gates, inspect the local standalone file in a real
   browser across desktop and mobile, audit WCAG 2.2 AA and print behavior, and
   paste representative statement data into Excel to verify cell types and
   formula protection.
5. **Completion:** run local code review on every reviewable slice, deliver the
   fewest manageable sequential PRs to `dev`, address all Codex and CodeRabbit
   feedback and required checks before merging each PR, and finish with a
   requirement-by-requirement audit of this plan and its owning contracts.

Keep each slice self-contained and passing. Start every later slice from the
updated `dev` branch; do not stack branches or leave implementation after the
last reviewed merge.

## Blockers

None.

## Validation

The foundation refactor passes type checking, strict Effect diagnostics, all
unit tests, all packed CLI acceptance cases, writer integration, documentation
checks, package inventory and execution checks, and `git diff --check`. The
unit suite includes a renderer-seam regression proving that dynamic value
strings cannot become markup. Existing exact render fixtures remain unchanged.
Running `pnpm render:example` also reproduced the tracked manufacturing preview
without a byte change or leftover temporary output.

The Impeccable direction, palette, and mock gates are complete. The approved
review-index system was reconciled against the FS semantic boundary in
`DESIGN.md`, and `pnpm check:docs` passes for the design and contract slice.

Local Chromium verified the tracked multi-statement example at desktop, tablet,
and phone widths without page-level overflow. The accessibility tree exposes
named native tables, captions, keyboard-focusable horizontal scroll regions,
and per-statement copy controls. The no-script launch keeps every table and
omits the progressive controls. Clipboard API success, legacy fallback success,
total failure, repeated activation, Enter and Space activation, live-region
transitions, and fallback focus restoration all behave as specified.

The printed manufacturing example was rendered to a tagged, five-page PDF and
visually inspected page by page. Each statement remains legible and complete on
its own black-on-white page, with navigation, overflow guidance, and clipboard
controls omitted. The browser-produced balance-sheet TSV pasted into Microsoft
Excel as the exact `A1:F7` grid. A separate protected-prefix paste confirmed
that `=`, `+`, `-`, and `@` author text remains literal rather than executing as
spreadsheet formulas.

Focused renderer and process tests, documentation checks, and
`git diff --check` pass. The full repository gate also passes, including strict
Effect diagnostics, all unit and packed CLI acceptance cases, writer crash and
concurrency coverage, and installed-package execution. Independent code review
found and closed reduced-motion, target-size, long-label overflow, sticky-
context, stale-status, native-table target, feedback-layout, and U+0000 copy
integrity gaps. The inert source now stores TSV as JSON string text, which the
fixed script decodes before copying, so schema-valid control characters survive
HTML parsing without weakening the document schema.

## Next action

Deliver and merge the presentation slice into `dev` through its reviewed
sequential pull request, then complete the release-candidate plan's next action.
