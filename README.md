# fs

Status: contract design; no CLI implementation exists. `fs` is a working
title.

`fs` is a public format for clean, structured financial statements. It gives
people and agents one predictable artifact to produce after extracting or
authoring financial data, regardless of whether the source was a PDF,
spreadsheet, website, or manual entry.

The core product is a standalone JSON document and its validation semantics.
It is not an extraction system, accounting taxonomy, or financial-policy
engine.

## Start Here

- To encode an author-resolved financial model, use the
  [authoring guide](docs/authoring.md).
- To implement or evaluate the format, use the normative
  [semantic specification](docs/semantic-spec.md).
- To understand the product and its boundaries, read the
  [product scope](docs/product-scope.md).
- For every document and its authority, use the
  [documentation index](docs/README.md).

## Repository State

The V0 semantic contract, baseline schemas, examples, and language-neutral
fixtures exist. Known schema and fixture gaps remain before the CLI acceptance
suite and implementation begin.

The [roadmap](ROADMAP.md) shows strategic milestones. The
[V0 CLI plan](docs/plans/cli-v0.md) is the only source for current progress,
validation, blockers, and the next action.
