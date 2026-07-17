# CLI Acceptance Contract

## Purpose

CLI acceptance fixtures fix the observable process contract of the reference
`fs` executable. They invoke a local process and compare its arguments, input,
standard streams, exit code, and filesystem effects. They do not invoke an AI
model, score prose, or make fuzzy judgments.

The [semantic specification](../semantic-spec.md) defines artifact behavior.
Existing [language-neutral fixtures](../../fixtures/) provide authoritative
expected artifact results. CLI cases reuse them instead of copying their
semantic matrix. The planned location is `fixtures/cli/`.

## Fixture Protocol

Each case records:

- the executable name and an argument array, without shell parsing;
- an isolated working directory and any files copied into it;
- either no standard input or the exact fixture bytes supplied to standard
  input;
- the expected standard-output encoding and structured value or exact payload;
- expected standard error: exact bytes for ordinary cases, or a structured
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

An illustrative case descriptor is:

```json
{
  "id": "validate-path-no-rules",
  "command": "fs",
  "arguments": ["validate", "input.json", "--format", "json"],
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
          "equals": [
            {
              "executable": "fs",
              "arguments": [
                "record-validation",
                "input.json",
                "--output",
                "<new-document>"
              ]
            }
          ]
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

The fixture schema, once added, is authoritative for descriptor mechanics. It
uses generic JSON Pointer equality and nonempty-string assertions rather than
command-specific matcher fields. This document is authoritative for observable
CLI behavior.

## Output Contract

JSON is the default V0 encoding for structured CLI results and errors. For
`fs validate`, `--format json` selects the same encoding explicitly and any
other value is a usage error with exit code `2`. Other commands accept only the
flags shown in the [CLI design](design.md). A compact encoding such as TOON is
future, additive work that requires a pinned specification version and its own
acceptance cases.

Commands that return content use the content's maintained encoding rather than
escaping it inside a result object:

- bundled schemas and named examples are JSON; and
- authoring guidance is Markdown.

No progress text is written to standard output. Structured errors are written
to standard output. Standard error is empty when `--log-level` is omitted or
set to `none`. Explicit logging cases compare deterministic diagnostic JSON
Lines on standard error without changing the expected standard output, exit
code, or filesystem state.

### Diagnostic logging

Every command path accepts
`--log-level <all|trace|debug|info|warn|warning|error|fatal|none>`. Omitting the
flag is equivalent to `none`, and `warning` is an alias for `warn`. An invalid
value is a usage error with exit code `2`, structured standard output, and
empty standard error.

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

The requested threshold filters events by level. Help and usage errors do not
emit diagnostic events. Logging may observe command decisions but must not
change the command result, standard output, exit code, or final filesystem
effects. Instrumented boundary tests separately prove that logging does not
change input reads or write ordering; black-box process fixtures cannot observe
those calls. The ordinary fixture matrix runs without logging, so its exact
standard error remains empty.

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

When a structurally conforming document has no recorded snapshot, `help`
contains one structured `fs record-validation` argv suggestion. It carries
forward the path input or `-` and uses `<new-document>` for the required output
path. When a snapshot exists, or when structural nonconformance prevents
recording, `help` is empty.

Structural nonconformance is a validation result with exit code `1`, not a
generic command error. It has calculation status `not-run`. Calculation
inconsistency and snapshot mismatch remain successful results with exit code
`0`.

### Command errors

Usage, input parsing, filesystem, and other operational failures use an error
object instead of a validation envelope:

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
      "arguments": ["validate", "<existing-document>", "--format", "json"]
    }
  ]
}
```

Fixtures fix the exact fields appropriate to each error. Stable V0 usage codes
include `missing-argument`, `unexpected-argument`, `unknown-command`,
`unknown-flag`, `unknown-schema`, `unknown-example`, `unsupported-version`,
`unsupported-format`, and `unsupported-log-level`. Stable operational codes
include `input-not-found`, `input-unreadable`, `invalid-json`, `output-exists`,
`output-parent-not-found`, `write-failed`, and `internal-error`.

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
leading-dash operands follow `--`, and placeholder values such as
`<new-document>` occupy one argument to replace before invocation. Dependency
names, raw operating-system messages, stack traces, and partial payloads are
never exposed.

Command and flag usage is validated before any input is read or output path is
modified. A usage error therefore takes precedence over parsing, validation,
and filesystem errors.

`--help` relaxes only absent command requirements in an otherwise-valid command
prefix. Supplied extra operands, unknown names or topics, unsupported versions
or formats, and invalid or valueless options remain usage errors with exit code
`2`, even when `--help` is also present.

## Exit Codes

- `0`: the operation completed, including calculation inconsistency, snapshot
  mismatch, and definitive empty results.
- `1`: an operational, parsing, or structural conformance failure prevented
  the requested successful outcome.
- `2`: the command, arguments, flags, or requested format are invalid.

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
| Unknown flag or unsupported format | any valid staged input | 2 |

Every validation case asserts an unchanged workspace and no created path.

### Global help and logging

Add exact cases for top-level and per-command `--help` and representative `-h`
aliases; the accepted Markdown lists both help spellings and `--log-level` but
does not expose wizard, completions, version, or other unaccepted built-ins.
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
and that invalid global flags invoke neither boundary.

Add explicit rejection cases for global `--version`, `-v`, and `--completions`,
plus a success case proving that
`fs schema <name> --version <artifact-version>` still selects the command-local
schema version flag. This also locks a documented positional-then-flag
invocation so a dependency upgrade cannot silently narrow the accepted
grammar.

Add `--help` precedence cases proving that invalid supplied names, versions,
formats, and extra operands remain errors. Help succeeds for valid invocations,
including otherwise-valid prefixes with absent command requirements.

### Discovery and read-only content

After validation, add cases in this order:

1. `fs` with no arguments: exact discovery JSON, stable executable and npm
   package identities, no selected input, supported artifact version and
   serialization, read/write classification, and complete next commands. Also
   reject an unknown command.
2. `fs guide authoring`: exact generated standalone Markdown and rejection of
   unknown topics or arguments.
3. `fs schema`: all three supported names, default and explicit version `0.1`,
   exact standard-output payload, output creation, unknown name, unsupported
   version, missing parent, and overwrite refusal.
4. `fs example`: exact example list, each named example payload, the resolved
   unnamed-output behavior, output creation, unknown name, missing parent, and
   overwrite refusal.

The list form does not accept `--output`. Supplying `--output` without an
example name is a `missing-argument` usage error, exits `2`, and does not touch
the requested path.

### `fs create`

Cover valid path and standard-input creation, calculation-inconsistent
creation, malformed input, schema and semantic structural refusal, missing
`--output`, unknown arguments and flags, missing parent, existing output, and
the combined invalid-input/existing-output precedence case. Successful output
must be byte-for-byte equal to the candidate.

## Implementation Gate

These fixtures describe the final V0 contract even while implementation is
incremental. The first implementation slice may wire argument handling, input
reading, JSON parsing, and JSON Schema validation, but it must not be released
as a full validator while schema-valid documents can bypass semantic checks.

Intermediate work either remains internal or fails closed after the checks it
can perform. It must not label an arbitrary schema-valid document as
`conforming`. The process adapter must also fail closed until it can own every
accepted output and translate unexpected defects to `internal-error` without
leaking raw causes. Pending cases remain visible, and no temporary output shape
becomes part of the acceptance contract.
