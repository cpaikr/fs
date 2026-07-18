# Statement Item Row Refactor Delivery Record

Status: Complete. Roadmap step 10 is implemented and verified.

This record owns the durable delivery evidence for replacing the dimensional
artifact model. The [semantic specification](../semantic-spec.md) owns current
artifact meaning, the [CLI acceptance contract](../cli/acceptance.md) owns
observable process behavior, and
[ADR 0001](../adr/0001-replace-dimensional-members-with-item-grouping.md) owns
the accepted replacement decision.

## Milestone

Roadmap step 10 replaced top-level items, facts, dimensions, members,
coordinates, shared presentation entries, and general calculation rules with
statement-owned item rows. Each item carries nested `values` and `groupings`
maps and may declare one additive `rollupTo` relationship.

The cutover changed the normative contracts, schemas, examples, fixtures,
validation, calculations, snapshots, rendering, generated authoring guidance,
CLI evidence, and packed package together. It deliberately introduced no dual
schema, legacy-document reader, normalizer, feature flag, or compatibility
alias.

## Fixed decisions

- Statements own ordered items and their values; item identifiers and rollup
  references are statement-local.
- Every item has fixed level-one fields and required `values` and `groupings`
  maps whose keys exactly match the containing statement periods and document
  grouping columns.
- `groupingColumns` declares flat descriptive purposes without schemes,
  categories, hierarchy, arithmetic, or value identity.
- Item cells distinguish exact decimal strings, missing values, explicit
  unavailability, and zero.
- Different items in one statement may use different units. Every rollup edge
  requires one exact shared unit identifier.
- `rollupTo` is the only arithmetic relationship. Reported parent cells remain
  explicit and are compared with their direct children using stored signs and
  the parent unit's tolerance.
- Application identity is `{statement, parent, period}`. Missing and
  unavailable rollup cells use statement/item/period cell identities.
- JSON remains canonical. Positional tables and TOON may be derived views, not
  parallel semantic contracts.
- General formulas, roll-forwards, dimensions, members, shared facts,
  presentation-only headings, and label overrides were removed rather than
  emulated.
- [ADR 0002](../adr/0002-bound-render-output.md) independently owns finite
  rendering limits and the `output-limit-exceeded` policy.

The unreleased artifact retained `formatVersion: "0.1"` at the cutover because
there was no released predecessor requiring compatibility. Subsequent schema
publication work added the current canonical identifiers without changing the
row model.

## Delivery

### Contracts and machine-readable evidence

The semantic specification, authoring guide, product scope, glossary, and CLI
contracts were first rewritten around statement-owned items. They fixed exact
cell states, map equality, mixed-unit rendering, rollup error applications,
snapshot forms, deterministic ordering, and render-failure precedence before
runtime changes began.

All three schemas and the complete example and fixture matrix were then
replaced as one evidence set. The new cases cover exact map keys, wrong nested
cell types, statement-local identifier reuse, unresolved and cyclic rollups,
unit mismatches, nested direct-child subtotals, calculation cell errors, and
the new snapshot identity. Raw malformed, trailing-content, duplicate-member,
and noncanonical exact-copy inputs retained their process-level purposes.

### Runtime cutover

The shared TypeScript document model and every direct consumer migrated on one
branch rather than creating an intermediate compatibility interface:

- structural validation now builds statement-local item registries, validates
  exact nested maps, and checks rollup references, cycles, and units;
- calculation discovers ordered direct children and evaluates every reported
  parent for each selected statement period with exact decimal arithmetic;
- snapshot comparison and recording use the statement-qualified application
  key and closed status/application combinations;
- rendering iterates statement, item, grouping-column, and period order
  directly, distinguishes homogeneous and heterogeneous units, and keeps
  grouping columns flat; and
- process orchestration, generated guidance, discovery, acceptance evidence,
  and packed-package smoke switched to the same row model without changing the
  established logging or writer guarantees.

The renderer checks every statement's column budget before accumulating the
document-wide grid budget, then enforces the encoded-byte limit through a
bounded sink. Structural nonconformance still precedes render budgets, while
calculation inconsistency and snapshot mismatch remain renderable.

### Legacy removal

The final audit removed legacy runtime types, schemas, fixtures, diagnostic
paths, generated guidance, and active-contract prose for dimensions, members,
facts, coordinates, presentations, general rules, and obsolete calculation
statuses. Uses of “member” that mean a JSON object member were intentionally
retained.

The migration used a reviewed contract slice followed by the coordinated
machine/runtime cutover. Completed Roadmap step-9 evidence remained historical
and was not rewritten as step-10 progress.

## Review findings closed during delivery

Fresh reviews found and closed several cross-layer defects before completion:

- schema-union diagnostics no longer leak irrelevant alternatives, and typed
  value cells are classified correctly;
- contradictory recorded numeric applications make snapshots invalid and
  block recording instead of being silently preserved;
- snapshot status and application combinations, including mutable aliases,
  are constrained in the TypeScript model;
- render preflight reports column overflow before document-wide grid overflow
  and process tests exercise every limit without entering the writer; and
- installed-package smoke covers discovery, validation, exact creation,
  snapshot recording, and rendering against the shared expected artifacts.

## Validation evidence

At closure:

- every valid document and expected result passed its schema, every
  semantic-invalid fixture first passed JSON Schema, and every schema-invalid
  fixture failed at the intended layer;
- the reference validator produced the language-neutral calculation and snapshot
  fixtures with deterministic diagnostics and application ordering;
- representative documents passed schema discovery, parsing, validation,
  calculation, snapshot recording and comparison, rendering, exact creation,
  CLI acceptance, and installed-package smoke;
- writer crash and concurrency integration retained atomic no-overwrite
  guarantees; and
- `pnpm verify`, `./scripts/check-docs.sh`, `git diff --check`, and the required
  final code-review pass completed without an unresolved material finding.

No temporary drift or compatibility path remained at closure.

## Subsequent work

Release-candidate preparation was intentionally outside this refactor. Its
current state, validation, and next action live only in the
[V0 release candidate plan](v0-release-candidate.md).
