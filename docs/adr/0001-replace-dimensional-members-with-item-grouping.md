# Replace dimensional members with statement item rows

Status: Accepted and implemented for `0.1`. The grouping portion is superseded
for `0.2` by [ADR 0003](0003-remove-user-defined-groupings.md).

Roadmap step 10 replaced the item/fact/dimension/member model with ordered,
statement-owned item rows. The
[semantic specification](../semantic-spec.md) owns the resulting artifact
contract; this ADR records why that replacement was chosen. The
[completed refactor plan](../plans/statement-item-row-refactor.md) records its
delivery evidence.

This document remains the historical rationale for the `0.1` replacement. Its
decision to retain document-local grouping columns is not part of `0.2`.

## Decision

FS represents ordinary financial statements as ordered item rows owned by each
statement:

- each item has one statement-local identifier, label, unit, period-keyed
  `values` map, and grouping-keyed `groupings` map;
- `groupingColumns` declares flat, document-local classification purposes
  without schemes, category entities, hierarchies, or arithmetic;
- an optional `rollupTo` is the only built-in arithmetic relationship;
- reported subtotal values remain explicit and are validated against their
  direct children rather than derived or materialized;
- different items in one statement may use different units, while every
  rollup edge requires the same unit;
- JSON row objects remain the canonical authoring representation; and
- general formulas, reusable mapping profiles, cross-document taxonomy,
  presentation-only rows, and genuinely multidimensional statements remain
  outside V0.

The replacement removed top-level items and facts, dimensional coordinates,
members, Cartesian statement axes, shared presentations, and general
calculation rules. Because no released predecessor used that model, the
project replaced the unreleased `formatVersion: "0.1"` contract directly
without a compatibility reader or parallel schema.

## Rationale

### A grouping describes an item; it does not identify a value

In the replaced model, a dimension member participated in fact identity.
Revenue for Korea and revenue for Japan were different facts because their
coordinates differed. The motivating classifications instead describe one
already-atomic item for purposes such as statement grouping, valuation, or
presentation. Changing one of those descriptions must not create another
financial value or identity.

Renaming dimensional members to groups would therefore preserve the semantic
mismatch. Declared grouping columns express the needed descriptions directly,
while keeping the distinction that affects correctness: `rollupTo` is
arithmetic and validated; custom grouping values are opaque and
non-arithmetic.

### FS groups supplied items but does not split them

The preferred term is **item**, not **account**. An item may correspond to one
ledger account, several accounts already aggregated upstream, or another
reported line. FS does not model a chart of accounts or ledger behavior.

FS may group an item but does not split, allocate, or infer finer detail from
it. When finer detail matters, the author must supply finer-grained item rows
from the source or an upstream process. This keeps financial judgment with the
author and prevents descriptive metadata from becoming an implicit taxonomy
or transformation system.

### The smaller model matches the product boundary

An earlier design considered grouping profiles, schemes, categories,
assignments, metrics, presentation overrides, profile versions, and profile
binding. Those concepts can support reusable taxonomy and mapping management,
but they make a small financial statement depend on a database-like model and
solve cross-company alignment that FS explicitly leaves to authors.

Statement-owned rows make values, units, periods, order, grouping assignments,
and reported subtotals local and reviewable. Repeated map keys add useful
error-correcting redundancy: an omitted or mistyped cell remains local and
diagnosable instead of shifting later positional values under the wrong
column.

### The replacement removes an exponential rendering path

The dimensional renderer expanded selected axes into a Cartesian product. A
small conforming document could therefore imply an impractically large table
before useful output was produced. Iterating statement rows and selected
periods directly removes that expansion mechanism.

Rows do not by themselves bound output: statements, periods, items, and labels
can still be large. The independent structural and byte budgets remain the
decision of [ADR 0002](0002-bound-render-output.md) and the observable render
contract.

## Canonical JSON and research basis

Authoring accuracy, local error isolation, and validation were more important
than token reduction. At decision time, the available evidence did not justify
making TOON or a positional table the canonical authoring format:

- the [official TOON benchmark](https://github.com/toon-format/toon#benchmarks)
  evaluated comprehension through retrieval questions rather than direct
  document generation;
- [Masciari et al.](https://arxiv.org/abs/2601.12014) found lower aggregate
  structural correctness for prompted TOON generation than for JSON across
  their evaluated models;
- [Matveev](https://arxiv.org/abs/2603.03306) found plain JSON had the strongest
  overall one-shot and repaired generation accuracy, with TOON competitive on
  its flat-table case but weaker overall;
- [Kutschka and Geiger](https://arxiv.org/abs/2605.29676) found token savings
  accompanied by accuracy losses and cascading parse failures in agentic
  tool-use benchmarks; and
- the peer-reviewed
  [Lost in Formatting](https://aclanthology.org/2026.eacl-long.256/) study
  showed that informationally equivalent formats can materially change model
  performance and that no format dominates across every setting.

These studies do not settle the narrower FS authoring question. Reconsidering
the canonical representation would require an FS-specific benchmark that
holds the semantic document constant and measures exact cell accuracy,
whole-document accuracy, row insertion and deletion, ordering, references,
rollups, grouping edits, and repair after stable diagnostics. Token count alone
is not a decision metric.

Derived table, CSV, TSV, or TOON views remain possible when they normalize to
the same JSON document and do not introduce a second semantic contract.

## Rejected alternatives

- **Keep dimensions and add grouping.** This retained a larger mental model
  and the Cartesian rendering path without a confirmed multidimensional V0
  use case.
- **Rename members to groups.** A vocabulary change would not correct their
  role in value identity.
- **Add profiles, schemes, and category entities.** These solve reusable
  taxonomy and mapping management rather than document-local authoring.
- **Use fixed `group1` and `group2` fields.** Fixed names obscure purpose and
  imply an ordered hierarchy.
- **Allow undeclared custom item keys.** Misspelled grouping names would become
  silently accepted fields. Declaring `groupingColumns` keeps the interface
  closed.
- **Put periods and groupings directly on each item.** Dynamic keys would
  collide with fixed item metadata and force a broad level-one schema. The two
  nested maps keep namespaces and value types distinct.
- **Remove grouping entirely.** Flat declared columns directly support the
  motivating classifications without importing taxonomy behavior.
- **Name the child reference `subtotal`.** `rollupTo` makes its direction and
  reference target explicit.
- **Make a positional 2D or TOON form canonical.** Available generation
  evidence did not outweigh the weaker local error isolation and positional
  repair risks.

## Consequences

The current model is intentionally smaller and easier to author, validate,
render, and inspect. Item identity is statement-local, values are explicit,
groupings are descriptive, and direct additive rollups are the only arithmetic
graph.

The deliberate costs are the loss of shared-fact presentation,
presentation-only headings, general formulas, multidimensional coordinates,
and reusable mapping profiles. Those capabilities must not return through
undocumented grouping-name conventions. A genuinely multidimensional source
is outside V0 when flattening it into explicitly named items would lose
material meaning.

JSON Schema enforces the fixed row and cell shapes, while semantic validation
owns document-local map equality, reference resolution, uniqueness, rollup
acyclicity, unit equality, dates, and snapshot invariants. The semantic
specification, schemas, and fixtures are the current contract; this ADR is not
a parallel field grammar.

## Migration conclusion

Roadmap step 10 updated the semantic, schema, fixture, validation, snapshot,
rendering, CLI, guidance, and package surfaces as one replacement. It added no
legacy reader, normalizer, compatibility alias, dual schema, or alternate
runtime model. The completed plan records the validation and review evidence
for that cutover.
