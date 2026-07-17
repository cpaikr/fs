# Roadmap

Status: The reference CLI and Effect-native migration are complete.

This roadmap owns strategic sequence only. The
[product scope](docs/product-scope.md) defines the boundary, and the
[V0 CLI plan](docs/plans/cli-v0.md) owns current task state, validation,
blockers, and the next action.

## Current Milestone: Reference CLI

Completed foundations:

- the normative V0 artifact semantics;
- baseline document and result schemas, examples, and fixtures;
- authoring guidance for an already-resolved financial model;
- the command surface and deterministic process contract;
- full semantic validation, bundled discovery and content, and atomic
  exact-byte creation; and
- the packed TypeScript, Node.js, Effect, and npm delivery path.

The completed milestone replaces the Node-core grammar adapter and static help
with the revised Effect-native contract and `effect/unstable/cli` runner. It
preserves artifact meaning, validation results, exact bundled content,
logging, and filesystem safety. Its completed phase gates are recorded in the
[delivery plan](docs/plans/cli-v0.md).

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
9. [ ] Generate agent guidance from one source, then add snapshot recording
   and rendering through contract-first slices.
10. [ ] Replace placeholder schema identifiers, run cross-platform package
    verification, and release V0.

## Later Directions

Agent evaluations remain optional and non-normative. If added, they may test
encoding and structural repair from author-resolved inputs, but must not score
extraction, source mapping, taxonomy alignment, or accounting judgment.

A later dataset layer may coordinate multiple single-entity documents under
author-supplied shared definitions. FS may represent that alignment, but will
not supply a taxonomy or perform the alignment. The V0 single-entity document
remains the atomic artifact.
