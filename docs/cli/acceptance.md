# CLI Acceptance Contract

This contract defines observable process behavior for the current `0.1`
statement-item-row contract.

## Purpose

CLI acceptance fixtures fix the observable process contract of the reference
`fs` executable. They invoke a local process and compare its arguments, input,
standard streams, exit code, and filesystem effects. They do not invoke an AI
model, score prose, or make fuzzy judgments.

The [semantic specification](../semantic-spec.md) defines artifact behavior.
Existing [language-neutral fixtures](../../fixtures/) provide authoritative
expected artifact results. CLI cases reuse them instead of copying their
semantic matrix. Process cases live in [`fixtures/cli/`](../../fixtures/cli/).

## Fixture Protocol

Each case records:

- the executable name and an argument array, without shell parsing;
- an isolated working directory and any files copied into it;
- either no standard input or the exact fixture bytes supplied to standard
  input;
- the expected standard-output encoding and structured value, exact payload,
  or semantic native-CLI text assertions;
- expected standard error: exact bytes for ordinary application cases,
  semantic native-CLI text assertions for usage failures, or a structured
  JSON Lines matcher for diagnostic logging cases;
- the expected exit code; and
- created, unchanged, and absent filesystem paths after execution.

The harness runs each case in a fresh temporary workspace with a fixed home
directory, locale, timezone, non-interactive terminal state, and disabled
color. Paths passed to the command are relative staged paths unless a case is
specifically testing path handling. The staged executable itself is excluded
from filesystem comparison.

JSON results are compared as JSON values. Object member order and insignificant
whitespace are not compared. Ordered arrays, field presence, and field values
are compared exactly. When the semantic specification permits diagnostic
wording to vary, fixtures compare the stable error code and JSON Pointer path
and assert only that `message` is a nonempty string.

Direct content payloads and files created by content commands have a stronger
comparison:

- `fs schema` and named `fs example` direct standard output, plus files they
  create with `--output`, must equal the exact bundled JSON bytes; and
- `fs guide authoring` must equal its generated Markdown source bytes.

Generated help and usage text have a deliberately narrower comparison. Cases
assert the active command path, required operands, command-local flags, Effect
built-ins, relevant offending token, and absence of ANSI control sequences.
They do not copy formatter prose, wrapping, spacing, or section layout into
independent expected files. Exact-one operand descriptions must contain the
literal `Exactly one`. A native variadic ellipsis produced by the pinned CLI's
consume-all refinement is not interpreted as accepting extras. Version cases
assert the exact installed package version, and completion cases assert a
nonempty script for the requested shell; completion metadata does not expand
the accepted command grammar.

An illustrative case descriptor is:

```json
{
  "id": "validate-path-no-rollups",
  "command": "fs",
  "arguments": ["validate", "input.json"],
  "workspace": [
    {
      "copy": "../valid/no-rollups.json",
      "to": "input.json"
    }
  ],
  "stdin": null,
  "expect": {
    "stdout": {
      "encoding": "json",
      "members": ["validation", "snapshotDiff", "help"],
      "subtrees": [
        {
          "pointer": "/validation",
          "equalsFile": "../calculation-results/no-rollups.json"
        },
        {
          "pointer": "/snapshotDiff",
          "equalsFile": "../snapshot-diffs/not-recorded.json"
        }
      ],
      "values": [
        {
          "pointer": "/help",
          "equals": []
        }
      ]
    },
    "stderr": "",
    "exitCode": 0,
    "filesystem": {
      "created": [],
      "unchanged": ["input.json"],
      "absent": []
    }
  }
}
```

The fixture schema is authoritative for descriptor mechanics. It uses generic
JSON Pointer equality, nonempty-string assertions, and semantic native-text
assertions rather than command-specific result fields. This document is
authoritative for observable CLI behavior.

## Output Contract

JSON is the only V0 encoding for structured operation results and operational
errors. There is no format selector. A compact encoding such as TOON is
future, additive work that requires a pinned specification version and its own
acceptance cases.

Commands that return content use the content's maintained encoding rather than
escaping it inside a result object:

- bundled schemas and named examples are JSON; and
- authoring guidance is Markdown.

The process has three output modes:

- operation results and operational errors are JSON on standard output;
- explicit help, version, and completions are native text on standard output,
  with empty standard error and exit code `0`; and
- grammar failures write generated help for the active command to standard
  output, a native diagnostic to standard error, and exit code `2`.

No progress text is written to either stream. Standard error is empty for
ordinary application cases when `--log-level` is omitted or set to `none`.
Explicit logging cases compare deterministic diagnostic JSON Lines on standard
error without changing the expected operation result, exit code, or filesystem
state.

### Diagnostic logging

Every command path accepts
`--log-level <all|trace|debug|info|warn|warning|error|fatal|none>`. Omitting the
flag is equivalent to `none`, and `warning` is an alias for `warn`. An invalid
value follows the native usage-failure stream contract and exits `2`.

When enabled, the logger writes one canonical JSON object plus LF per event to
standard error. Each object contains `level`, `event`, `operation`, and only
allowlisted bounded context. JSON member order is canonical. Entries omit
wall-clock timestamps, runtime identifiers, spans, document contents, raw
dependency messages, causes, and stack traces.

The log record shape, levels, threshold behavior, and redaction rules are the
stable V0 contract. Individual event catalogs and unrelated event order are
internal observability details. One canonical validation smoke case compares an
exact ordered transcript; other logging cases parse JSON Lines and make
structural assertions only over the events relevant to that behavior.

The requested threshold filters events by level. Help, version, completions,
and usage failures do not emit diagnostic events. Logging may observe command
decisions but must not change the command result, standard output, exit code,
or final filesystem effects. Instrumented boundary tests separately prove that
logging does not change input reads or write ordering; black-box process
fixtures cannot observe those calls. The ordinary application fixture matrix
runs without logging, so its exact standard error remains empty.

### Validation results

Successful validation and structural nonconformance use one minimal envelope:

```json
{
  "validation": {},
  "snapshotDiff": {},
  "help": []
}
```

`validation` is exactly the applicable
[`validation-result`](../../schema/validation-result.schema.json) value.
`snapshotDiff` is exactly the applicable
[`snapshot-diff`](../../schema/snapshot-diff.schema.json) value. The envelope does
not repeat the command, input path, working directory, validator identity, or
time. The case where the embedded snapshot itself is structurally unusable is
represented by `not-comparable` with reason `invalid-snapshot`.

When an invalid-document manifest entry has no complete validation-result
file, its CLI expectation is composed from the existing manifest: conformance
is `nonconforming`; the named code and path match exactly; the message is
nonempty; and calculations are `not-run` with no applications. This does not
create a duplicate semantic expected-result file merely for the CLI layer.

`help` is empty unless an implemented command can directly remediate the
reported result. A conforming validation whose snapshot status is
`not-recorded` or `mismatch` suggests `record-validation --output
<new-document> <document|->`, preserving the supplied path or `-` operand.
Matching snapshots, structural nonconformance, and invalid embedded snapshots
do not produce that suggestion.

Structural nonconformance is a validation result with exit code `1`, not a
generic command error. It has calculation status `not-run`. Rollup
inconsistency and snapshot mismatch remain successful results with exit code
`0`.

### Operational errors

Input parsing, filesystem, and other operational failures use an error object
instead of a validation envelope:

```json
{
  "error": {
    "operation": "validate",
    "code": "input-not-found",
    "message": "The input path does not exist.",
    "path": "missing.json"
  },
  "help": [
    {
      "executable": "fs",
      "arguments": ["validate", "<existing-document>"]
    }
  ]
}
```

Fixtures fix the exact fields appropriate to each error. Stable V0 usage codes
are not part of the JSON vocabulary; grammar failures use Effect-native text.
Stable operational codes are `input-not-found`, `input-unreadable`,
`input-limit-exceeded`, `invalid-json`, `working-directory-unavailable`,
`output-exists`, `output-parent-not-found`, `output-limit-exceeded`,
`write-failed`, and `internal-error`.

Malformed syntax, trailing content, and duplicate object members all produce
`invalid-json` before JSON Schema validation. Duplicate members are never
resolved with first-value-wins or last-value-wins behavior.

`input-limit-exceeded` reports a raw-byte, JSON-nesting, JSON-value,
nonconforming-document-value, encoded-diagnostic-byte, per-decimal-digit, or
total-decimal-digit budget violation. It has exit code `1`, includes the input
operand in `path` (`-` for standard input), has empty `help`, and creates no
output. The message names the violated budget and its limit without echoing
document content. Diagnostic logging may include only `code`, `source`,
`budget`, and `limit` for this failure.

The fixed V0 input budgets are:

| Budget | Limit | Counting rule |
| --- | ---: | --- |
| `input-bytes` | 16,777,216 | Raw bytes before UTF-8 decoding |
| `json-nesting` | 64 | Active object/array containers; root container is 1 |
| `json-values` | 200,000 | Root plus every member or element value |
| `invalid-document-values` | 256 | Values in nonconforming input |
| `validation-diagnostic-bytes` | 1,048,576 | Encoded diagnostics |
| `decimal-digits` | 1,000 | Digits in one schema-conforming exact decimal |
| `total-decimal-digits` | 1,000,000 | Digits across conforming exact decimals |

The byte reader accepts exactly the limit only after reaching EOF and stops at
the first excess byte. The scanner is iterative. It applies syntax, duplicate,
nesting, and value checks from left to right, so the first encountered owned
failure wins. UTF-8 failure precedes scanning after the byte boundary succeeds.
When a document exceeds the nonconforming-value budget, a fail-fast schema or
semantic pass still permits it if it is conforming but refuses it before
complete diagnostics if it is not. The diagnostic-byte budget is checked
before a validation envelope is encoded. Decimal budgets are checked after
schema conformance and before semantic validation or arithmetic. A
schema-valid snapshot is also decimal-bounded before comparison when an
unrelated structural error makes the containing document nonconforming.

`working-directory-unavailable` applies only when an operation must resolve a
relative path and the process has no usable current directory. It has exit code
`1`, no `path`, empty `help`, and a generic bounded message. Native help,
version, and completions; root discovery; pathless guide, schema, and example
reads; standard input; and absolute input or output paths never acquire the
current directory.

An unexpected implementation defect is translated at the outermost process
boundary to `internal-error`, exit code `1`, and a bounded generic message. The
Node runtime's default cause and stack reporting is disabled. Expected failures
must still use their specific tagged error rather than collapse into this
fallback.

Messages are concise and nonempty but are not compared word-for-word. `help`
is always an array and contains only structured command suggestions that can
correct the error; it is empty when no such correction exists. Each suggestion
has an `executable` and an `arguments` array. Consumers invoke those values
directly without shell parsing; paths and metacharacters remain one argument,
and placeholder values such as `<new-document>` occupy one argument to replace
before invocation. A relative path beginning with `-` is spelled `./-name`;
V0 suggestions do not depend on the `--` end-of-options delimiter. Dependency
names, raw operating-system messages, stack traces, and partial payloads are
never exposed.

Without a native action flag, command grammar is validated before any input is
read or output path is modified. A usage failure therefore takes precedence
over parsing, validation, and filesystem errors. Help, version, and
completions may short-circuit ordinary operand, cardinality, and command-value
validation without entering application I/O. Precedence among combined action
flags, and behavior when `--completions` has no shell value, are
framework-defined and are not supported workflows.

After grammar and native-action handling, relative path resolution precedes
application preflight because no path operation can proceed without it. For
write commands whose paths resolve, an existing destination precedes all input
reads and limits. Input read failures precede byte and decoding results. The
byte boundary precedes UTF-8 and JSON; scanner failures follow their
left-to-right encounter order; schema conformance precedes decimal budgets;
decimal budgets precede semantics and calculations. Render budgets and
missing-parent or commit-time write failures occur only after valid input and
generated output, preserving the filesystem precedence below.

## Exit Codes

- `0`: an action flag or operation completed, including rollup
  inconsistency, snapshot mismatch, and definitive empty results.
- `1`: an operational, parsing, or structural conformance failure prevented
  the requested successful outcome.
- `2`: native command grammar is invalid. The process boundary maps Effect's
  nonempty usage-help failure to this status without translating its text to
  JSON.

## Filesystem Contract

Read-only commands leave every staged file unchanged and create no paths.
Commands with `--output` write atomically to the exact requested new path and
do not create parent directories. Any existing destination, including one with
identical content, produces `output-exists`, exit code `1`, and no change.

Filesystem expectations are exhaustive across the isolated workspace and
fixed home directory after excluding the pre-staged executable. The harness
snapshots both trees before execution and rejects any unlisted creation,
deletion, or content change.

`fs schema` and `fs example` write the exact bundled bytes. `fs create`
preserves the complete candidate bytes from either a path or standard input;
it is not a serializer or normalizer. A structurally conforming but
rollup-inconsistent candidate may be written. Malformed or structurally
nonconforming input creates no output.

Successful `fs schema --output` and named `fs example --output` operations
report only `{"output":{"status":"created","path":"<requested-path>"}}`.
The path is the argument as supplied, not a resolved temporary-workspace path.

`fs create` checks an already-existing destination before reading or
validating the candidate. Therefore `output-exists` wins when both the
candidate is invalid and the destination exists. The implementation must also
enforce no-overwrite at the atomic commit boundary so the preflight check does
not introduce a race.

`fs record-validation` uses the same precedence. It checks an already-existing
destination before reading the input and still enforces no-overwrite at atomic
commit. Missing parents and commit-time write failures occur only after input
validation and snapshot generation.

`fs render` uses the same precedence and atomic commit boundary. It checks an
already-existing destination before reading the input. Missing parents and
commit-time write failures occur only after complete validation and HTML
generation.

A destination below a non-directory path component does not itself exist, so
`ENOTDIR` during the destination preflight does not become `write-failed`.
Input parsing and validation retain precedence; after successful generation,
the writer reports the non-directory parent as `output-parent-not-found`.

Ordinary acceptance cases prove that failed commands leave no partial output.
A separate child-process fault-injection integration test terminates writers
after open, write, sync, close, and link, and verifies the hard-link commit
boundary. A concurrent-writer case verifies exactly one complete winner and
no ordinary temporary-file residue.

Successful creation reports:

```json
{
  "validation": {},
  "snapshotDiff": {},
  "output": {
    "status": "created",
    "path": "result.json"
  },
  "help": []
}
```

Structural refusal returns the same validation information, uses output status
`not-created` with reason `structural-nonconformance`, exits `1`, and leaves
the requested path absent. Preflight and operational failures use the command
error shape instead.

### Recorded documents

`fs record-validation` parses and fully validates the input before replacing
its optional `validationSnapshot`. A present invalid snapshot is structural
nonconformance; the command never strips invalid data to make an input pass.
For a conforming document, the replacement snapshot contains exactly the
current conformance status, calculation status, and rollup applications in
their validation-result order. Rollup inconsistency is recordable.

The generated document is UTF-8 JSON with two-space indentation and one final
LF. It preserves the parsed member order of the input, except that an existing
top-level `validationSnapshot` is removed and the replacement is appended as
the final top-level member. The snapshot's members are ordered `conformance`,
`calculations`, and `applications`; each application preserves the validator's
stable validation-result member order. This is a deterministic CLI encoding,
not a canonical JSON requirement for FS documents generally.

Successful recording reports the current validation, snapshot diff `match`
for the created document, output status `created`, the argument path, and
empty help. Structural refusal reports the input validation and snapshot diff,
output status `not-created` with reason `structural-nonconformance`, and empty
help. Operational errors use operation `record-validation` and the shared
stable error vocabulary.

### Rendered HTML

`fs render` fully validates the input before rendering. Structural
nonconformance, including an invalid embedded snapshot, prevents output;
rollup inconsistency and snapshot mismatch do not. Rollup relationships shape
presentation — row hierarchy, subtotal emphasis, and displayed rollup checks —
but never rendered values or row order. The optional embedded snapshot affects
only the reported validation result, never the rendered output.

The output is one deterministic UTF-8 HTML document with one final LF. It uses
the exact `<!doctype html>` document structure, embedded CSS, and fixed inline
behavior produced by the current executable and covered by executable render
fixtures. Exact presentation bytes are a release-level regression surface,
not a cross-version compatibility guarantee. The document has no external
resources, event-handler attributes, author-controlled HTML, or author-
controlled executable content. The only script is renderer-owned fixed source;
author content is never interpolated into it. Every author-controlled string
emitted into markup or an inert copy source is HTML-escaped. Displayed entity,
scope, statement, item, unit, measure, grouping-column name, and grouping value
content therefore remains text.
`documentId`, optional metadata identifiers, statement, period, item, and unit
identifiers, and embedded validation snapshots are not displayed. `rollupTo`
relationships and item descriptions are presentation inputs, not displayed
text: rollups drive row hierarchy and the displayed rollup-check results
derived from a fresh calculation over the validated document, and descriptions
surface only as escaped tooltip context.

The page title combines the entity name and scope label. Its body shows that
metadata, a document-level rollup-check summary, then every statement in
document order. The body has a renderer-owned ordinal anchor and navigation
link for every statement. These links expose location, not review status or
completion. Each statement is one explicitly captioned native table with
statement-local progressive controls. The table remains the complete no-script
and clipboard-failure fallback. Rows follow item array order; visible columns
are, in order:

1. one `Item` column;
2. one `Unit` column only when the statement is heterogeneous;
3. every declared grouping column in document declaration order; and
4. one value column for every statement period in statement period order.

A statement is homogeneous exactly when every item uses the same unit
identifier. A homogeneous statement displays that resolved unit once above
the table and omits the `Unit` column. A heterogeneous statement has no common
unit display and identifies each row's resolved unit label in its `Unit` cell,
with the full unit text held in a renderer-owned attribute for tooltip
display. Full unit text is `<label> (<measure>, scale <scale>)`; scale is the
literal signed base-ten exponent and is not applied to stored values.

Grouping headers and column toggles display a deterministic humanized form of
the declared identifier: for a purely alphanumeric identifier starting with a
letter, camelCase boundaries become spaces, single leading capitals lowercase,
and the first character capitalizes (`majorGroup` becomes `Major group`); any
other identifier displays verbatim. Copied TSV headers always keep the
declared identifier verbatim. A string grouping value is displayed verbatim;
JSON `null` is displayed as `—`. Grouping cells remain ordinary flat columns.
Equal grouping values do not merge cells or create headings, nesting,
indentation, ordering, or styling. Text columns (item, unit, groupings) and
their headers align left; period value columns and their headers align right
with tabular figures. The item-label column stays pinned while the table
scrolls horizontally.

Row hierarchy derives solely from `rollupTo` within the statement. Rows that
other items roll up into are emphasized as subtotals with a strong top rule
and bold text; rollup roots that receive rollups carry a double rule. Child
rows indent by rollup depth in the item-label cell only. Row relationships are
encoded with renderer-owned index attributes; author identifiers never become
attribute values or executable code.

Instant period headers use the exact date. Duration headers use
`<start> – <end>`. A value cell is read directly from
`item.values[period]`. An exact decimal is displayed with comma digit grouping
in its integer part and its sign, decimal point, and every digit otherwise
verbatim; copied TSV keeps the exact decimal without grouping. JSON `null` is
displayed as `Missing`, and `{ "unavailable": true }` is displayed as
`Unavailable`. Rendering performs no numeric conversion, rescaling, rounding,
aggregation, or derivation, and never restyles a value by its sign or
magnitude.

Each statement with rollup relationships is followed by a native details
disclosure listing its rollup checks, derived from a fresh calculation over
the validated document — never from the embedded snapshot. Each check names
the parent and child item labels as a formula and its period; an evaluable
check shows verbatim actual, expected, difference, and tolerance decimals with
a `= Satisfied` or `≠ Not satisfied` result, while a check that cannot run
names the missing or unavailable cell with a `! Not checked` result. The
masthead summarizes the document-level check count and outcome. Status is
conveyed by glyph and text, never color alone.

The fixed script progressively reveals one `Copy for Excel` button per
statement. A button's accessible name includes its statement label. Each
statement has a visible polite status region whose reserved space prevents
feedback from moving the surrounding content. The script runs only after the
native tables and inert copy sources exist. Each source stores the complete TSV
as JSON string text so every schema-valid code point, including U+0000, survives
HTML parsing; the fixed script decodes that string before copying.

The fixed script also progressively reveals statement-local table tools:
column-visibility toggles for the conditional `Unit` column and each grouping
column, collapse and expand controls for rollup parents, per-parent disclosure
buttons whose collapsed state hides all transitive rollup descendants, a
singleton hover tooltip restating a value cell's visible row and column
context (item, period, full unit text, groupings, value, and any item
description), and a current-statement indicator on the navigation index. All
of it is renderer-owned fixed source reading renderer-owned index attributes.
On narrow viewports the script starts unit and grouping columns toggled off
so item labels and values fit first; the toggles restore them. Collapsing and
column toggles are presentation-only: they never change copied TSV, and
printing forces collapsed rows and toggled-off columns visible. With scripts
disabled, these controls and copy controls remain absent, every row and column
stays visible, and all statements remain readable native tables.

Each copy action transfers exactly one statement as `text/plain` tab-separated
values. The projection is derived from the validated post-preflight render
model rather than parsed from displayed DOM text. It has one header row and
one row per statement item, preserving item order. Columns are, in order:

1. `Item`;
2. `Unit`, always present;
3. every declared grouping column in document declaration order; and
4. one value column for every statement period in statement period order.

The Unit cell for every item uses the same `<label> (<measure>, scale <scale>)`
text as the visible presentation. Period headers use the same instant or
duration labels as the visible table. A string grouping value is copied as
author text and JSON `null` as an empty cell. Exact decimals are copied
verbatim without a text prefix so spreadsheet software may recognize them as
numeric values. Missing and unavailable values are copied as the fixed text
`Missing` and `Unavailable`.

Before author-controlled text enters TSV, every tab, carriage return, or line
feed is replaced by one space. For formula protection, whitespace is exactly
U+0009 through U+000D, U+0020, U+00A0, U+1680, U+2000 through U+200A, U+2028,
U+2029, U+202F, U+205F, U+3000, and U+FEFF. If the first code point outside
that set is `=`, `+`, `-`, or `@`, the renderer prefixes one apostrophe so
spreadsheet software treats the cell as text. This protection applies to item
labels, unit text, grouping-column headers and values, and all other author
text, but not to exact decimal value cells or renderer-owned fixed labels. TSV
uses one U+0009 tab between cells and one U+000A line feed between rows, with
no final line feed. It contains no quoting or embedded row delimiters.

Copy begins only from an explicit button activation. The script first attempts
the asynchronous Clipboard API and falls back to a temporary selected textarea
and the browser's synchronous copy command when the API is missing or rejects.
If that fallback runs, it removes the temporary textarea and restores focus to
the activated button after either success or failure. Every activation first
replaces the prior result with `Copying…`; after the operation settles, the
script applies the final message in a later task so repeated outcomes always
produce a live-region text change. Success reports `Copied`; failure reports
that copying failed and directs the analyst to the native table. Raw browser
errors are not displayed. Feedback is available without color through the
polite status region, and repeated button activation repeats the complete
operation.

Successful rendering reports the input validation and snapshot diff, output
status `created`, the argument path, and empty help. Structural refusal uses
the same validation information, output status `not-created` with reason
`structural-nonconformance`, exits `1`, and leaves the output absent.
Operational errors use operation `render` and the shared stable error
vocabulary.

Rendering computes finite structural budgets with checked arithmetic before
constructing rows or cells. A rendered statement may contain at most 1,000
logical columns including the item-label column and every conditional unit,
grouping, and period column. Across the document, rendered tables may occupy
at most 100,000 logical grid slots after spans are expanded. A statement with
`C` total columns and `R` item rows consumes `C * (R + 1)` slots, including its
header row. Arithmetic that cannot stay within a budget is over-limit without
requiring the exact expanded count to be representable.

After structural preflight, rendering derives visible rows and copy cells
lazily while writing them through the bounded sink; it does not materialize a
complete row set or TSV projection outside that sink. The sink rejects final
UTF-8 HTML larger than 16 MiB (16,777,216 bytes), measured after escaping and
encoding. Copy sources and rollup-check tables do not add logical table-grid
slots, but their encoded bytes remain inside the same document budget. Any
budget violation returns operation `render`, code
`output-limit-exceeded`, exit code `1`, a message naming the budget and limit,
the requested output path, empty help, and no output file.

Precedence is exact. An existing destination wins before input I/O. Input read
and JSON parse failures precede document validation. Schema and semantic
nonconformance, including invalid embedded snapshots, precede render budgets.
For conforming input, inspect statements in order: the first over-limit column
count wins; otherwise checked document-wide grid accumulation is next. The
encoded-byte budget follows structural preflight. Every budget failure
precedes output-parent inspection and commit-time writer failures. Rollup
inconsistency and snapshot mismatch never prevent or reorder rendering.

## Maintained Coverage

### `fs validate`

The suite uses these integration seams rather than repeating every
language-neutral semantic fixture. Paths in the table are relative to
`fixtures/`; a bare filename resolves by its unique basename under that tree.

| Case | Reused input | Exit |
| --- | --- | ---: |
| Valid path with no rollups | `valid/no-rollups.json` | 0 |
| Same document through standard input | same | 0 |
| Rollup inconsistency | `examples/manufacturing-group.json` | 0 |
| Recorded snapshot match | `valid/recorded-snapshot.json` | 0 |
| Recorded snapshot mismatch | `valid/snapshot-mismatch-source.json` | 0 |
| JSON Schema failure | `invalid/decimal-number.json` | 1 |
| Semantic structural failure | `invalid/unresolved-rollup.json` | 1 |
| Invalid embedded snapshot | `duplicate-snapshot-application-key.json` | 1 |
| Out-of-range unit scale | `invalid/scale-above-maximum.json` | 1 |
| Malformed JSON | `raw-input/malformed-json.json.txt` | 1 |
| Trailing content | `raw-input/trailing-content.json.txt` | 1 |
| Duplicate JSON members | `raw-input/duplicate-members.json.txt` | 1 |
| Missing path | staged absent path | 1 |
| Missing or extra argument | none | 2 |
| Unknown flag | any valid staged input | 2 |

Every validation case asserts an unchanged workspace and no created path.

### Native actions, grammar, and logging

Semantic text cases cover top-level and per-command `--help`, representative
`-h` aliases, `--version`, `-v`, and each documented completion shell.
Generated help identifies the active command, required operands, command-local
flags, and the accepted help, version, completions, and log-level built-ins. It
contains no ANSI control sequences and does not expose wizard, prompt, or
interactive surfaces.

The fixed fixture environment disables color. A separate integration test
provides a color-capable terminal and still requires generated help to contain
no ANSI control sequences.

Grammar cases prove:

- missing operands, extra operands, unknown commands, unknown flags, and
  unknown command values use native help and diagnostics with exit code `2`;
- repeated single-valued command-local flags are rejected;
- documented cases place global flags immediately after `fs` and local flags
  before operands, without fixing alternate placement;
- no case promises a subcommand operand after `--`; a leading-dash relative
  filename uses `./-name`; and
- action flags may succeed without ordinary command validation or application
  I/O. Combined action-flag precedence and valueless completions behavior are
  not fixed.

Logging cases prove:

- omitted and explicit `none` logging produce identical standard output and
  empty standard error;
- `debug` validation emits the exact ordered JSON Lines fixed by the fixture;
- a higher threshold suppresses lower-level events without changing stdout;
- operational failure logging structurally contains only translated bounded
  context; and
- an unknown log level fails as usage and leaves the workspace unchanged.

I/O-boundary integration tests prove that omitted, `none`, and enabled logging
preserve the same input-read and write-call order, and that grammar failures
and native actions invoke neither application boundary.

### Discovery and read-only content

Discovery and bundled-content cases cover:

1. `fs` with no arguments: exact discovery JSON, stable executable and npm
   package identities, no selected input, supported artifact version and
   serialization, read/write classification including `record-validation`, and
   complete next commands, plus rejection of an unknown command.
2. `fs guide authoring`: exact generated standalone Markdown and rejection of
   unknown topics or arguments.
3. `fs schema`: all three supported names, exact standard-output payload,
   output creation, unknown name, missing parent, overwrite refusal, and
   duplicate `--output` rejection.
4. `fs example`: exact example list, each named example payload, the resolved
   unnamed-output behavior, output creation, unknown name, missing parent, and
   overwrite refusal. Named output cases reject duplicate `--output`.

The list form does not accept `--output`. Supplying `--output` without an
example name is a native missing-operand usage failure, exits `2`, and does not
touch the requested path.

### `fs create`

Cases cover valid path and standard-input creation, rollup-inconsistent
creation, malformed input, schema and semantic structural refusal, missing or
duplicate `--output`, unknown arguments and flags, missing parents, existing
output, and combined invalid-input/existing-output precedence. Successful
output is byte-for-byte equal to the candidate.

### `fs record-validation`

Cases cover path and standard-input success without a prior snapshot,
replacement of a mismatching snapshot, rollup-inconsistent success, and exact
generated document bytes. Re-validating every expected generated document
produces snapshot status `match`.

Failure and grammar cases cover malformed input, schema and semantic structural
refusal, an invalid embedded snapshot, missing input or parent, existing
output, combined invalid-input/existing-output precedence, missing or duplicate
`--output`, missing or extra input operands, unknown flags, and native command
help. Successful output and every refusal leave the input unchanged, and every
failure creates no output or residue.

Application-boundary tests prove preflight-before-read ordering, one
standard-input read, validation-before-write ordering, and unchanged behavior
with logging. The shared writer fault and concurrency suite owns crash
atomicity and commit-race behavior.

### `fs render`

Cases cover exact HTML from a path for the complete presentation fixture and
from standard input for the minimal example. A rollup-inconsistent,
snapshot-mismatching input proves both states remain renderable while their
content is absent from the HTML. Exact output fixtures prove statement
navigation; statement, item, period, unit, and grouping-column order
independent of definition order; homogeneous-unit collapsing and heterogeneous
row units; exact zero, negative, and fractional decimals; literal scale
metadata; missing and unavailable cells; null and string grouping values; and
escaping of every displayed author-controlled text kind. They also prove that
grouping values and rollups create no hierarchy, merged cells, or subtotal
styling. Focused renderer tests must prove the post-preflight TSV projection,
unconditional Unit column, delimiter normalization, formula protection, null
grouping behavior, and distinct missing and unavailable states. Browser
verification must cover Clipboard API success, forced fallback success, failure
feedback, keyboard operation, and the native-table no-script path.

Failure and grammar cases cover malformed input, schema and semantic structural
refusal, an invalid embedded snapshot, missing input or parent, existing
output, combined invalid-input/existing-output precedence, missing or duplicate
`--output`, missing or extra input operands, unknown flags, native command
help, discovery, and root help. Successful output and every refusal leave the
input unchanged, and every failure creates no output or residue.

Non-directory-parent cases use both malformed and conforming input. Boundary
cases cover checked rejection beyond the column, grid-slot, and encoded-byte
budgets and success at each limit; over-limit rendering never enters the
writer.

Application-boundary tests prove preflight-before-read ordering, one
standard-input read, validation-before-write ordering, unchanged rendered
bytes with logging, and no render write on structural refusal. The shared
writer fault and concurrency suite owns crash atomicity and commit-race
behavior.

## Repository Gate

The packed CLI must continue to satisfy the complete descriptor set. Contract
changes update acceptance prose and visible descriptors before implementation;
intermediate states remain internal or fail closed. The command boundary owns
every accepted output and translates unexpected application defects to
`internal-error` without leaking raw causes. No temporary output shape becomes
part of the acceptance contract.
