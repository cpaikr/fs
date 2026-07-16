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
