# Language-Neutral Fixtures

These fixtures provide machine-readable evidence for the normative
[semantic specification](../docs/semantic-spec.md). Future deterministic CLI
process fixtures belong under `cli/` and follow the
[CLI acceptance contract](../docs/cli/acceptance.md); they should reference the
artifact inputs and results here instead of duplicating this matrix.

[`manifest.json`](manifest.json) is the fixture index. Its `document` paths are
relative to this directory. It separates JSON Schema failures from semantic
failures that require reference resolution, exact coordinate comparison, or
calendar logic.

A conforming validator must:

1. accept every `validDocuments` entry structurally;
2. derive its named `calculationStatus`;
3. reject every `invalidDocuments` entry at the named layer with the stable
   `code` and JSON Pointer `path`; and
4. match the named calculation and snapshot results.

## Expected Results

- `valid/no-calculation-rules.json` maps to
  `calculation-results/no-rules.json` and
  `snapshot-diffs/not-recorded.json`.
- `valid/all-rules-skipped.json` maps to
  `calculation-results/all-skipped.json` and
  `snapshot-diffs/not-recorded.json`.
- `valid/calculation-errors.json` maps to
  `calculation-results/required-fact-errors.json` and
  `snapshot-diffs/not-recorded.json`.
- `valid/exact-arithmetic.json` maps to
  `calculation-results/exact-arithmetic.json` and
  `snapshot-diffs/not-recorded.json`.
- `valid/recorded-snapshot.json` maps to
  `calculation-results/recorded-snapshot-current.json` and
  `snapshot-diffs/match.json`.
- `valid/snapshot-mismatch-source.json` maps to
  `calculation-results/snapshot-mismatch-current.json` and
  `snapshot-diffs/mismatch.json`.
- `../examples/manufacturing-group.json` maps to
  `calculation-results/manufacturing-group.json` and
  `snapshot-diffs/not-recorded.json`.

`invalid/unresolved-item.json` maps to
`calculation-results/structural-nonconformance.json`. It proves that a
nonconforming document receives calculation status `not-run`; validators do
not attempt arithmetic against unreliable references.

## Shape Validation

Run these commands from the repository root with any draft 2020-12
implementation. For example:

```sh
npx --yes ajv-cli@5 validate --spec=draft2020 \
  -s schema/fs-document.schema.json -d 'examples/*.json'
npx --yes ajv-cli@5 validate --spec=draft2020 \
  -s schema/fs-document.schema.json -d 'fixtures/valid/*.json'
```

Manifest entries with layer `schema` must fail that schema. The remaining
invalid fixtures must pass JSON Schema before failing their named semantic
invariant. This distinction prevents an implementation from hiding missing
semantic validation behind a coincidental shape error.
