# CLI Acceptance Contract

Status: deterministic V0 fixture protocol and the TypeScript, Effect 4, Node,
and npm implementation direction defined; six command, parsing, and
portability decisions, fixture manifests, and cases are pending.

## Purpose

CLI acceptance fixtures fix the observable process contract of the reference
`fs` executable. They invoke a local process and compare its arguments, input,
standard streams, exit code, and filesystem effects. They do not invoke an AI
model, score prose, or make fuzzy judgments.

The existing [language-neutral fixtures](../fixtures/) remain the source of
truth for document conformance, calculation results, and validation snapshot
diffs. CLI fixtures reference those documents and results rather than copying
their semantic test matrix. The planned location is `fixtures/cli/`.

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
            "fs record-validation input.json --output <new-document>"
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
flags shown in the [CLI design](cli.md). A compact encoding such as TOON is
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

The implementation uses Effect logging with machine-readable event names and log
annotations. When enabled, a custom Effect logger writes one canonical JSON
object plus LF per event to standard error. Each object contains `level`,
`event`, `operation`, and only allowlisted bounded context. JSON member order is
canonical. Entries omit wall-clock timestamps, fiber identifiers, spans,
document contents, raw dependency messages, causes, and stack traces.

The log record shape, levels, threshold behavior, and redaction rules are the
stable V0 contract. Individual event catalogs and unrelated event order are
internal observability details. One canonical validation smoke case compares an
exact ordered transcript; other logging cases parse JSON Lines and make
structural assertions only over the events relevant to that behavior.

Application code does not write diagnostic messages through the global
`console` or a second logging library. Only the final process adapter may emit
accepted result output, and only the Effect logger sink may emit diagnostic
standard error.

The requested threshold filters events using Effect log levels. Help and usage
errors do not emit diagnostic events. Logging may observe command decisions but
must not change the command result, standard output, exit code, or final
filesystem effects. Instrumented boundary tests separately prove that logging
does not change input reads or write ordering; black-box process fixtures cannot
observe those calls. The ordinary fixture matrix runs without logging so its
exact standard error remains the empty string.

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
[`validation-result`](../schema/validation-result.schema.json) value.
`snapshotDiff` is exactly the applicable
[`snapshot-diff`](../schema/snapshot-diff.schema.json) value. The envelope does
not repeat the command, input path, working directory, validator identity, or
time. The case where the embedded snapshot itself is structurally unusable is
the open result-shape decision below.

When an invalid-document manifest entry has no complete calculation-result
file, its CLI expectation is composed from the existing manifest: conformance
is `nonconforming`; the named code and path match exactly; the message is
nonempty; and calculations are `not-run` with no applications. This does not
create a duplicate semantic expected-result file merely for the CLI layer.

When a structurally conforming document has no recorded snapshot, `help`
contains one complete `fs record-validation` command template. It carries
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
  "help": ["fs validate <existing-document> --format json"]
}
```

Fixtures fix the exact fields appropriate to each error. Stable V0 usage codes
include `missing-argument`, `unexpected-argument`, `unknown-command`,
`unknown-flag`, `unknown-schema`, `unknown-example`, `unsupported-version`,
and `unsupported-format`. Stable operational codes include `input-not-found`,
`input-unreadable`, `invalid-json`, `output-exists`,
`output-parent-not-found`, `write-failed`, and `internal-error`.

An unexpected implementation defect is translated at the outermost process
boundary to `internal-error`, exit code `1`, and a bounded generic message. The
Node runtime's default cause and stack reporting is disabled. Expected failures
must still use their specific tagged error rather than collapse into this
fallback.

Messages are concise and nonempty but are not compared word-for-word. `help`
is always an array and contains only complete command templates that can
correct the error; it is empty when no such correction exists. Dependency
names, raw operating-system messages, stack traces, and partial payloads are
never exposed.

Command and flag usage is validated before any input is read or output path is
modified. A usage error therefore takes precedence over parsing, validation,
and filesystem errors.

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
Crash-level atomicity requires a separate fault-injection integration test; a
post-execution fixture alone cannot prove it.

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
language-neutral semantic fixture:

| Case | Reused input | Exit |
| --- | --- | ---: |
| Valid path with no rules | `valid/no-calculation-rules.json` | 0 |
| Same document through standard input | same | 0 |
| Calculation inconsistency | `examples/manufacturing-group.json` | 0 |
| Recorded snapshot match | `valid/recorded-snapshot.json` | 0 |
| Recorded snapshot mismatch | `valid/snapshot-mismatch-source.json` | 0 |
| JSON Schema failure | `invalid/decimal-number.json` | 1 |
| Semantic structural failure | `invalid/unresolved-item.json` | 1 |
| Invalid embedded snapshot | duplicate snapshot application key | 1 |
| Out-of-range unit scale | one new language-neutral invalid fixture | 1 |
| Malformed JSON | one new raw-input fixture | 1 |
| Duplicate JSON members | one new raw-input fixture | 1 |
| Missing path | staged absent path | 1 |
| Missing or extra argument | none | 2 |
| Unknown flag or unsupported format | any valid staged input | 2 |

Every validation case asserts an unchanged workspace and no created path.

### Global help and logging

Add exact cases for top-level and per-command `--help` and representative `-h`
aliases; the accepted Markdown lists both help spellings and `--log-level` but
does not expose Effect's wizard, completions, version, or other unaccepted
built-ins. Add logging cases that prove:

- omitted and explicit `none` logging produce identical standard output and
  empty standard error;
- `debug` validation emits the exact ordered JSON Lines fixed by the fixture;
- a higher threshold suppresses lower-level events without changing stdout;
- operational failure logging structurally contains only translated bounded
  context; and
- an unknown log level fails as usage and leaves the workspace unchanged.

Instrument the Effect services in integration tests to prove that omitted,
`none`, and enabled logging preserve the same input-read and write-call order,
and that invalid global flags invoke neither boundary.

Add explicit rejection cases for global `--version`, `-v`, and `--completions`,
plus a success case proving that
`fs schema <name> --version <artifact-version>` still selects the command-local
schema version flag. This also locks a documented positional-then-flag
invocation so an Effect CLI prerelease upgrade cannot silently narrow the
accepted grammar.

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

### `fs create`

Cover valid path and standard-input creation, calculation-inconsistent
creation, malformed input, schema and semantic structural refusal, missing
`--output`, unknown arguments and flags, missing parent, existing output, and
the combined invalid-input/existing-output precedence case. Successful output
must be byte-for-byte equal to the candidate.

## Open Contract Decisions

These decisions must be fixed in this document and the acceptance fixtures
before reference CLI implementation begins:

1. **Structurally invalid embedded snapshot.**
   [`duplicate-snapshot-application-key.json`](../fixtures/invalid/duplicate-snapshot-application-key.json)
   is a nonconforming document whose attempted snapshot cannot produce a valid
   `match`, `mismatch`, or `not-recorded` result. The recommended resolution is
   a language-neutral `not-comparable` snapshot-diff status with stable reason
   `invalid-snapshot`, followed by schema and fixture coverage. Reinterpreting
   the case as `not-recorded` would hide a present but unusable snapshot.
2. **Unnamed example output.** The current command spelling permits
   `fs example --output <path>` syntactically even though no single example is
   selected. The recommended resolution is to reject it as a usage error and
   document two forms: `fs example` and
   `fs example <name> [--output <path>]`.
3. **Portable guide payload.** The CLI and installable Agent Skill need one
   maintained source whose generated links and commands work outside a
   repository checkout. The recommended resolution is two byte-stable targets:
   `fs guide authoring` uses complete installed `fs` commands, while the Agent
   Skill uses pinned `npx -y @cpaikr/fs@<version>` commands. Acceptance fixtures
   compare CLI output byte-for-byte with the installed-CLI target; generation
   checks keep both targets synchronized with the source.
4. **Command help.** The command surface accepts `--help` and `-h` but does not
   yet fix their exact top-level or per-command payloads. The recommended
   resolution is concise Markdown on standard output with exit code `0`, empty
   standard error, required arguments, flags with defaults, and two or three
   non-interactive examples. Add exact acceptance cases for the top level and
   every subcommand, with representative alias equivalence.
5. **Duplicate JSON members.** JSON parsers disagree about duplicate object
   member names, and a last-value-wins decoder would silently change the input
   data model. The recommended resolution is to reject duplicates as
   `invalid-json` before JSON Schema validation and add a deterministic raw
   input case outside the document fixture manifest.
6. **Numeric scale portability.** `unit.scale` is currently an unbounded JSON
   integer, which ordinary JavaScript JSON values cannot always represent
   exactly. The recommended resolution is to constrain it to the inclusive
   safe-integer range `-9007199254740991` through `9007199254740991`, update the
   semantic specification and schema, and add boundary and out-of-range
   language-neutral fixtures before CLI cases are fixed.

## Implementation Gate

These fixtures describe the final V0 contract even while implementation is
incremental. The first implementation slice may wire argument handling, input
reading, JSON parsing, and JSON Schema validation, but it must not be released
as a full validator while schema-valid documents can bypass semantic checks.

Intermediate work either remains internal or fails closed after the checks it
can perform. It must not label an arbitrary schema-valid document as
`conforming`. The Effect CLI adapter must also fail closed until it can suppress
framework output, translate every accepted `CliError`, convert unexpected
defects to `internal-error`, and prevent raw runtime causes from reaching either
stream with Node runtime error reporting disabled. Test selection may run the
implemented deterministic subset, but pending cases remain visible and no
temporary output shape becomes part of the acceptance contract.
