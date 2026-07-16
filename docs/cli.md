# CLI Design

Status: core agent-first command contracts, deterministic acceptance protocol,
public npm identity, and the TypeScript, Effect 4, Node, and npm implementation
direction defined; acceptance fixtures and implementation are pending.

## Design Boundary

The CLI is a reference consumer and authoring aid for complete FS documents.
It owns contract discovery, validation, safe writes, validation snapshots, and
presentation. It must not become the place where undocumented document
semantics live.

The CLI is file-first rather than a field-by-field financial editor. An author
or upstream agent supplies a complete candidate document; the CLI checks the
whole contract before any requested write. It does not extract source
material, choose item meanings, prescribe statement contents, infer values,
convert units, or repair financial ambiguity.

The [semantic specification](semantic-spec.md),
[schemas](../schema/), and [fixtures](../fixtures/) fix the artifact-dependent
result fields, calculation identities, snapshot contents, and presentation
semantics. The [authoring guide](authoring.md) owns the document-encoding
workflow. The [CLI acceptance contract](cli-acceptance.md) fixes invocation,
result encoding, standard streams, exit codes, and filesystem effects.

Canonical FS documents, schemas, and examples remain JSON. CLI result encoding
is a separate output boundary. JSON is the default V0 result and error
encoding, and `fs validate --format json` selects it explicitly. A compact
agent-oriented encoding such as TOON may be added only after its supported
specification version and exact acceptance contract are pinned.

## Runtime and Distribution

Implement the reference CLI in strict TypeScript for supported Node.js LTS
lines beginning with Node 22. Use Effect 4 as the application runtime,
`effect/unstable/cli` for typed command definitions and dispatch, and
`@effect/platform-node` for Node services. Publish one standard npm package,
`@cpai/fs`, with the executable name `fs`. The primary zero-global-install form
is:

```sh
npx -y @cpai/fs@<version> <command>
```

Global npm installation remains optional. pnpm will be pinned as the repository
package manager, not a user prerequisite. Bun is neither a required runtime nor
a separate implementation; `bunx` compatibility and compiled executables may
be evaluated later as additive distribution options.

Pin the coordinated Effect 4 packages to exact versions while V4 remains
prerelease. Do not mix Effect family versions or use the stable Effect 3
`@effect/cli` package. Upgrade Effect only through a deliberate dependency
change that reruns the complete unit, process, package, and cross-platform
suite.

Effect CLI owns tokenization, subcommand selection, argument and flag parsing,
and the command help model. `Command.runWith` is the current runner candidate.
Inspection of the exact candidate Effect CLI source, declarations, tests, and
public exports must establish whether a narrow adapter can own the process
contract without importing internals or duplicating parsing. The production
adapter buffers framework output, renders exact Markdown help, maps `CliError`
values to stable FS error objects, and converts every command into one final
stdout payload and exit code. Raw Effect causes, default help, dependency
output, and runtime stack traces must not reach the process streams.

Use strict `tsc` checking. Select bundled or unbundled ESM during production
scaffolding from retained packed-package size, cold local `npx`, and warm
startup tests. Schemas, examples, and generated guidance remain exact package
files outside the JavaScript bundle and come from one owned asset boundary.

This choice optimizes one-command, zero-global-install use for people and
agents that already have a supported Node/npm installation. It does not remove
the Node runtime prerequisite. If release evidence shows that prerequisite is
a material adoption barrier, add signed standalone executables as another
distribution form without changing the CLI contract or maintaining a second
implementation.

Package choice does not change the process contract. Acceptance fixtures invoke
the staged `fs` executable directly, and an installed package invokes the same
entry point with the same stdout, stderr, and exit-code behavior. Package-manager
download and cache effects are outside the child CLI process contract and are
tested separately. Schemas, examples, and generated guidance are published as
exact package assets and remain usable offline after installation.

Effect Schema may model internal command results and tagged errors, but the
published JSON Schemas and semantic specification remain authoritative for FS
documents. Ajv still validates those bundled Draft 2020-12 schemas; adopting
Effect must not create a second document contract.

## Global Flags

Every command path supports:

- `--help` and its `-h` alias, which write the exact accepted Markdown help to
  standard output and exit `0`; and
- `--log-level <all|trace|debug|info|warn|warning|error|fatal|none>`, which
  enables Effect logging at the requested threshold. `warning` is an alias for
  `warn`, and omitting the flag is equivalent to `none`.

Effect CLI's current `Command.runWith` runner includes help, version,
completions, and log-level built-ins. The FS contract exposes only help and
log-level. The process adapter must reject version and completions in their
global scopes without rejecting the command-local schema `--version` flag.
Wizard mode, prompts, and any other framework surface are also outside V0. The
source inspection must establish a public integration path for controlling
these built-ins without duplicating Effect CLI parsing. Retained production
process tests verify the accepted and rejected flags, local schema `--version`
precedence, exact help, stream contents, and exit codes. If the public seam is
not viable, revise the runner integration before production implementation.

Use Effect's logging APIs and log annotations at meaningful decision points,
including command dispatch, input selection, decode and validation outcomes,
snapshot comparison, and output preflight and commit. A custom Effect logger
emits one canonical JSON object per line to standard error when logging is
enabled. Entries contain level, event, and operation fields plus only the
bounded context needed to diagnose the decision. They omit wall-clock time,
fiber identifiers, spans, document contents, raw dependency errors, and stack
traces. The record schema, thresholds, and redaction rules are stable; one
canonical smoke transcript is exact, while other logging tests make structural
assertions so internal event sequencing can evolve.

Application modules do not call the global `console` directly. Final result
output goes through the process adapter, and every diagnostic event goes
through Effect logging and the custom logger sink.

Logging is silent by default and never writes to standard output. Enabling it
must not change the command result, exit code, ordering, or filesystem effects.
Help and usage-error paths do not emit diagnostic logs.

The top-level Effect is converted to an owned process outcome before execution.
The Node runtime disables its default error reporting, and any unexpected defect
becomes a bounded `internal-error` result with exit code `1`; no pretty cause or
stack trace may bypass the adapter.

## Command Surface

### `fs`

With no arguments, report concise machine-readable discovery rather than a
full manual. The result identifies:

- the stable executable name, npm package identity, and one-sentence purpose;
- supported FS artifact versions and canonical serialization;
- available commands and whether each command reads or writes; and
- complete next commands for authoring guidance, schema discovery, examples,
  and validation.

No input document is selected, so the command states that definitively. It
does not scan the current directory or infer document identity from filenames.

### `fs guide authoring`

Present the encoding prerequisites, artifact workflow, refusal to infer missing
financial decisions, and validation loop from the
[authoring guide](authoring.md). The command and installable Agent Skill must be
generated or checked from the same source so their instructions cannot drift.
The command writes that maintained guidance as Markdown rather than escaping it
inside a result object.

The guide routes to the schema, examples, and deeper semantic references; it
does not embed the complete schema or fixture suite in default agent context.

### `fs schema <name> [--version <version>] [--output <path>]`

Return an exact bundled JSON Schema. V0 schema names are `document`,
`validation-result`, and `snapshot-diff`; the default version is `0.1` while
that is the only supported artifact version.

Without `--output`, the schema itself is written to standard output as JSON.
That direct payload preserves the exact bundled bytes. With `--output`, the CLI
writes those bytes to exactly the requested path, reports file creation as a
structured result on standard output, and fails rather than overwriting an
existing file.

### `fs example`

List the bundled examples with their purpose and expected calculation status.
This form does not accept `--output`; `fs example --output <path>` is a usage
error with exit code `2` because it does not select one payload to write.

### `fs example <name> [--output <path>]`

With no output path, return the named example's exact bundled JSON on standard
output. With an output path, write the exact bundled bytes and report file
creation as a structured result.

Examples contain illustrative facts and are not partially completed documents
or prescribed statement templates. In particular, `manufacturing-group` is
structurally conforming but intentionally calculation-inconsistent.

### `fs validate <document|-> [--format json]`

Read a path or standard input (`-`) without modifying it and report:

- structural conformance;
- current calculation consistency, including expected and stored values;
- why any rule applications were skipped or could not be evaluated; and
- differences from an embedded validation snapshot, when present.

A document with no calculation rules is a definitive successful result that
states that no calculation rules were defined. If rules exist but none apply,
the calculation status is `not-evaluated`. Calculation inconsistency does not
turn a structurally conforming document into a structurally invalid one.
Structural nonconformance produces calculation status `not-run` because facts
and rule references are not reliable enough to evaluate.

When no validation snapshot is present, the command says so explicitly. If the
document is structurally conforming, it suggests a complete
`fs record-validation` command template. Structural nonconformance does not
suggest an operation that must refuse to write. When a snapshot is present,
validation reports either an exact match or a deterministic diff. It never
discovers snapshots through filenames or neighboring files.

Standard output is a minimal object containing `validation`, `snapshotDiff`,
and `help`. The result values preserve the existing language-neutral objects
exactly when the embedded snapshot is comparable. A present but structurally
invalid snapshot produces snapshot-diff status `not-comparable` with reason
`invalid-snapshot`. Parsing, usage, and operational failures use a structured
error object instead; structural nonconformance remains a validation result.

### `fs create <candidate|-> --output <document>`

Validate a complete candidate and atomically write it to the exact requested
new path. This is the authoring commit boundary, not a document generator. The
command:

- accepts a candidate path or standard input;
- runs complete structural and calculation validation;
- writes only a structurally conforming FS document;
- may write a calculation-inconsistent document because it remains
  structurally consumable;
- never modifies the candidate or overwrites an existing output;
- preserves the candidate bytes exactly rather than reserializing or
  normalizing them; and
- never coerces decimals, infers facts, fills totals, changes values, or
  performs financial repairs.

Its structured result includes the same current validation information as
`fs validate` and identifies whether the requested output path was created.
An existing destination is rejected before candidate validation and is also
protected at the atomic commit boundary.

### `fs record-validation <document|-> --output <new-document>`

Recompute validation and write a new ordinary FS document containing the
current validation snapshot. The command:

- never modifies its input;
- writes atomically to exactly the requested new path;
- fails rather than overwriting an existing path; and
- gives the output filename no semantic meaning.

If the input already contains a snapshot, the new document replaces that
snapshot rather than accumulating history. Calculation inconsistency may be
recorded; structural nonconformance prevents the new document from being
written.

### `fs render <document|-> --output <html>`

Produce a simple standalone HTML presentation without changing document
semantics. The output path is required so structured command results remain on
standard output. Rendering consumes the flat presentation model and does not
infer statement hierarchy, calculations, or missing facts.

## Commands Intentionally Absent

- `fs init` does not create a blank FS document. The V0 contract requires
  nonempty definitions, facts, and statements; illustrative placeholders can
  be mistaken for financial data.
- `add-account`, `add-row`, `set-cell`, `add-item`, and `add-fact` are not V0
  commands. `Item`, not account, row, or cell, is the format's financial term,
  and field-by-field mutation creates inefficient, transiently invalid state.
- Statement-type templates are not provided because FS does not prescribe a
  taxonomy or statement contents.
- `import-xbrl`, `import-sec`, `from-csv`, and source mapping are outside the
  project boundary, not core format commands.
- `repair`, `fix`, `normalize`, `calculate`, and `fill-totals` are omitted
  because apparent corrections commonly require author judgment and rules
  never materialize values.

If later evidence supports mutation, prefer one atomic batch change document
with validated, non-overwriting output over a sequence of stateful commands.

## Interaction Invariants

- Every operation is completable without an interactive prompt.
- All document-reading commands accept a path or standard input where shown.
- Unknown arguments and flags are rejected rather than ignored.
- Structured results, errors, and actionable corrections are written to
  standard output. Opt-in Effect diagnostic logs go to standard error.
- Standard error is empty when `--log-level` is omitted or `none`. Enabled
  logging is deterministic JSON Lines and never includes progress text.
- Structural errors use stable codes and JSON Pointer paths.
- Errors identify the failed operation and suggest a concrete correction
  without exposing internal stack traces or dependency output.
- Result ordering is deterministic so outputs and snapshots can be diffed.
- Commands that write files require an explicit output path, write atomically,
  and never overwrite.
- Artifact, schema, and example payloads are JSON. Structured V0 results and
  errors default to JSON; unsupported formats are usage errors.
- Default output is concise but definitive about empty or absent states and
  includes only next commands relevant to the result.

## Exit Codes

- `0`: the operation completed; for document commands, the input was
  structurally conforming, including results with calculation inconsistency or
  snapshot mismatch;
- `1`: an operational, input parsing, or structural conformance failure
  prevented the requested successful outcome; and
- `2`: invalid command usage.

An explicit future `--fail-on` policy may let CI treat calculation
inconsistency or snapshot mismatch as nonzero without collapsing those states
into structural nonconformance. Its exact values belong in acceptance
fixtures before implementation.

## Agent Integration

Ship an on-demand Agent Skill for FS authoring. It should teach the authoring
contract for an already-resolved financial model, identify missing prerequisite
inputs without supplying them, invoke the reference validator, and route
structured diagnostics back into an encoding repair loop. Static skill
guidance and `fs guide authoring` share one maintained source. The installed CLI
guide renders commands with `fs`; the generated Skill pins the released npm
package and renders commands as `npx -y @cpai/fs@<version> ...` so it does not
assume a global installation.

## Implementation Order

The detailed phase gates and implementation handoff are maintained in the
[V0 CLI delivery plan](plans/cli-v0.md).

1. Apply the confirmed decisions to their remaining contract artifacts and
   inspect exact candidate coordinated Effect package source and public
   exports. Record the public integration seam and assign source-opaque Effect
   behavior to retained production tests.
2. Add deterministic acceptance fixtures using the
   [acceptance protocol](cli-acceptance.md), starting with `validate`, then
   no-argument discovery, `guide`, `schema`, `example`, and `create`.
3. Build the production adapter and a thin `validate` path directly. Retain
   the process, logging, package, parsing, schema, asset, and build-layout tests
   used to verify it, and do not claim full conformance for documents that have
   not passed semantic validation.
4. Add every semantic conformance check, exact calculation evaluation, and
   snapshot diff required by the language-neutral fixtures.
5. Add the read-only discovery commands: no-argument output, `guide`, `schema`,
   and `example`.
6. Add `create` as an atomic validated write over the complete validator.
7. Generate or verify the installable Agent Skill from the maintained
   authoring guidance and command examples.
8. Add snapshot recording only after result identities are stable.
9. Add rendering over the proven flat statement model.
