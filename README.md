# fs

Status: design phase. `fs` is a working title.

`fs` is a public format for clean, structured financial statements. It gives
people and agents one predictable artifact to produce after extracting or
authoring financial data, regardless of whether the source was a PDF,
spreadsheet, website, or manual entry.

The core product is a standalone JSON document and its validation semantics.
It is not an extraction system, accounting taxonomy, or financial-policy
engine.

## Documentation

- [Domain language](CONTEXT.md) defines the project's canonical terms.
- [Project proposal](docs/project-proposal.md) defines the product and its
  boundaries.
- [Roadmap](ROADMAP.md) records confirmed decisions, unresolved design work,
  and implementation order.
- [CLI design](docs/cli.md) defines provisional command scenarios without
  prematurely fixing schema-dependent output fields.

## Current Work

The next milestone is a reviewed set of representative JSON examples. Those
examples will establish the semantic model before the JSON Schema and reference
CLI are fixed.
