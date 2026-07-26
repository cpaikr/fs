# Language-Neutral Fixtures

These fixtures are machine-readable implementation evidence for the target
`0.2` [semantic specification](https://cpaikr.github.io/fs/spec/0.2/).
Deterministic CLI process fixtures live under [`cli/`](cli/) and follow the
[CLI acceptance contract](../docs/cli/acceptance.md).

[`manifest.json`](manifest.json) is the document-fixture index. Its paths are
relative to this directory. Schema-layer cases fail the closed JSON shape;
semantic-layer cases first pass JSON Schema and then fail reference, graph,
calendar, or snapshot invariants.

A conforming validator must accept every valid entry, derive its declared
calculation status, and reject every invalid entry with the declared stable
code and JSON Pointer path.

## Expected Results

- `valid/no-rollups.json` maps to
  `calculation-results/no-rollups.json` and
  `snapshot-diffs/not-recorded.json`.
- `valid/exact-arithmetic.json` maps to
  `calculation-results/exact-arithmetic.json` and proves exact decimal,
  nested direct-child, and inclusive-tolerance behavior.
- `valid/statement-local-rollups.json` maps to
  `calculation-results/statement-local-rollups.json` and proves that equal item
  identifiers in different statements produce distinct application keys.
- `valid/rollup-cell-errors.json` maps to
  `calculation-results/rollup-cell-errors.json` and proves missing and
  unavailable cell errors.
- `valid/scale-boundaries.json` proves both inclusive `unit.scale` endpoints.
- `valid/recorded-snapshot.json` maps to the recorded-snapshot current result
  and `snapshot-diffs/match.json`.
- `valid/snapshot-mismatch-source.json` maps to the snapshot-mismatch current
  result and `snapshot-diffs/mismatch.json`.
- `../examples/manufacturing-group.json` maps to the manufacturing result and
  `snapshot-diffs/not-recorded.json`.

`calculation-results/structural-nonconformance.json` proves that calculations
are `not-run` when references are unreliable.
`invalid/duplicate-snapshot-application-key.json` maps to
`snapshot-diffs/invalid-snapshot.json`, distinguishing an unusable recorded
snapshot from an absent one. `snapshot-diffs/application-set-changes.json`
exercises the closed added and removed application forms.

## Raw Process Inputs

`raw-input/` contains exact inputs for failures that precede document-schema
validation: malformed syntax, trailing content, and duplicate JSON object
members. `noncanonical-valid.json` is instead a conforming compact row
document with leading whitespace; exact-copy CLI cases use it to detect
reserialization.

## Shape Validation

Run `./scripts/check-docs.sh` from the repository root. It validates the
manifest inventory, all conforming artifacts and expected results, the schema
classification of every invalid document, unique application identities, and
the CLI descriptor references.
