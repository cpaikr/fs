# Language-neutral fixtures

[`manifest.json`](manifest.json) is the fixture index. Paths are relative to
this directory. It separates failures enforced directly by JSON Schema from
normative semantic failures that require reference resolution, exact
coordinate comparison, or calendar logic.

A conforming validator must:

1. accept every `validDocuments` entry structurally;
2. derive its named `calculationStatus`;
3. reject every `invalidDocuments` entry at the named validation layer, with
   the stable `code` and JSON Pointer `instancePath`; and
4. compare its validation and snapshot results with the objects in
   `calculation-results/` and `snapshot-diffs/`.

Expected-result pairings:

| Input document | Calculation result | Snapshot diff |
| --- | --- | --- |
| `valid/no-calculation-rules.json` | `calculation-results/no-rules.json` | `snapshot-diffs/not-recorded.json` |
| `valid/all-rules-skipped.json` | `calculation-results/all-skipped.json` | `snapshot-diffs/not-recorded.json` |
| `valid/calculation-errors.json` | `calculation-results/required-fact-errors.json` | `snapshot-diffs/not-recorded.json` |
| `valid/recorded-snapshot.json` | `calculation-results/recorded-snapshot-current.json` | `snapshot-diffs/match.json` |
| `valid/snapshot-mismatch-source.json` | `calculation-results/snapshot-mismatch-current.json` | `snapshot-diffs/mismatch.json` |
| `../examples/manufacturing-group.json` | `calculation-results/manufacturing-group.json` | `snapshot-diffs/not-recorded.json` |

Schema validation can be run with any draft 2020-12 implementation. For
example, without adding a project runtime or choosing a CLI language:

```sh
npx --yes ajv-cli@5 validate --spec=draft2020 \
  -s schema/fs-document.schema.json -d 'examples/*.json'
npx --yes ajv-cli@5 validate --spec=draft2020 \
  -s schema/fs-document.schema.json -d 'fixtures/valid/*.json'
```

The three manifest entries whose layer is `schema` must fail that schema. The
remaining invalid fixtures must pass JSON Schema first and then fail the named
semantic invariant. This distinction prevents an implementation from hiding
missing semantic validation behind a coincidental shape error.
