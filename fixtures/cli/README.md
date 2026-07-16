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
records with an explicit additional-record policy.

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

The current manifest is intentionally incomplete until every Phase 1 checklist
item is encoded and this guide maps each required clause to case identifiers.

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
