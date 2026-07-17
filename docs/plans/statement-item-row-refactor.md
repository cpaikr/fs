# Statement Item Row Refactor Plan

Status: In progress. Phases 0 and 1 are complete; the runtime cutover is next.

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
- Every item has fixed level-one fields, with required `values` and `groupings`
  maps nested within it.
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
- [ADR 0002](../adr/0002-bound-render-output.md) independently fixes finite
  rendering budgets and the `output-limit-exceeded` process contract.

## Aggregate State

| Phase | State | Detailed plan |
| --- | --- | --- |
| 0. Contract and remaining decisions | Complete | [Target contract](statement-item-row-refactor/phase-0-contract.md) |
| 1. Schemas and contract evidence | Complete | [Schemas and evidence](statement-item-row-refactor/phase-1-schema-evidence.md) |
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

Phase 0 incorporates the accepted statement-item-row model into the semantic,
authoring, and affected CLI contracts while retaining the unreleased
`formatVersion: "0.1"` contract and result literals. Rollup cell errors use
`missing-value` or `unavailable-value` with a
`{statement, item, period}` cell. HTML shows grouping columns as flat metadata,
collapses a unit only when every statement item has the same unit identifier,
and otherwise identifies each row's unit. Render precedence and the row-model
column and grid accounting are exact.

Schemas, examples, the language-neutral fixture matrix, record-validation
expected documents, and artifact-sensitive CLI descriptors now implement the
statement-row model directly. The replacement schemas close result and diff
variants, encode status/application cardinality, and retain relative schema
identifiers for Roadmap step 11. The runtime and generated guidance still
implement the dimensional fact model; no compatibility path has been added.
The delivery uses two sequential PRs: the merged Phase-0 contract slice and
this coordinated Phase-1-through-6 machine and runtime cutover.

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

- The normative prose and machine-readable evidence define the replacement
  contract while runtime code, runtime tests, exact HTML, and generated
  guidance still define the prior model. Phases 2–5 close those projections on
  this cutover branch.

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

The Phase-0 contract slice passes `./scripts/check-docs.sh`, including
Markdown, links, maintained content, all current schema and fixture integrity,
and every manifest-listed CLI descriptor. `git diff --check` passes. The
remaining contract/artifact mismatch is the deliberate Phase-1 cutover
boundary above. Codex and CodeRabbit reviews completed and their follow-up
clarified transition-time tooling, grouping obligations, statement grammar,
decimal serialization, and closed snapshot-diff forms. The same documentation
and whitespace gates pass after those changes.

Phase 1 replaces all three schemas and the complete example and fixture matrix.
Every valid document and record output passes the replacement document schema;
semantic-invalid fixtures pass JSON Schema first; schema-invalid fixtures fail
at that layer. Expected validation and snapshot-diff results pass their closed
schemas and use unique statement-qualified application keys. Static CLI
descriptor references and JSON Pointer selections resolve. The documentation
and whitespace gates pass.

## Blockers

None to beginning Phase 2.

## Next Action

Replace the document model and structural validation in Phase 2, using the
Phase-1 fixture matrix as executable evidence and preserving the single direct
cutover path.

## Completion

Roadmap step 10 is complete only when every phase is complete, no unplanned
legacy contract path remains, all generated and checked-in artifacts agree,
the full validation gate passes, and the required code-review pass has no
unresolved material finding. Release work remains Roadmap step 11.
