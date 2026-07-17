# Statement Item Row Refactor Plan

Status: Ready. Roadmap step 10 is planned; no contract or implementation
cutover has started.

This file is the concise milestone index and the only owner of live progress,
temporary drift, blockers, and the next action. Stable phase scope and gates
live in the linked child plans. The
[semantic specification](../semantic-spec.md) owns current artifact meaning,
the [CLI acceptance contract](../cli/acceptance.md) owns observable process
behavior, and [ADR 0001](../adr/0001-replace-dimensional-members-with-item-grouping.md)
owns the accepted replacement decision.

## Milestone

Replace the current item/fact/dimension/member contract with statement-owned
item rows using nested `values` and `groupings` maps and optional additive
`rollupTo` relationships. Replace the contract and implementation directly;
do not add dual schemas, legacy-document readers, normalizers, or compatibility
aliases.

The milestone includes normative contracts, schemas, examples, fixtures,
validation, snapshots, rendering, generated authoring guidance, CLI evidence,
and package verification. It stops before Roadmap step 11 schema publication,
cross-platform release verification, version publication, and npm release.

## Fixed Decisions

- Statements own ordered items and their values; there are no top-level items
  or facts.
- Every item has fixed level-one fields and required nested `values` and
  `groupings` maps.
- `groupingColumns` declares custom grouping keys without defining schemes,
  categories, hierarchies, or arithmetic.
- Different items in one statement may use different units. A rollup parent
  and all direct children must use the same unit.
- `rollupTo` is the only arithmetic relationship. Parent subtotal values stay
  explicit and are validated rather than derived.
- JSON remains canonical. Flat tables and TOON remain possible derived forms,
  not parallel semantic contracts.
- General calculations, roll-forwards, dimensions, members, shared facts,
  presentation-only headings, and label overrides are removed rather than
  emulated.
- [ADR 0002](../adr/0002-bound-render-output.md) remains an independent
  proposed operational decision until explicitly accepted or revised.

## Aggregate State

| Phase | State | Detailed plan |
| --- | --- | --- |
| 0. Contract and remaining decisions | Not started | [Target contract](statement-item-row-refactor/phase-0-contract.md) |
| 1. Schemas and contract evidence | Not started | [Schemas and evidence](statement-item-row-refactor/phase-1-schema-evidence.md) |
| 2. Document model and structural validation | Not started | [Core validation](statement-item-row-refactor/phase-2-core-validation.md) |
| 3. Rollups, results, and snapshots | Not started | [Rollups and snapshots](statement-item-row-refactor/phase-3-rollups-snapshots.md) |
| 4. Rendering | Not started | [Rendering](statement-item-row-refactor/phase-4-rendering.md) |
| 5. CLI, guidance, and package integration | Not started | [CLI and package](statement-item-row-refactor/phase-5-cli-package.md) |
| 6. Legacy removal and final gate | Not started | [Final gate](statement-item-row-refactor/phase-6-final-gate.md) |

Phases 2–4 are ordered work packets within one runtime cutover. The shared
`Document` type is consumed throughout validation, snapshots, rendering, and
process orchestration, so those intermediate boundaries are not merge or
release points. Keep the cutover on one branch and restore the full repository
gate before Phase 5 closes. This is simpler and safer than creating a temporary
compatibility interface solely to keep each internal packet independently
green.

## Current State

The replacement shape and vocabulary are accepted. The decision ADR, product
scope, glossary, roadmap, and this plan describe the target. All normative
schemas, fixtures, examples, authoring and CLI contracts, and runtime code
still implement format `0.1` and the dimensional fact model. No refactor code
has been written.

The completed step-9 renderer and snapshot implementation remain the verified
baseline. Historical delivery evidence stays in the
[completed step-9 plan](agent-guidance-snapshots-rendering.md) and must not be
rewritten as refactor progress.

Shared evidence is owned by the earliest phase that must consume it. Phase 1
owns schema-valid expected JSON documents and the static integrity of
artifact-sensitive CLI descriptors. Phase 3 owns runtime production and exact
byte verification of recorded documents, Phase 4 owns exact HTML fixtures, and
Phase 5 owns executable process integration and package verification. Later
phases reuse rather than duplicate earlier evidence.

## Known Temporary Drift

- The product scope and glossary describe the accepted target while the
  semantic specification, schemas, examples, fixtures, and implementation
  still define the current fact-and-dimension contract.
- ADR 0001 uses provisional `formatVersion: "0.2"`; Phase 0 must decide whether
  the unreleased contract replaces `0.1` or advances the artifact version.
- The exact serialized rollup-error payload, mixed-unit HTML presentation, and
  grouping-column HTML visibility remain Phase-0 contract decisions.
- Render budgets and `output-limit-exceeded` remain proposed in ADR 0002 and
  are not part of the accepted row-model decision.

This drift is deliberate only while Roadmap step 10 is active. Do not update
examples or fixtures piecemeal to make summaries appear current.

## Validation

The pre-refactor baseline is the complete validation recorded by the
[step-9 plan](agent-guidance-snapshots-rendering.md). The planning slice passes
`./scripts/check-docs.sh` across Markdown, links, maintained CLI content, every
manifest-listed CLI case, current schemas, examples, fixtures, and expected
results. The accepted ADR example also parses as JSON and passes targeted checks
for exact `values` and `groupings` keys, resolved units and rollups, mixed-unit
statement evidence, and reported child sums. `git diff --check` passes. Fresh
cross-contract review applied safe corrections. Follow-up review assigned each
shared fixture to the earliest phase that consumes it and left no unresolved
material finding.

## Blockers

None to beginning Phase 0. Its explicit decisions must be resolved before
normative schemas or implementation change.

## Next Action

Execute Phase 0 as a contract-only slice: settle the remaining serialized and
rendering decisions, then rewrite the semantic, authoring, and affected CLI
contracts before changing machine-readable artifacts.

## Completion

Roadmap step 10 is complete only when every phase is complete, no unplanned
legacy contract path remains, all generated and checked-in artifacts agree,
the full validation gate passes, and the required code-review pass has no
unresolved material finding. Release work remains Roadmap step 11.
