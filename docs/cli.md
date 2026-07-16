# CLI Design

Status: agent-first command contracts defined; implementation and acceptance
fixtures are pending.

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
semantics. The [authoring guide](authoring.md) owns the source-to-document
workflow.

Canonical FS documents, schemas, and examples remain JSON. CLI result encoding
is a separate output boundary and must always have a lossless JSON form. A
compact agent-oriented encoding such as TOON may also be provided after its
supported specification version and exact output contract are pinned.

## Command Surface

### `fs`

With no arguments, report concise machine-readable discovery rather than a
full manual. The result identifies:

- the resolved executable path and one-sentence purpose;
- supported FS artifact versions and canonical serialization;
- available commands and whether each command reads or writes; and
- complete next commands for authoring guidance, schema discovery, examples,
  and validation.

No input document is selected, so the command states that definitively. It
does not scan the current directory or infer document identity from filenames.

### `fs guide authoring`

Present the concise authoring workflow, conservative defaults, required author
decisions, and validation loop from the [authoring guide](authoring.md). The
command and installable Agent Skill must be generated or checked from the same
source so their instructions cannot drift.

The guide routes to the schema, examples, and deeper semantic references; it
does not embed the complete schema or fixture suite in default agent context.

### `fs schema <name> [--version <version>] [--output <path>]`

Return an exact bundled JSON Schema. V0 schema names are `document`,
`validation-result`, and `snapshot-diff`; the default version is `0.1` while
that is the only supported artifact version.

Without `--output`, the schema itself is written to standard output as JSON.
With `--output`, the CLI writes exactly the requested path, reports the result
on standard output, and fails rather than overwriting an existing file.

### `fs example [<name>] [--output <path>]`

With no name, list the bundled examples with their purpose and expected
calculation status. With a name, return that exact example as JSON or write it
to the requested new path.

Examples contain illustrative facts and are not partially completed documents
or prescribed statement templates. In particular, `manufacturing-group` is
structurally conforming but intentionally calculation-inconsistent.

### `fs validate <document|-> [--format <format>]`

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

When no validation snapshot is present, the command says so explicitly and
suggests a complete `fs record-validation` command. When a snapshot is
present, it reports either an exact match or a deterministic diff. It never
discovers snapshots through filenames or neighboring files.

### `fs create <candidate|-> --output <document>`

Validate a complete candidate and atomically write it to the exact requested
new path. This is the authoring commit boundary, not a document generator. The
command:

- accepts a candidate path or standard input;
- runs complete structural and calculation validation;
- writes only a structurally conforming FS document;
- may write a calculation-inconsistent document because it remains
  structurally consumable;
- never modifies the candidate or overwrites an existing output; and
- never coerces decimals, infers facts, fills totals, changes values, or
  performs financial repairs.

Its structured result includes the same current validation information as
`fs validate` and identifies the output path when a document is written.

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
  be mistaken for financial data. A later `init` command may scaffold a
  separate authoring workspace if evidence justifies that layer.
- `add-account`, `add-row`, `set-cell`, `add-item`, and `add-fact` are not V0
  commands. `Item`, not account, row, or cell, is the format's financial term,
  and field-by-field mutation creates inefficient, transiently invalid state.
- Statement-type templates are not provided because FS does not prescribe a
  taxonomy or statement contents.
- `import-xbrl`, `import-sec`, `from-csv`, and source mapping are upstream
  adapters, not core format commands.
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
  standard output; progress and debug diagnostics go to standard error.
- Structural errors use stable codes and JSON Pointer paths.
- Errors identify the failed operation and suggest a concrete correction
  without exposing internal stack traces or dependency output.
- Result ordering is deterministic so outputs and snapshots can be diffed.
- Commands that write files require an explicit output path, write atomically,
  and never overwrite.
- Artifact, schema, and example payloads are JSON. Results and errors support
  an explicit lossless JSON encoding even if a compact default is added.
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
contract, collect or identify missing author decisions, invoke the reference
validator, and route structured diagnostics back into a repair loop. Static
skill guidance and `fs guide authoring` share one maintained source.

## Implementation Order

1. Add acceptance fixtures for no-argument discovery, `guide`, `schema`,
   `example`, `validate`, and `create`, including standard input, output safety,
   exit codes, errors, and result encodings.
2. Build a thin `validate` path for parsing and JSON Schema conformance.
3. Add every semantic conformance check, exact calculation evaluation, and
   snapshot diff required by the language-neutral fixtures.
4. Add the read-only discovery commands: no-argument output, `guide`, `schema`,
   and `example`.
5. Add `create` as an atomic validated write over the complete validator.
6. Generate or verify the installable Agent Skill from the maintained
   authoring guidance and command examples.
7. Add snapshot recording only after result identities are stable.
8. Add rendering over the proven flat statement model.
