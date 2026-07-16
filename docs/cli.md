# CLI Design

Status: scenario-level design with artifact contracts fixed; implementation is
pending.

## Design Boundary

The CLI is a reference consumer and authoring aid for FS documents. It should
pressure-test the semantic model, but it must not become the place where
undocumented document semantics live.

The pre-schema design fixed:

- command responsibilities and whether they read or write;
- non-interactive operation and overwrite safety;
- distinct reporting of structural conformance, calculation consistency, and
  snapshot comparison; and
- representative success, empty, skipped, inconsistent, and error scenarios.

The working [semantic specification](semantic-spec.md),
[schemas](../schema/), and [fixtures](../fixtures/) now fix:

- schema-dependent result fields and identifiers;
- calculation and period selectors;
- snapshot contents and diff keys; and
- the flat presentation model consumed by rendering.

The canonical artifact remains JSON. CLI result encoding is a separate output
boundary and must have a lossless JSON form even if an agent-oriented format is
also provided.

## Provisional Commands

### `fs validate <document>`

Read an FS document without modifying it and report:

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
suggests a complete `fs record-validation` command with a placeholder output
path; it never opens an interactive prompt. When a snapshot is present, the
command reports either an exact match or a deterministic diff.

The command never discovers snapshots through filenames or neighboring files.

### `fs record-validation <document> --output <new-document>`

Recompute validation and write a new, ordinary FS document containing the
current validation snapshot. The command:

- never modifies its input;
- writes exactly the requested output path;
- fails rather than overwriting an existing path; and
- gives the output filename no semantic meaning.

If the input already contains a snapshot, the new document replaces that
snapshot with the newly computed one rather than accumulating history.
Calculation inconsistency may be recorded; structural nonconformance prevents
the new document from being written.

### `fs render <document>`

Produce a simple readable statement presentation without changing document
semantics. Its detailed options should wait until the flat presentation model
has been proven by examples, especially the equity-statement case.

## Interaction Invariants

- Every operation is completable without an interactive prompt.
- Unknown arguments and flags are rejected rather than ignored.
- Machine-readable results and errors are written to standard output; progress
  and debug diagnostics are written to standard error.
- Errors identify the failed operation and suggest a concrete correction
  without exposing internal stack traces.
- Output ordering is deterministic so results and snapshots can be diffed.

## Remaining Command Contracts

- Exit-code behavior for structural failure, calculation inconsistency, and a
  snapshot mismatch.
- The default terminal encoding and explicit JSON output option.
- Whether document input from standard input is valuable in V0.

## Implementation Order

1. Specify command scenarios and expected outcomes as acceptance fixtures.
2. Build a thin `validate` path for parsing and structural conformance against
   the first JSON Schema slice.
3. Add calculation evaluation and structured results as those semantics become
   concrete.
4. Add snapshot recording only after result identities are stable.
5. Add rendering only after statement presentation is stable.
