# Bound rendered output before allocation

Status: Proposed.

Rendering needs an explicit finite-output contract regardless of whether FS
migrates from the current dimensional contract to the statement-row model
accepted by
[ADR 0001](0001-replace-dimensional-members-with-item-grouping.md). This ADR
remains independent so the data-model and operational decisions can be
accepted or revised separately.

It is not yet normative. Until accepted and incorporated into the
[CLI acceptance contract](../cli/acceptance.md), current contracts continue to
define behavior.

## Context

The current renderer eagerly constructs the Cartesian product of statement
axes. Thirty axes with two members each imply 1,073,741,824 data columns. A
small conforming input can therefore exhaust memory before the CLI can return a
controlled error.

HTML also restricts `colspan` to 1,000. In the current renderer, a heading row
spans one label column plus every data column, so 1,000 data columns produce the
invalid value `colspan="1001"`. See the
[WHATWG table-cell attribute contract](https://html.spec.whatwg.org/multipage/tables.html#attributes-common-to-td-and-th-elements).

Streaming addresses peak buffering but cannot make inherently enormous output
acceptable. The renderer needs both structural and encoded-byte budgets.

## Proposed decision

Before constructing output rows or cells, rendering computes with checked
integer arithmetic and rejects a document that exceeds either structural
limit:

- at most 1,000 logical columns in any rendered statement, including its label
  and other non-data columns; and
- at most 100,000 logical table-grid slots across the document.

A data column contains a financial value; the row-label column is not a data
column. In the current model, data columns are the period and selected-axis
intersections. In the accepted row model, they are the statement's periods.
Because the current layout has one label column, the total-column limit permits
at most 999 data columns.

A logical grid slot is one row-column intersection after spans are expanded.
For the current renderer, a statement with `C` data columns and `R` body rows
uses `(C + 1) * (R + 1)` slots: one label column, one header row, and `R` body
rows. A cell spanning a complete row consumes `C + 1` logical slots even if it
is one HTML element. A future renderer that adds visible columns or rows must
count their occupied intersections by the same rule.

After structural preflight, rendering may build the result only in a bounded
sink. It rejects final UTF-8 HTML larger than 16 MiB (16,777,216 bytes),
measured after HTML escaping and encoding. No partial destination file is
written.

Any of these violations returns:

- error code `output-limit-exceeded`;
- operation `render`;
- exit code `1`;
- a diagnostic naming the exceeded budget and its limit;
- no output file; and
- no automated help suggestion.

The CLI acceptance contract must define this error's precedence relative to
other render failures when the ADR is accepted. Arithmetic overflow while
computing a count is itself over-limit; it must not wrap, allocate, or require
the exact expanded count to be representable.

## Consequences

- The 1,000-total-column limit keeps a whole-row heading span within HTML's
  maximum; the current label-column layout leaves 999 period or period/member
  data columns.
- The grid budget bounds work even when many individually narrow statements or
  many rows would produce excessive output.
- The byte budget covers long labels and markup that cell counts cannot bound.
- Valid documents may remain intentionally unrenderable under this operational
  policy; validation and rendering answer different questions.
- Streaming remains an implementation option only inside the same budgets.

The exact numbers are policy choices, not facts from the HTML standard. They
should change only with explicit acceptance cases and memory/output evidence,
not by silently weakening a guard in the renderer.
