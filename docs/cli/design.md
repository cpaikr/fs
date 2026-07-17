# CLI Design

The CLI is a planned reference consumer and authoring aid for complete FS
documents. No executable exists yet. The
[delivery plan](../plans/cli-v0.md) owns implementation state and technical
delivery choices.

## Boundary

The CLI owns contract discovery, validation, safe writes, validation
snapshots, and presentation. It must not become the place where undocumented
document semantics live.

The interface is file-first rather than a field-by-field financial editor. An
author or upstream agent supplies a complete candidate document; the CLI
checks the whole contract before any requested write. It does not extract
source material, choose item meanings, prescribe statement contents, infer
values, convert units, or repair financial ambiguity.

The [semantic specification](../semantic-spec.md) defines artifact behavior,
the [authoring guide](../authoring.md) defines the document-encoding workflow,
and the [acceptance contract](acceptance.md) defines exact process behavior.
Schemas and fixtures provide machine-readable evidence for those contracts.

Canonical FS documents, schemas, and examples remain JSON. Structured V0 CLI
results and errors also default to JSON. A compact agent-oriented result
encoding may be added only after its version and exact acceptance behavior are
defined; it would not replace the JSON artifact format.

## Global Flags

Every command path supports:

- `--help` and `-h`, which return the accepted concise Markdown help with
  required arguments, flag defaults, and two or three non-interactive
  examples; and
- `--log-level <all|trace|debug|info|warn|warning|error|fatal|none>`, which
  enables diagnostic logging at the requested threshold. `warning` aliases
  `warn`, and the default is `none`.

V0 does not expose global version, completions, wizard, prompt, or interactive
surfaces. The command-local `fs schema --version` flag remains valid.

The exact top-level and milestone command-path Markdown begins at the
[top-level help asset](../../assets/help/fs.md); the neighboring help assets
are closed and inventory-checked by `scripts/check-docs.sh`.

Logging is silent by default and never changes standard output, exit status,
ordering, or filesystem effects. When enabled, it emits bounded deterministic
JSON Lines diagnostics without document contents, raw dependency errors,
causes, stack traces, timestamps, or runtime identifiers.

## Command Surface

### `fs`

With no arguments, report concise machine-readable discovery rather than a
full manual. The result identifies the executable and package, supported
artifact versions and serialization, available read and write commands, and
complete next commands for guidance, schemas, examples, and validation.

No input is selected. The command does not scan the current directory or infer
document identity from filenames.

### `fs guide authoring`

Present the prerequisites, artifact workflow, refusal to infer missing
financial decisions, and validation loop from the
[authoring guide](../authoring.md). The installed command and Agent Skill must
be generated or checked from one maintained source so their guidance cannot
drift.

The [portable template](../../content/guide/authoring.md.template) is that
source. Its [installed rendering](../../assets/guide/authoring.md) uses `fs`;
the deterministic renderer accepts an exact package version and fixes the
`npx -y @cpai/fs@<version>` prefix for future Phase 6 Skill generation.

Generated routes and commands must work outside a repository checkout. The
guide routes to schemas, examples, and the semantic specification without
embedding the whole contract in default agent context.

### `fs schema <name> [--version <version>] [--output <path>]`

Return an exact bundled JSON Schema. V0 names are `document`,
`validation-result`, and `snapshot-diff`; version `0.1` is the default while it
is the only supported artifact version.

Without `--output`, write the schema bytes directly. With `--output`, create
exactly the requested new file and report that creation. Never overwrite or
create missing parent directories.

### `fs example`

List bundled examples with their purpose and expected calculation status. This
form does not select a payload and therefore does not accept `--output`.

### `fs example <name> [--output <path>]`

Return the named example's exact bundled JSON or create an exact copy at the
requested new path. Examples are illustrative documents, not partially
completed statement templates. `manufacturing-group` is structurally
conforming but deliberately calculation-inconsistent.

### `fs validate <document|-> [--format json]`

Read a path or standard input (`-`) without modifying it and report structural
conformance, current calculation status and applications, and comparison with
an embedded validation snapshot.

Structural conformance and calculation consistency remain separate. A
document with no rules reports `not-defined`; rules with no applicable
evaluation report `not-evaluated`; calculation inconsistency and snapshot
mismatch remain usable successful results. Structural nonconformance reports
calculations as `not-run`.

No recorded snapshot is explicit. A present but structurally unusable snapshot
produces snapshot-diff status `not-comparable` with reason
`invalid-snapshot`; it is not treated as absent. Snapshots are never discovered
through filenames or neighboring files.

### `fs create <candidate|-> --output <document>`

Validate a complete candidate and atomically copy its exact bytes to the
requested new path. This is the authoring commit boundary, not a document
generator.

The command writes only a structurally conforming document, but may write one
with inconsistent calculations. It never modifies the candidate, overwrites a
destination, reserializes content, infers facts, fills totals, or changes
financial meaning. An existing destination takes precedence over candidate
validation and remains protected at commit time.

### `fs record-validation <document|-> --output <new-document>`

Recompute validation and write a new ordinary FS document containing the
current snapshot. Never modify the input or overwrite an output. Replace an
existing embedded snapshot rather than accumulating history. Calculation
inconsistency may be recorded; structural nonconformance prevents writing.

### `fs render <document|-> --output <html>`

Produce a simple standalone HTML presentation at the requested new path.
Rendering uses the flat presentation model and does not infer hierarchy,
calculations, or missing facts.

## Commands Intentionally Absent

- `fs init` does not create a blank document because the V0 contract requires
  meaningful nonempty content.
- `add-account`, `add-row`, `set-cell`, `add-item`, and `add-fact` are not V0
  commands. Field-by-field mutation creates transient invalid state and makes
  poor use of an agent-facing interface.
- Statement-type templates are absent because FS does not prescribe taxonomy
  or statement contents.
- `import-xbrl`, `import-sec`, `from-csv`, and source mapping remain outside
  the product boundary.
- `repair`, `fix`, `normalize`, `calculate`, and `fill-totals` are absent
  because apparent corrections commonly require author judgment and rules
  never materialize values.

If later evidence supports mutation, prefer one atomic batch change document
with validated, non-overwriting output over stateful commands.

## Interaction Invariants

- Every operation is non-interactive.
- Document-reading commands accept a path or standard input where shown.
- Unknown commands, arguments, flags, names, versions, and formats are
  rejected rather than ignored.
- Help relaxes only absent command requirements in an otherwise-valid command
  prefix. Every supplied operand, name, version, format, and option is
  validated before help is rendered, so `--help` cannot mask invalid syntax.
- Result ordering is deterministic and empty or absent states are explicit.
- Errors identify the operation and a concrete correction without exposing
  dependency output or internal failures.
- Commands that write require an explicit path, write atomically, create no
  parent directory, and never overwrite.
- A partial validator must fail closed; it must not call a schema-valid
  document conforming before every semantic check exists.

The [acceptance contract](acceptance.md) owns exact result envelopes, streams,
exit codes, error vocabulary, and filesystem postconditions.

## Agent Integration

Ship an on-demand Agent Skill for encoding an already-resolved financial model.
It identifies missing prerequisite inputs without supplying them, invokes the
reference validator, and routes structural diagnostics into an encoding repair
loop. Static Skill guidance and `fs guide authoring` share one source.

Installed CLI guidance uses `fs`. Generated Skill commands pin the released
npm package as `npx -y @cpai/fs@<version>` so they do not assume a global
installation.

## Delivery

The [V0 CLI plan](../plans/cli-v0.md) owns the selected runtime, package,
dependency constraints, implementation phases, validation gates, and current
next action.
