# CLI Acceptance Fixtures

These fixtures encode the observable process contract in the
[CLI acceptance contract](../../docs/cli/acceptance.md). They are validated
without an executable and later consumed unchanged by the packed-process test
harness.

## Layout

- [`case.schema.json`](case.schema.json) defines one closed case descriptor.
- [`manifest.json`](manifest.json) lists every case path in lexical order.
- `cases/` groups descriptors by command or cross-cutting behavior.
- `expected/` contains only CLI-owned exact values or logs. Artifact results,
  schemas, examples, guide content, and help remain in their owning trees and
  are referenced rather than copied.

Every `file` reference is resolved relative to this `fixtures/cli/` directory,
even when the case descriptor is nested. References may leave this directory
but must remain inside the repository and resolve to regular files.

## Protocol

The harness invokes `command` with the exact `arguments` array and no shell.
It creates a fresh workspace and fixed empty home, copies `workspace` entries,
supplies the optional exact `stdin` bytes, and disables color and interactive
terminal behavior.

JSON stdout uses three generic assertion types:

- `members` fixes the complete member set at an object JSON Pointer;
- `arrays` fixes an exact or minimum array length without constraining
  unrelated additional values;
- `equalities` compares a pointer with a literal, another JSON file/pointer,
  or one selected entry in a JSON array; and
- `nonemptyStrings` requires actionable messages without fixing prose.

Every JSON matcher declares the root object member set. Exact content commands
use `bytes` instead. Ordinary standard error is exact bytes, normally empty;
logging cases either name an exact JSON Lines file or require structural
records with an explicit additional-record policy. A `contains` record is an
exact JSON value; `allowAdditional` controls only additional log records. All
records require the stable `level`, `event`, and `operation` fields and reject
the diagnostic fields forbidden by the acceptance contract. Additional
context is flat and scalar so nested raw payloads cannot be accepted.

Filesystem expectations are exhaustive for both workspace and home. Staged
files are `unchanged`, newly written regular files are `created` with exact
bytes, and paths that must not exist are `absent`. The harness rejects every
unlisted creation, deletion, content change, or file-type change after
excluding only the staged executable.

## Integrity

`scripts/check-cli-fixtures.mjs` verifies manifest coverage and ordering,
unique identifiers, safe workspace paths, disjoint filesystem states, staged
file expectations, repository-contained regular-file references, JSON Pointer
syntax and targets, and unique selector matches. The document checker also
validates every case against the case schema.

The descriptor suite cannot prove injected I/O order, commit races, crash
atomicity, platform permission faults, or global log redaction. The child plans
assign those guarantees to retained Phase 2, 4, and 5 tests.

## Contract Coverage

The suite is populated in the same order as the acceptance contract:

1. `validate` results, parsing, operational failures, and usage;
2. help, rejected built-ins, and logging;
3. discovery, guide, schema, and example content; and
4. exact-byte non-overwriting `create`.

The manifest is the complete Phase 1 process contract through `fs create`.
The sections below map every required clause to case identifiers.

### Validation success

- Path and standard input with no rules:
  `validate-path-no-rules`, `validate-stdin-no-rules`.
- Every conforming calculation aggregate status:
  `validate-path-no-rules`, `validate-all-rules-skipped`,
  `validate-snapshot-match`, `validate-calculation-inconsistent`.
- Snapshot comparison outcomes: `validate-path-no-rules`,
  `validate-snapshot-match`, `validate-snapshot-mismatch`.

### Validation structural failures

- JSON Schema and semantic layers: `validate-schema-failure`,
  `validate-semantic-failure`.
- Present invalid embedded snapshot: `validate-invalid-snapshot`.
- Out-of-range safe-integer scale: `validate-unsafe-scale`.

Each structural case composes its stable diagnostic code/path from the artifact
manifest, requires a nonempty message, and fixes calculations as `not-run`
without adding a duplicate calculation-result fixture.

### Validation process failures and usage

- Invalid JSON classes: `validate-malformed-json`,
  `validate-trailing-content`, `validate-duplicate-members`.
- Missing input: `validate-missing-path`.
- Missing/extra operands: `validate-missing-argument`,
  `validate-extra-argument`.
- Unknown flag and format: `validate-unknown-flag`,
  `validate-unsupported-format`.
- Grammar before input I/O: `validate-usage-precedence`.

### Help and built-ins

- Exact milestone help: `help-root`, `help-guide`, `help-guide-authoring`,
  `help-schema`, `help-example`, `help-validate`, `help-create`.
- Representative aliases and help precedence: `help-root-alias`,
  `help-validate-alias`.
- Rejected global built-ins: `help-reject-version`,
  `help-reject-short-version`, `help-reject-completions`.
- Accepted command-local version: `help-schema-local-version`.

### Diagnostic logging

- Omitted versus explicit silence: `validate-path-no-rules`,
  `logging-explicit-none`.
- Canonical debug order and higher threshold: `logging-debug`,
  `logging-info-threshold`.
- Bounded failure logging and warning alias: `logging-warn-failure`,
  `logging-warning-alias`.
- Invalid level remains a silent usage error: `logging-invalid-level`.

### Discovery and guide

- No-argument discovery, including no inferred nearby input:
  `discovery-no-arguments`.
- Unknown top-level command: `discovery-unknown-command`.
- Exact installed authoring guide: `guide-authoring`.
- Unknown and extra guide operands: `guide-unknown-topic`,
  `guide-extra-argument`.

### Schemas

- Every bundled schema with default and explicit version selection:
  `schema-document-default`, `help-schema-local-version`,
  `schema-validation-result-default`,
  `schema-validation-result-explicit-version`, `schema-snapshot-diff-default`,
  `schema-snapshot-diff-explicit-version`.
- Exact new-file creation: `schema-output-create`.
- Missing or unsupported selection: `schema-missing-name`,
  `schema-unknown-name`, `schema-unsupported-version`.
- Missing parent and overwrite refusal: `schema-output-missing-parent`,
  `schema-output-exists`.

### Examples

- Exact ordered listing and named payloads: `example-list`, `example-minimal`,
  `example-manufacturing-group`.
- Exact new-file creation: `example-output-create`.
- Output without a selected name and unknown selection:
  `example-missing-name-for-output`, `example-unknown-name`.
- Missing parent and overwrite refusal: `example-output-missing-parent`,
  `example-output-exists`.

### Creation

- Exact noncanonical bytes from path and standard input: `create-path`,
  `create-stdin`.
- Calculation inconsistency remains writable:
  `create-calculation-inconsistent`.
- Malformed, schema-invalid, and semantically invalid refusal:
  `create-malformed-json`, `create-schema-failure`,
  `create-semantic-failure`.
- Missing operands, extra operands, and unknown flags:
  `create-missing-candidate`, `create-missing-output`,
  `create-extra-argument`, `create-unknown-flag`.
- Missing parent and identical or different existing destinations:
  `create-output-missing-parent`, `create-existing-identical`,
  `create-existing-different`.
- Existing destination before invalid candidate:
  `create-invalid-existing-precedence`.

Instrumented Phase 2 tests retain input-read/write-call invariance and the
complete threshold matrix; process fixtures fix the observable representative
seams.
