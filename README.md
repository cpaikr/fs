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

- [Authoring guide](docs/authoring.md) defines the source-to-document workflow
  for people and agents.
- [Domain language](CONTEXT.md) defines the project's canonical terms.
- [Project proposal](docs/project-proposal.md) defines the product and its
  boundaries.
- [Semantic specification](docs/semantic-spec.md) is the normative V0 artifact
  and calculation contract.
- [Roadmap](ROADMAP.md) records confirmed decisions, evidence, and
  implementation order.
- [CLI design](docs/cli.md) defines command scenarios whose artifact-dependent
  outputs are fixed by the language-neutral fixtures.

## Current Work

The V0 artifact contract is complete and was derived from representative JSON
examples. The [authoring guide](docs/authoring.md) now defines how people and
agents apply that contract without turning FS into an extraction or accounting
policy system.
The [semantic specification](docs/semantic-spec.md) defines the normative model
and canonical JSON mapping; [`examples/`](examples/) and [`schema/`](schema/)
contain its current evidence and machine-readable shape. Language-neutral
[conformance and result fixtures](fixtures/) complete the language-neutral
consumer contract. The next phase is a worked source-to-FS example followed by
reference CLI acceptance fixtures and implementation.
