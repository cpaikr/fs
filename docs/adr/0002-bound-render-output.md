# Bound rendered output before allocation

Status: Accepted.

Rendering needs an explicit finite-output contract. This ADR was accepted
alongside the migration to the statement-row model in
[ADR 0001](0001-replace-dimensional-members-with-item-grouping.md) and remains
independent so the data-model and operational decisions can be revised
separately.

The [CLI acceptance contract](../cli/acceptance.md) incorporates this decision
for the current renderer. The budgets change only through a later accepted
decision.

## Context

The pre-refactor renderer eagerly constructed the Cartesian product of
statement axes. Thirty axes with two members each implied 1,073,741,824 data
columns, so a small conforming input could exhaust memory before the CLI
returned a controlled error.

HTML also restricts `colspan` to 1,000. The pre-refactor renderer used a
whole-row heading whose span could exceed that limit. See the
[WHATWG table-cell attribute contract](https://html.spec.whatwg.org/multipage/tables.html#attributes-common-to-td-and-th-elements).

Streaming addresses peak buffering but cannot make inherently enormous output
acceptable. The renderer needs both structural and encoded-byte budgets.

## Decision

Before constructing output rows or cells, rendering computes with checked
integer arithmetic and rejects a document that exceeds either structural
limit:

- at most 1,000 logical columns in any rendered statement, including its label
  and other non-data columns; and
- at most 100,000 logical table-grid slots across the document.

A data column contains a financial value; item and unit metadata columns are
not data columns. In the current row model, data columns are the statement's
periods. Because every table has an item-label column, the total-column limit
permits at most 999 period columns; the conditional unit column reduces that
maximum to 998 for a heterogeneous statement.

A logical grid slot is one row-column intersection after spans are expanded.
For the current renderer, a statement with `C` total columns, `R` item rows,
and `H` derived group-heading rows uses `C * (R + H + 1)` slots, including its
header row. A future renderer that adds visible columns, rows, or spans must
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

The CLI acceptance contract defines this error's precedence relative to other
render failures. Arithmetic overflow while computing a count is itself
over-limit; it must not wrap, allocate, or require the exact expanded count to
be representable.

## Consequences

- The 1,000-total-column limit bounds table width and remains compatible with
  HTML's maximum `colspan`; the required item-label column leaves at most 999
  period columns.
- The grid budget bounds work even when many individually narrow statements or
  many rows would produce excessive output.
- The byte budget covers long labels and markup that cell counts cannot bound.
- Valid documents may remain intentionally unrenderable under this operational
  policy; validation and rendering answer different questions.
- Streaming remains an implementation option only inside the same budgets.

The exact numbers are policy choices, not facts from the HTML standard. They
should change only with explicit acceptance cases and memory/output evidence,
not by silently weakening a guard in the renderer.
