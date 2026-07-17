# CLI Acceptance Contract

This contract remains authoritative for the current `0.1` implementation. The
accepted statement-item-row replacement does not change observable process
behavior until the
[Roadmap step-10 refactor](../plans/statement-item-row-refactor.md) updates this
contract, fixtures, and runtime together.

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
literal `Exactly one`. A native variadic ellipsis produced by the beta.98
consume-all refinement is not interpreted as accepting extras. Version cases
assert the exact installed package version, and completion cases assert a
nonempty script for the requested shell; completion metadata does not expand
the accepted command grammar.

An illustrative case descriptor is:

```json
{
  "id": "validate-path-no-rules",
  "command": "fs",
  "arguments": ["validate", "input.json"],
  "workspace": [
    {
      "copy": "../valid/no-calculation-rules.json",
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
          "equalsFile": "../calculation-results/no-rules.json"
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

When an invalid-document manifest entry has no complete calculation-result
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
generic command error. It has calculation status `not-run`. Calculation
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
`invalid-json`, `output-exists`, `output-parent-not-found`,
`output-limit-exceeded`, `write-failed`, and `internal-error`.

Malformed syntax, trailing content, and duplicate object members all produce
`invalid-json` before JSON Schema validation. Duplicate members are never
resolved with first-value-wins or last-value-wins behavior.

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

## Exit Codes

- `0`: an action flag or operation completed, including calculation
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
calculation-inconsistent candidate may be written. Malformed or structurally
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
current conformance status, calculation status, and calculation applications
in their validation-result order. Calculation inconsistency is recordable.

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
calculation inconsistency and snapshot mismatch do not. Calculation rules and
the optional validation snapshot affect the reported validation result but
never the rendered page.

The output is one deterministic UTF-8 HTML document with one final LF. It uses
the exact `<!doctype html>` document structure and embedded CSS fixed by the
executable render fixtures. It contains no scripts, external resources, or
author-controlled HTML. Every author-controlled entity, scope, statement,
unit, measure, dimension, member, item, and entry-override label is escaped as
text. Identifiers and descriptions are not displayed.

The page title combines the entity name and scope label. Its body shows that
metadata, then every statement in document display order. Each statement
shows its label and unit label, measure, and literal base-ten scale. Values are
the exact stored decimal strings: rendering performs no numeric conversion,
rescaling, rounding, aggregation, or calculation.

Each statement is one table. Rows follow `entries`; an item override label
wins over the referenced item's label. A heading spans the whole table and
is a visual separator rendered as an ordinary table cell; it has no table
header scope, row-group semantics, or nesting. Columns are period-major: for
each listed period in display order, enumerate the Cartesian product of listed
axes in axis and member display order, with the first axis changing slowest. A
statement without axes has one column per period. Instant headers use the exact
date; duration headers use `<start> – <end>`. Axis coordinates follow the
period, formatted as `<dimension label>: <member label>` and separated with
` · `.

A cell lookup uses exactly the item, period, statement unit, and complete axis
coordinate. A stored value is displayed verbatim, explicit unavailability is
displayed as `Unavailable`, and an absent coordinate is displayed as
`Missing`. Dimensionless facts therefore do not fill dimensional cells, and
facts with unlisted dimensions are not rendered.

Successful rendering reports the input validation and snapshot diff, output
status `created`, the argument path, and empty help. Structural refusal uses
the same validation information, output status `not-created` with reason
`structural-nonconformance`, exits `1`, and leaves the output absent.
Operational errors use operation `render` and the shared stable error
vocabulary.

Rendering computes finite structural budgets with checked arithmetic before
constructing coordinates, rows, or cells. A rendered statement may contain at
most 1,000 logical columns including its label column, so the current layout
permits at most 999 data columns. Across the document, rendered tables may
occupy at most 100,000 logical grid slots after spans are expanded. A current
statement with `C` data columns and `R` body rows consumes
`(C + 1) * (R + 1)` slots. Arithmetic that cannot stay within a budget is
over-limit without requiring the expanded count to be representable.

After structural preflight, rendering uses a bounded sink and rejects final
UTF-8 HTML larger than 16 MiB (16,777,216 bytes), measured after escaping and
encoding. Any budget violation returns operation `render`, code
`output-limit-exceeded`, exit code `1`, a message naming the budget and limit,
the requested output path, empty help, and no output file.

An existing destination still wins before input I/O. Malformed or structurally
nonconforming input wins before render budgets. Structural budgets precede the
encoded-byte budget; every budget failure precedes parent inspection and
commit-time writer failures.

## Required Cases

### `fs validate`

Start the suite with these integration seams rather than repeating every
language-neutral semantic fixture. Paths in the table are relative to
`fixtures/`; a bare filename resolves by its unique basename under that tree.

| Case | Reused input | Exit |
| --- | --- | ---: |
| Valid path with no rules | `valid/no-calculation-rules.json` | 0 |
| Same document through standard input | same | 0 |
| Calculation inconsistency | `examples/manufacturing-group.json` | 0 |
| Recorded snapshot match | `valid/recorded-snapshot.json` | 0 |
| Recorded snapshot mismatch | `valid/snapshot-mismatch-source.json` | 0 |
| JSON Schema failure | `invalid/decimal-number.json` | 1 |
| Semantic structural failure | `invalid/unresolved-item.json` | 1 |
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

Add semantic text cases for top-level and per-command `--help` and
representative `-h` aliases. Generated help identifies the active command,
required operands, command-local flags, and the accepted help, version,
completions, and log-level built-ins. It contains no ANSI control sequences and
does not expose wizard, prompt, or interactive surfaces. Add success cases for
`--version`, `-v`, and each documented completion shell.

The fixed fixture environment disables color. A separate integration test
provides a color-capable terminal and still requires generated help to contain
no ANSI control sequences.

Add grammar cases that prove:

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

Add logging cases that prove:

- omitted and explicit `none` logging produce identical standard output and
  empty standard error;
- `debug` validation emits the exact ordered JSON Lines fixed by the fixture;
- a higher threshold suppresses lower-level events without changing stdout;
- operational failure logging structurally contains only translated bounded
  context; and
- an unknown log level fails as usage and leaves the workspace unchanged.

Instrument the I/O boundaries in integration tests to prove that omitted,
`none`, and enabled logging preserve the same input-read and write-call order,
and that grammar failures and native actions invoke neither application
boundary.

### Discovery and read-only content

After validation, add cases in this order:

1. `fs` with no arguments: exact discovery JSON, stable executable and npm
   package identities, no selected input, supported artifact version and
   serialization, read/write classification including `record-validation`, and
   complete next commands. Also reject an unknown command.
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

Cover valid path and standard-input creation, calculation-inconsistent
creation, malformed input, schema and semantic structural refusal, missing
`--output`, duplicate `--output`, unknown arguments and flags, missing parent,
existing output, and the combined invalid-input/existing-output precedence
case. Successful output must be byte-for-byte equal to the candidate.

### `fs record-validation`

Cover path and standard-input success without a prior snapshot, replacement of
a mismatching snapshot, calculation-inconsistent success, and exact generated
document bytes. Re-validating every expected generated document must produce
snapshot status `match`.

Cover malformed input, schema and semantic structural refusal, an invalid
embedded snapshot, missing input, missing parent, existing output, and the
combined invalid-input/existing-output precedence case. Cover missing and
duplicate `--output`, missing and extra input operands, unknown flags, and
native command help. Successful output and every refusal leave the input
unchanged, and every failure creates no output or residue.

Instrument the application boundary to prove preflight-before-read ordering,
one standard-input read, validation-before-write ordering, and unchanged
behavior with logging. The shared writer fault and concurrency suite continues
to own crash atomicity and commit-race behavior.

### `fs render`

Cover exact HTML from a path for the complete presentation fixture and from
standard input for the minimal example. Cover a calculation-inconsistent,
snapshot-mismatching input to prove both states remain renderable while their
content is absent from the HTML. Exact output fixtures prove statement,
period, axis, member, and row ordering; dimensionless and dimensional lookup;
exact zero, negative, and fractional decimals; literal scale metadata;
missing and unavailable cells; entry-label override; heading behavior; and
escaping of every author-controlled label kind.

Cover malformed input, schema and semantic structural refusal, an invalid
embedded snapshot, missing input, missing parent, existing output, and the
combined invalid-input/existing-output precedence case. Cover missing and
duplicate `--output`, missing and extra input operands, unknown flags, native
command help, discovery, and root help. Successful output and every refusal
leave the input unchanged, and every failure creates no output or residue.

Cover a non-directory output parent with both malformed and conforming input.
Cover checked rejection beyond the column, grid-slot, and encoded-byte budgets
and success at each boundary; prove that over-limit rendering never enters the
writer.

Instrument the application boundary to prove preflight-before-read ordering,
one standard-input read, validation-before-write ordering, unchanged rendered
bytes with logging, and no render write on structural refusal. The shared
writer fault and concurrency suite continues to own crash atomicity and
commit-race behavior.

## Implementation Gate

The packed CLI must satisfy the complete contract. Intermediate migrations
either remain internal or fail closed; they must not weaken semantic
validation, exact content, logging, filesystem safety, or defect redaction.
The command boundary must own every accepted output and translate unexpected
application defects to `internal-error` without leaking raw causes. Pending
cases remain visible, and no temporary output shape becomes part of the
acceptance contract.
