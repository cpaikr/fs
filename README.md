# fs

Status: The current V0 artifact semantics and packed reference CLI through
`fs render` exist. A replacement statement-item-row model is accepted and its
refactor is planned but not implemented. `fs` is a working title.

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
- To review or execute the accepted redesign, use the
  [statement-item-row refactor plan](docs/plans/statement-item-row-refactor.md).

## Repository State

The V0 semantic contract, schemas, examples, language-neutral fixtures, full
validator, bundled discovery/content commands, and exact-byte non-overwriting
creation and validation-snapshot recording exist. The packed CLI runs the
revised contract through `effect/unstable/cli` and renders deterministic,
standalone HTML presentations.

The [roadmap](ROADMAP.md) shows strategic milestones. The
[step-9 plan](docs/plans/agent-guidance-snapshots-rendering.md) records its
delivery decisions and validation. The
[step-10 plan](docs/plans/statement-item-row-refactor.md) owns the pending
replacement and its temporary contract drift.
