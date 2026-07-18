# `@sjunepark/fs`

`@sjunepark/fs` is the reference CLI for FS, a versioned JSON format for clean,
structured financial statements. FS gives people and agents one predictable
artifact to produce after financial data has been extracted or authored.

FS is not an extraction system, accounting taxonomy, source-mapping service,
or financial-policy engine. Authors remain responsible for those decisions.

## Requirements

- Node.js `22.17.0` or later in the Node.js 22 line, or Node.js `24.15.0` or
  later in the Node.js 24 line.

## Package command forms

The pinned V0 package interface uses the following commands. This command
reference does not attest to current npm publication availability.

Run without a global installation:

```sh
npx -y @sjunepark/fs@0.1.0 --help
```

Or install the `fs` executable globally:

```sh
npm install --global @sjunepark/fs@0.1.0
fs --help
```

Common workflows:

```sh
# Read the bundled authoring guide.
npx -y @sjunepark/fs@0.1.0 guide authoring

# Write the document schema or a bundled example to stdout.
npx -y @sjunepark/fs@0.1.0 schema document
npx -y @sjunepark/fs@0.1.0 example minimal

# Validate a document and calculate its results.
npx -y @sjunepark/fs@0.1.0 validate statement.fs.json

# Render a deterministic standalone HTML table.
npx -y @sjunepark/fs@0.1.0 render --output statement.html statement.fs.json
```

The package bundles its schemas, guide, and examples. Validation does not
depend on network access.

## Develop from source

In a source checkout, `docs/development.md` owns repository setup, local CLI
execution, validation, generated content, and package checks. That
repository-only guide is not part of the npm package.

## Format contract

V0 documents use `formatVersion: "0.1"`. The normative
[FS V0 semantic specification](https://cpaikr.github.io/fs/spec/0.1/) and
[versioned document schema](https://cpaikr.github.io/fs/schema/0.1/fs-document.schema.json)
define the public contract.

## Support

Report package or specification problems through the
[public issue tracker](https://github.com/cpaikr/cpaikr.github.io/issues).

## License

Licensed under the [Apache License 2.0](LICENSE).
