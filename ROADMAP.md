# Roadmap

This roadmap owns strategic sequence only. The
[product scope](docs/product-scope.md) defines the boundary, and the
[active release plan](docs/plans/v0-release-candidate.md) owns live status and
the next action. Completed milestone plans linked from the
[documentation index](docs/README.md) retain delivery decisions and validation.

## Reference CLI

The completed reference CLI sequence and its historical validation are
maintained in the
[V0 CLI plan](docs/plans/cli-v0.md).

## Release Sequence

1. [x] Define the V0 product boundary and semantic artifact contract.
2. [x] Add baseline schemas, representative examples, and language-neutral
   conformance and result fixtures.
3. [x] Publish document-encoding guidance that refuses missing financial
   decisions.
4. [x] Define the reference CLI surface and observable acceptance contract.
5. [x] Close known contract-artifact gaps and verify the selected public CLI
   integration boundary.
6. [x] Add deterministic CLI fixtures, then implement full validation.
7. [x] Add contract discovery and atomic, non-overwriting document creation.
8. [x] Adopt the revised Effect-native CLI contract, acceptance fixtures, and
   `effect/unstable/cli` runner.
9. [x] Generate agent guidance from one source, then add snapshot recording
   and rendering through contract-first slices.
10. [x] Replace the dimensional fact model with statement-owned item rows,
    nested value and grouping maps, and additive rollup validation.
11. [ ] Complete release preparation and publish V0.

## Later Directions

Agent evaluations remain optional and non-normative. If added, they may test
encoding and structural repair from author-resolved inputs, but must not score
extraction, source mapping, taxonomy alignment, or accounting judgment.

A later dataset layer may coordinate multiple single-entity documents under
author-supplied shared definitions. FS may represent that alignment, but will
not supply a taxonomy or perform the alignment. The V0 single-entity document
remains the atomic artifact.
