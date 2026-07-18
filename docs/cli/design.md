# CLI Design

This design describes the CLI for the current `0.1` statement-item-row
contract. The CLI projects the document contract without adding a second data
model.

The CLI is the packaged reference consumer and authoring aid for complete FS
documents. This design does not attest to implementation or release
availability. Verify implementation in source and the built package; use the
[active release plan](../plans/v0-release-candidate.md) for live release status.

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
the [authoring policy](../authoring.md) defines the financial-decision boundary,
the [portable workflow](../../content/guide/authoring.md.template) defines the
exact create-and-repair procedure, and the
[acceptance contract](acceptance.md) defines exact process behavior. Schemas
and fixtures provide machine-readable evidence for those contracts.

Canonical FS documents, schemas, and examples remain JSON. Structured V0
operation results and operational errors also use JSON. Framework help,
version, completions, and usage diagnostics use the deterministic native
encodings defined by the [acceptance contract](acceptance.md). A compact
agent-oriented result encoding may be added only after its version and exact
acceptance behavior are defined; it would not replace the JSON artifact
format.

## Global Flags

Every command path supports Effect CLI's public built-ins:

- `--help` and `-h` render color-disabled help generated from the command
  tree;
- `--version` and `-v` report the installed CLI package version;
- `--completions <bash|zsh|fish|sh>` writes a shell completion script; and
- `--log-level <all|trace|debug|info|warn|warning|error|fatal|none>` enables
  diagnostic logging at the requested threshold. `warning` aliases `warn`,
  and the default is `none`.

Help includes command descriptions, required operands, accepted flags,
choices, defaults, subcommands, and examples. That semantic inventory is the
contract; formatter wording, spacing, and section layout are not independent
product content. Exact-one operand descriptions begin with `Exactly one` even
when the pinned CLI's consume-all refinement causes native usage to show a
variadic ellipsis; that formatter detail never relaxes runtime cardinality.
Version, completions, and help are non-interactive action flags and may
complete without running ordinary command validation or a command handler.
Combining action flags has framework-defined precedence and is not a supported
workflow.

V0 does not opt into wizard, prompt, or other interactive surfaces.

Logging is silent by default and never changes standard output, exit status,
ordering, or filesystem effects. When enabled, it emits bounded deterministic
JSON Lines diagnostics without document contents, raw dependency errors,
causes, stack traces, timestamps, or runtime identifiers.

## Operational Boundaries

The public CLI treats every document input as untrusted. Finite V0 budgets
bound raw input, JSON nesting and value counts, nonconforming diagnostic work,
encoded diagnostics, and exact-decimal work without changing artifact
conformance. The [acceptance contract](acceptance.md#operational-errors) owns
the exact thresholds, counting rules, stable results, and precedence.

The byte boundary is enforced while reading, before UTF-8 decoding, and stops
at the first excess byte. JSON nesting and value budgets are enforced by a
non-recursive scanner before materialization. A larger document receives a
fast conformance pass: conforming input continues normally, while
nonconforming input is refused before complete diagnostic generation. Complete
structural diagnostics remain deterministic within their value and
encoded-byte budgets. Decimal budgets run after schema conformance and before
semantic snapshot or rollup arithmetic. When another structural error prevents
whole-document conformance, snapshot decimals are still bounded before a
schema-valid snapshot is compared. A limit failure is an operational refusal,
not evidence that the same document is nonconforming for another FS
implementation.

These limits retain substantial headroom over the maintained corpus while
bounding measured adversarial costs on every supported Node.js line.
Supported-runtime measurements found recursive descent failing at different
depths, schema diagnostic fanout amplifying a compact invalid input into tens
of megabytes of output, and large exact-decimal cancellation changing work
materially with author order. The selected boundaries avoid those
runtime-dependent failure regions while preserving large conforming documents
and making valid child order cost-stable.

Native help, version, and completion actions are parsed and completed without
loading document-command implementation or acquiring application path context.
Root discovery and pathless bundled content do the same. Standard input and
absolute paths also require no current directory. A relative input or output
path acquires the current directory lazily; if it is unavailable, the operation
returns the stable working-directory failure instead of exposing a Node error.

V0 is CLI-only. Supported package entry points are the `fs` executable,
packaged assets exposed through commands, and the explicitly allowed
`./package.json` metadata entry. Implementation modules are private package
internals, not a JavaScript or TypeScript library API.

## Command Surface

### `fs`

With no arguments, report concise machine-readable discovery rather than a
full manual. The result identifies the executable and package, supported
artifact versions and serialization, available read and write commands, and
complete next commands for guidance, schemas, examples, and validation.

No input is selected. The command does not scan the current directory or infer
document identity from filenames.

### `fs guide authoring`

Implement the prerequisites and decision boundaries in the
[authoring policy](../authoring.md). The installed command and Agent Skill are
generated from one portable source so their exact operational procedure cannot
drift.

The [portable template](../../content/guide/authoring.md.template) is that
source. Its [installed rendering](../../assets/guide/authoring.md) uses `fs`;
the deterministic renderer accepts an exact package version and fixes the
`npx -y @sjunepark/fs@<version>` prefix and visible version-basis note for Agent
Skill generation.

Generated routes and commands do not assume a repository checkout. The guide
routes to schemas, examples, and the semantic specification without embedding
the whole contract in default agent context.

### `fs schema [--output <path>] <name>`

Return an exact bundled JSON Schema. V0 names are `document`,
`validation-result`, and `snapshot-diff`. The only bundled artifact version is
`0.1`, so V0 exposes no redundant version selector. If multiple artifact
versions become available, add an explicit `--artifact-version` flag rather
than overloading the CLI's global `--version` action. `fs --version` reports
the CLI package version; any other placement the pinned parser happens to
accept retains that global meaning and never selects schema content.

Each bundled schema has its canonical public identifier under
`https://cpaikr.github.io/fs/schema/0.1/`. Discovery remains offline and reads
the bundled bytes; it does not fetch the canonical URL. The document schema
permits an optional top-level `$schema` property only when it equals the
document schema's identifier.

Without `--output`, write the schema bytes directly. With `--output`, create
exactly the requested new file and report that creation. Never overwrite or
create missing parent directories.

### `fs example`

List bundled examples with their purpose and expected calculation status. This
form does not select a payload and therefore does not accept `--output`.

### `fs example [--output <path>] <name>`

Return the named example's exact bundled JSON or create an exact copy at the
requested new path. Examples are illustrative documents, not partially
completed statement templates. `manufacturing-group` is structurally
conforming but deliberately rollup-inconsistent.

### `fs validate <document|->`

Read a path or standard input (`-`) within the published operational budgets
without modifying it and report structural conformance, current rollup status
and applications, and comparison with an embedded validation snapshot.

Structural conformance and rollup consistency remain separate. A
document with no rollup parents reports `not-defined`; rollup inconsistency and
snapshot mismatch remain usable successful results. Structural nonconformance
reports calculations as `not-run`.

No recorded snapshot is explicit. A present but structurally unusable snapshot
produces snapshot-diff status `not-comparable` with reason
`invalid-snapshot`; it is not treated as absent. Snapshots are never discovered
through filenames or neighboring files.

JSON is the only V0 validation-result encoding, so the command exposes no
redundant format selector. A format flag may be added only when another
accepted encoding and its process contract exist.

### `fs create --output <document> <candidate|->`

Validate a complete candidate within the published operational budgets and
atomically copy its exact bytes to the requested new path. This is the
authoring commit boundary, not a document generator.

The command writes only a structurally conforming document, but may write one
with inconsistent rollups. It never modifies the candidate, overwrites a
destination, reserializes content, infers values, fills totals, or changes
financial meaning. An existing destination takes precedence over candidate
validation and remains protected at commit time.

### `fs record-validation --output <new-document> <document|->`

Recompute validation and write a new ordinary FS document containing the
current snapshot. Never modify the input or overwrite an output. Replace an
existing embedded snapshot rather than accumulating history. Calculation
inconsistency may be recorded; structural nonconformance prevents writing.

### `fs render --output <html> <document|->`

Produce a simple standalone HTML presentation at the requested new path.
Rendering iterates statement-owned items directly. It presents grouping
columns as flat metadata and identifies heterogeneous row units without
inferring hierarchy, subtotal styling, calculations, or missing values.
Checked structural budgets prevent unbounded tables before allocation, and a
bounded sink rejects encoded HTML that exceeds the accepted finite-output
policy.

## Commands Intentionally Absent

- `fs init` does not create a blank document because the V0 contract requires
  meaningful nonempty content.
- `add-account`, `add-row`, `set-cell`, `add-item`, and `add-fact` are not V0
  commands. The row contract has no top-level fact target, and field-by-field
  mutation creates transient invalid state and makes poor use of an
  agent-facing interface.
- Statement-type templates are absent because FS does not prescribe taxonomy
  or statement contents.
- `import-xbrl`, `import-sec`, `from-csv`, and source mapping remain outside
  the product boundary.
- `repair`, `fix`, `normalize`, `calculate`, and `fill-totals` are absent
  because apparent corrections commonly require author judgment and rollups
  never materialize values.

If later evidence supports mutation, prefer one atomic batch change document
with validated, non-overwriting output over stateful commands.

## Interaction Invariants

- Every operation is non-interactive.
- Document-reading commands accept a path or standard input where shown.
- Documented invocations place global flags immediately after `fs` and
  command-local flags before operands. Other placements are not guaranteed
  even when a pinned Effect release accepts them.
- The lone `-` remains the standard-input operand. V0 does not guarantee the
  `--` end-of-options delimiter for subcommand operands; prefix a relative path
  beginning with `-` as `./-name`.
- Unknown commands, arguments, flags, and names are rejected rather than
  ignored. Extra operands fail before application I/O.
- A single-valued command-local flag may appear at most once. Repetition of
  framework-owned global flags follows the pinned Effect behavior and is not a
  separate FS contract.
- Help, version, and completions may short-circuit ordinary operand and
  command-value validation. Only the documented action forms are contracted;
  a valueless completions flag and combined action flags are framework-owned
  unsupported workflows.
- Native actions, root discovery, pathless bundled content, standard input,
  and absolute paths do not require a current working directory. Only resolving
  a relative input or output path may acquire it.
- Result ordering is deterministic and empty or absent states are explicit.
- Errors identify the operation and a concrete correction without exposing
  dependency output or internal failures.
- Commands that write require an explicit path, write atomically, create no
  parent directory, and never overwrite.
- A partial validator must fail closed; it must not call a schema-valid
  document conforming before every semantic check exists.

The [acceptance contract](acceptance.md) owns exact operation-result envelopes,
stream roles, exit codes, operational-error vocabulary, and filesystem
postconditions.

## Agent Integration

Ship an on-demand Agent Skill for encoding an already-resolved financial model.
It identifies missing prerequisite inputs without supplying them, invokes the
reference validator, and routes structural diagnostics into an encoding repair
loop. Static Skill guidance and `fs guide authoring` share one source.

Publish the Skill from the repository's root `skills/` catalog. Installed CLI
guidance uses `fs`. Generated Skill commands name an exact npm package version
as `npx -y @sjunepark/fs@<version>` and state that version as their basis. This
is a generated-command reproducibility rule, not evidence of package
availability.

## Implementation Evidence

The [development guide](../development.md) owns repository validation commands,
and the [active release plan](../plans/v0-release-candidate.md) owns live status.
Completed milestone plans linked from the [documentation index](../README.md)
retain historical implementation decisions and gate evidence.
