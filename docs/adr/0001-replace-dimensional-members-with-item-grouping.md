# Replace dimensional members with statement item rows

Status: Accepted.

Replace the current item/fact/dimension/member model with ordered statement
item rows. Each row owns its unit, a period-keyed `values` map, a user-keyed
`groupings` map, and one optional additive `rollupTo` relationship. Keep JSON
as the canonical authoring format. This is an intentionally smaller model for
ordinary financial statements, not a general database, taxonomy, or
multidimensional reporting system.

This ADR records the accepted replacement target. It does not make an
unimplemented format normative: until the coordinated
[statement-item-row refactor](../plans/statement-item-row-refactor.md) updates
the owning documents and implementation, the
[semantic specification](../semantic-spec.md), schemas, fixtures, and CLI
contracts continue to define current behavior.

## Decision summary

The accepted replacement contract will:

- remove `dimensions`, dimension `members`, dimensional fact coordinates, and
  Cartesian statement axes;
- place ordered `items` directly inside each statement;
- place each item's period values in a required `values` map;
- place custom grouping assignments in a required `groupings` map;
- keep a unit identifier on each row and allow different units in one
  statement;
- declare custom grouping column names once at document level, without
  separate scheme or category definitions;
- reserve `rollupTo` as the only built-in grouping field with arithmetic
  meaning;
- retain explicit reported subtotal values and validate, rather than derive or
  materialize, them;
- keep custom groupings opaque and non-arithmetic;
- use JSON arrays of row objects as the canonical representation; and
- defer general formulas, reusable mapping profiles, cross-document taxonomy,
  and genuine multidimensional statements until concrete use cases justify
  them.

The decision deliberately values authoring accuracy and a small mental model
over compact serialization.

## Why `member` is the wrong concept

In the current contract, a dimension member distinguishes one fact from
another. Revenue for Korea and revenue for Japan are different facts because
the member participates in fact identity. A member is therefore not a group,
category, subtotal, mapping, or presentation label.

The motivating need is different. One already-atomic item should be usable in
several user-selected classifications without changing its value or identity:

- `직원급여` and `임원급여` may contribute to the reported subtotal
  `인건비`;
- the same rows may be shown as `노무비` in a presentation;
- `일반외상매출금` may be associated with `매출채권` for financial-statement
  analysis and with `NWC` for valuation; and
- users may add other purposes without waiting for the core format to define
  them.

Renaming members to groups would preserve the semantic mismatch. A grouping
describes an item; it does not create another coordinate for that item's value.

The member model also creates an operational problem. Rendering a statement
by eagerly expanding every member of every selected axis constructs a
Cartesian product. Thirty two-member axes imply 1,073,741,824 columns before
the renderer writes useful output. Removing this mechanism eliminates that
particular exponential path, although finite output limits are still required.

## Domain boundary

The preferred term remains **item**, not **account**. An item is a financial
meaning declared for one statement document. It may correspond to one ledger
account, several accounts already aggregated upstream, or another reported
line. The format does not model a chart of accounts or ledger behavior.

The atomicity rule is:

> FS may group an item but may not split, allocate, or infer finer detail from
> it. When finer detail is required, the author must supply finer-grained item
> rows from the source or an upstream process.

This does not claim that an accounting account is universally indivisible. It
claims only that FS will not invent a breakdown that its input does not
contain.

## Why the earlier grouping model was rejected

An earlier proposal introduced grouping profiles, classification schemes,
categories, assignments, exclusive rollups, tag schemes, presentation
overrides, metrics, profile versions, and profile binding. Those concepts can
model a reusable taxonomy system, but that is not the product being designed.

For ordinary statements they create several costs:

- authors must learn a database-like model before writing a small table;
- agents must coordinate many definitions and references;
- category and scheme objects repeat information already expressible as a
  column name and cell value;
- speculative versioning and reuse rules make simple documents harder; and
- the design starts solving cross-company taxonomy alignment without a
  demonstrated requirement.

The accepted model keeps only the distinction that affects correctness:

- `rollupTo` is arithmetic and validated; and
- every user-named grouping column is descriptive and never implies
  arithmetic.

## Accepted document shape

The following is the complete accepted statement-data shape. The example uses
`formatVersion: "0.2"` to make the incompatible change visible; the version may
be renumbered before an unreleased contract is replaced.

```json
{
  "formatVersion": "0.2",
  "documentId": "example-2025",
  "entity": { "name": "Example Entity" },
  "scope": { "label": "Consolidated financial statements" },
  "units": [
    {
      "id": "krw-millions",
      "label": "KRW millions",
      "measure": "KRW",
      "scale": 6,
      "defaultTolerance": "0"
    },
    {
      "id": "krw-per-share",
      "label": "KRW per share",
      "measure": "KRW/share",
      "scale": 0,
      "defaultTolerance": "0"
    }
  ],
  "periods": [
    {
      "id": "fy2025",
      "kind": "duration",
      "start": "2025-01-01",
      "end": "2025-12-31"
    },
    {
      "id": "fy2024",
      "kind": "duration",
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    {
      "id": "at-2025-12-31",
      "kind": "instant",
      "date": "2025-12-31"
    },
    {
      "id": "at-2024-12-31",
      "kind": "instant",
      "date": "2024-12-31"
    }
  ],
  "groupingColumns": [
    "majorGroup",
    "middleGroup",
    "valuation",
    "ppt"
  ],
  "statements": [
    {
      "id": "income-statement",
      "label": "손익계산서",
      "periods": ["fy2025", "fy2024"],
      "items": [
        {
          "id": "product-revenue",
          "label": "제품매출액",
          "unit": "krw-millions",
          "values": {
            "fy2025": "60",
            "fy2024": "50"
          },
          "rollupTo": "revenue",
          "groupings": {
            "majorGroup": "매출",
            "middleGroup": "제품매출",
            "valuation": null,
            "ppt": "Sales"
          }
        },
        {
          "id": "service-revenue",
          "label": "용역매출액",
          "unit": "krw-millions",
          "values": {
            "fy2025": "40",
            "fy2024": "30"
          },
          "rollupTo": "revenue",
          "groupings": {
            "majorGroup": "매출",
            "middleGroup": "용역매출",
            "valuation": null,
            "ppt": "Sales"
          }
        },
        {
          "id": "revenue",
          "label": "매출액",
          "unit": "krw-millions",
          "values": {
            "fy2025": "100",
            "fy2024": "80"
          },
          "groupings": {
            "majorGroup": "매출",
            "middleGroup": "매출액",
            "valuation": "Revenue",
            "ppt": "Sales"
          }
        },
        {
          "id": "employee-salary",
          "label": "직원급여",
          "unit": "krw-millions",
          "values": {
            "fy2025": "35",
            "fy2024": "30"
          },
          "rollupTo": "personnel-expense",
          "groupings": {
            "majorGroup": "판매비와관리비",
            "middleGroup": "인건비",
            "valuation": "Operating expenses",
            "ppt": "Labor"
          }
        },
        {
          "id": "executive-salary",
          "label": "임원급여",
          "unit": "krw-millions",
          "values": {
            "fy2025": "5",
            "fy2024": "4"
          },
          "rollupTo": "personnel-expense",
          "groupings": {
            "majorGroup": "판매비와관리비",
            "middleGroup": "인건비",
            "valuation": "Operating expenses",
            "ppt": "Labor"
          }
        },
        {
          "id": "personnel-expense",
          "label": "인건비",
          "unit": "krw-millions",
          "values": {
            "fy2025": "40",
            "fy2024": "34"
          },
          "groupings": {
            "majorGroup": "판매비와관리비",
            "middleGroup": "인건비",
            "valuation": "Operating expenses",
            "ppt": "Labor"
          }
        },
        {
          "id": "basic-eps",
          "label": "기본주당이익",
          "unit": "krw-per-share",
          "values": {
            "fy2025": "1250",
            "fy2024": "1100"
          },
          "groupings": {
            "majorGroup": "주당이익",
            "middleGroup": null,
            "valuation": "EPS",
            "ppt": "Earnings"
          }
        }
      ]
    },
    {
      "id": "balance-sheet",
      "label": "재무상태표",
      "periods": ["at-2025-12-31", "at-2024-12-31"],
      "items": [
        {
          "id": "general-trade-receivables",
          "label": "일반외상매출금",
          "unit": "krw-millions",
          "values": {
            "at-2025-12-31": "70",
            "at-2024-12-31": "55"
          },
          "rollupTo": "trade-receivables",
          "groupings": {
            "majorGroup": "자산",
            "middleGroup": "매출채권",
            "valuation": "NWC",
            "ppt": "Working Capital"
          }
        },
        {
          "id": "other-trade-receivables",
          "label": "기타외상매출금",
          "unit": "krw-millions",
          "values": {
            "at-2025-12-31": "10",
            "at-2024-12-31": "5"
          },
          "rollupTo": "trade-receivables",
          "groupings": {
            "majorGroup": "자산",
            "middleGroup": "매출채권",
            "valuation": "NWC",
            "ppt": "Working Capital"
          }
        },
        {
          "id": "trade-receivables",
          "label": "매출채권",
          "unit": "krw-millions",
          "values": {
            "at-2025-12-31": "80",
            "at-2024-12-31": "60"
          },
          "groupings": {
            "majorGroup": "자산",
            "middleGroup": "매출채권",
            "valuation": "NWC",
            "ppt": "Working Capital"
          }
        }
      ]
    }
  ]
}
```

The example is intentionally repetitive. Repeated keys make each value's
meaning local and make errors easier to diagnose. Token savings are not a
design objective.

## Field grammar

### Document fields

`formatVersion`, `entity`, `scope`, `units`, and `periods` remain required;
`documentId` remains optional. Their definitions retain their current shapes
and purposes. Unit and period definitions remain separate because they carry
real measurement and date semantics rather than acting as database
normalization. Unit, period, and statement identifiers remain unique in their
document-wide namespaces.

`groupingColumns` is an optional ordered list of unique, user-chosen column
identifiers. Omission means that there are no custom grouping columns. Each
identifier uses the same syntax as other FS identifiers. The list is only a
declaration of allowed row keys; it does not create grouping scheme or category
entities. Its order is useful when exporting a table but has no classification
hierarchy.

`statements` is a required nonempty array in presentation order. Each statement
has required `id`, `label`, `periods`, and `items` fields. Its `periods` is a
nonempty, duplicate-free list of references to document periods in displayed
column order. Its `items` is a nonempty array in displayed row order.

The existing optional `validationSnapshot` purpose remains orthogonal to the
row shape. Its accepted rollup application identity and ordering are defined
below.

### Item row fields

Every item row contains only these fixed level-one fields:

- required `id`, `label`, `unit`, `values`, and `groupings`;
- an optional `description`; and
- an optional `rollupTo`.

No other item-row keys are allowed. Period identifiers and grouping identifiers
occupy separate maps, so an identical string in both namespaces is still
unambiguous and neither can collide with a fixed item field. Declaring grouping
columns still prevents a typo such as `valution` from being silently accepted
as another custom grouping.

Item identifiers are unique within their statement. A value-cell identity is
therefore:

```text
statement id + item id + period id
```

The row's `unit` applies to every cell in its `values` map and resolves to one
unit definition. Different rows in one statement may use different units;
ordinary statements can therefore include cases such as currency amounts and
per-share values without creating an artificial second statement. A rollup
parent and all of its direct children must use the same unit. A renderer may
display a common unit once when all rows share it, but must identify units per
row when they differ.

### `values` map

`values` is a required object whose keys are exactly the periods selected by
the containing statement. A period value is exactly one of:

- an exact decimal string, including `"0"` for zero;
- `null`, meaning the item value is missing; or
- `{ "unavailable": true }`, meaning the source explicitly states that the
  value is unavailable.

Missing, unavailable, and zero remain distinct. JSON numbers are not accepted
because exact financial decimals must not pass through binary floating-point
representation.

Requiring each declared period key makes the logical table rectangular while
retaining all three cell states. A period identifier not selected by the
statement must not appear in the row's `values` map.

### `groupings` map

`groupings` is a required object whose keys are exactly the declared
`groupingColumns`. It is empty when `groupingColumns` is omitted. A grouping
value is either a nonempty string chosen by the author or `null` for no
assignment. Examples include:

```json
{
  "groupings": {
    "majorGroup": "판매비와관리비",
    "middleGroup": "인건비",
    "valuation": "Operating expenses",
    "ppt": "Labor"
  }
}
```

The grouping key itself names the purpose; its value names the selected group.
There are no separate `Scheme` and `Category` definitions. FS does not attach
meaning to names such as `valuation` or `ppt`, require a hierarchy, or provide
a taxonomy.

An item has exactly one value per declared grouping column. Overlapping
membership can
be represented by separate columns, but arrays of tags are not part of this
decision. Grouping values are document-local and are not reusable mapping
profiles across companies or documents.

Grouping cells never imply summation, signs, validation, ordering, or display
labels. For example, `valuation: "NWC"` means only that the author associated
the item with NWC analysis. It does not define or calculate NWC.

`인건비` needs its own item row only when it is actually a reported statement
line or subtotal with reported values. If it is merely a user classification,
the string `"인건비"` in a grouping column is sufficient.

## `rollupTo` and subtotal validation

The originally suggested name `subtotal` is replaced by `rollupTo` because the
field is stored on a child row and contains the parent item identifier. The
direction is therefore explicit:

```json
{
  "id": "employee-salary",
  "rollupTo": "personnel-expense"
}
```

For each parent and statement period, validation checks:

```text
reported parent value = sum(reported values of direct children)
```

`rollupTo` has these rules:

- it resolves to another item in the same statement;
- an item has at most one direct parent;
- the resulting graph is acyclic;
- parent and children use the same unit;
- child values contribute with their stored signs and coefficient `1`;
- the parent's value remains an explicit reported cell;
- validation never inserts, replaces, or derives a stored value;
- a missing or unavailable required cell is an evaluation error, not zero; and
- the unit's `defaultTolerance`, or exact zero when absent, controls the
  comparison.

Only direct children are summed. If a reported subtotal itself rolls up to a
higher total, its reported value contributes once at that higher level. Its
children are not also counted there.

This supports ordinary additive subtotals such as `직원급여 + 임원급여 =
인건비`. It intentionally does not express coefficients, ratios, roll-forwards,
cross-period formulas, cross-statement reconciliations, or analytical metrics.
Those should not be inferred from custom groupings. General calculation rules
are removed from this accepted core and may be designed later only if concrete
examples justify the added language.

### Validation results and snapshots

Rollup shape is structural: unresolved parents, cycles, unit mismatches between
a parent and its children, and invalid row keys make the document
nonconforming. A numerically unequal subtotal does not. It produces an
`unsatisfied` calculation application;
missing or unavailable parent or child cells produce an `error` application.

Each application has the stable key:

```json
{
  "statement": "income-statement",
  "parent": "revenue",
  "period": "fy2025"
}
```

Applications are ordered by statement order, then parent item-row order, then
the statement's period order. Within an error application, the first failing
cell is the parent followed by its direct children in item-row order. Numeric
applications retain `actual`, `expected`, `difference`, and `tolerance`, where
`actual` is the reported parent and `expected` is the child sum.

The document calculation status is `not-run` after structural failure,
`not-defined` when no row has `rollupTo`, `consistent` when every application
is satisfied, and `inconsistent` when any application is unsatisfied or an
error. The current `not-evaluated` and `skipped` states disappear because every
well-formed rollup applies to every period selected by its statement.

An optional `validationSnapshot` retains the current role of historical
validation evidence and stores the accepted statuses and ordered applications.
Snapshot diffing continues to use application keys; result and snapshot schemas
must replace their current rule/dimension key with the key above.

## JSON versus TOON and 2D tables

The initial discussion considered TOON because the data resembles a small 2D
table. That recommendation was reconsidered once authoring accuracy, rather
than token reduction, was made the primary criterion.

The [official TOON benchmark](https://github.com/toon-format/toon#benchmarks)
tests models reading serialized input and answering retrieval questions. It
does not test agents authoring TOON documents. Direct generation research is
recent and limited, but currently favors JSON:

- [Masciari et al.](https://arxiv.org/abs/2601.12014) report aggregate
  generation correctness of `0.840` for JSON and `0.513` for TOON across eight
  models and paired prompts; their metric emphasizes structure rather than
  exact financial-cell accuracy.
- [Matveev](https://arxiv.org/abs/2603.03306) reports the best overall
  one-shot and repaired accuracy for plain JSON; its sole flat-table case was
  `94.8%` for JSON and `90.5%` for TOON, but the benchmark has only four cases.
- [Kutschka and Geiger](https://arxiv.org/abs/2605.29676) find aggregate
  accuracy losses across five open-weight LLM configurations using TOON in
  tool-use benchmarks, with parse failures cascading in multi-turn,
  full-compression runs; those tasks are not financial-statement authoring.

The broader, peer-reviewed
[Lost in Formatting](https://aclanthology.org/2026.eacl-long.256/) study shows
that informationally equivalent output formats can materially shift F1
performance and that no format wins for every model and task. Existing work
therefore does not settle the narrower question of object rows versus positional
2D rows for financial statements.

`JSON objects versus TOON` is also a confounded comparison: it changes both
object-versus-positional representation and serialization syntax. A future
project benchmark should hold the semantic document constant and compare:

1. JSON row objects with nested `values` and `groupings` maps;
2. JSON row objects with flat dynamic period and grouping properties;
3. JSON with explicit `columns` and positional `rows`;
4. TOON tabular arrays; and
5. TSV or CSV.

The benchmark should cover creation, row insertion and deletion, reordering,
one-cell edits, new grouping columns, rollup references, and repair after a
precise diagnostic. Primary metrics are exact normalized cell accuracy,
whole-document accuracy, omitted or duplicated rows, positional shifts,
reference and rollup correctness, and repair success. Token count is not a
decision metric.

Until such a benchmark demonstrates otherwise, JSON row objects with nested
maps are canonical. Each row has the same small set of level-one fields, while
the path distinguishes a financial value such as `values.fy2025` from a
descriptive assignment such as `groupings.valuation`. The nesting prevents
dynamic identifiers from colliding with item metadata and lets JSON Schema
reject unknown level-one fields. Repeated period and grouping keys still
provide useful error-correcting redundancy: an omitted property is local and
diagnosable, while one missing positional cell can shift every later value
under the wrong column.

A 2D or TOON view may later be a derived import, export, or editing
representation. It must normalize to the same JSON model and must not become a
second semantic contract.

## Removed and deferred capabilities

The accepted core has no top-level `items`, `facts`, `dimensions`, `members`,
grouping profiles, category definitions, presentation schemes, metrics, or
general `calculationRules`.

In particular:

- a statement row owns its values instead of selecting shared facts;
- repeating a financial meaning in two statements creates two independent
  rows unless a future cross-statement feature explicitly relates them;
- standalone presentation-only heading rows and per-entry label overrides are
  removed; ordered item rows carry their own labels, and any later view-layer
  sections must not masquerade as financial items;
- custom grouping columns are not reusable cross-document mappings;
- general weighted formulas and roll-forwards are outside the simplified core;
  and
- genuinely multidimensional tables are outside V0.

When the source already supplies a finite dimensional intersection, an author
may flatten it into an explicitly named item row, such as
`closing-equity-share-capital`. FS must not generate the intersections or
infer values. If flattening would lose material meaning, that statement is
outside the accepted core until a separately justified sparse-cell design
exists.

This is a deliberate reduction in scope. It is preferable to a general
dimension system whose complexity and unbounded Cartesian behavior are not
needed by the product's ordinary-statement use case.

## Finite output remains a separate requirement

Removing member axes eliminates the motivating Cartesian expansion, but it
does not bound periods, rows, labels, or encoded output. The independent
overflow-safe limits and operational error contract are recorded in
[ADR 0002](0002-bound-render-output.md). The row-model decision does not accept
the separate output-budget policy.

## Considered alternatives

### Keep dimensions and add grouping

This is appropriate if independent fact axes are a confirmed core need. It
preserves a much larger V0 contract and the Cartesian rendering risk that
triggered the redesign. It is not recommended for the current product scope.

### Rename members to groups

Rejected because it changes vocabulary without changing identity semantics.

### Use grouping profiles, schemes, and categories

Rejected for the initial contract. They solve reusable taxonomy and mapping
management rather than simple document authoring.

### Use fixed `group1` and `group2` fields

Rejected because the names do not say what the classifications are for and
quietly imply an ordered hierarchy. Authors instead choose purpose-revealing
keys such as `valuation` and `ppt`.

### Allow undeclared custom item keys

This was the smallest customization model, but it cannot distinguish an
intended grouping from a misspelled grouping name. The accepted model declares
the key names once in `groupingColumns` and requires each row's `groupings` map
to contain exactly those keys.

### Keep period and grouping properties flat on each item

This most closely resembles CSV, but every item then has a context-dependent
set of level-one keys. Period identifiers, grouping identifiers, and fixed item
fields require collision rules, and a generic JSON Schema must accept a broad
union of value types for otherwise unknown properties. Nesting only the two
dynamic namespaces under `values` and `groupings` gives each item a fixed
interface without adding domain entities.

### Remove grouping entirely

This would be the smallest possible contract. It was considered because
grouping could become another speculative subsystem. Simple declared grouping
columns are retained because they directly express the motivating valuation,
presentation, major-group, and middle-group mappings without adding hierarchy
or behavior.

### Use `subtotal` on child rows

The behavior is retained but the field is named `rollupTo` so its direction and
reference type are clear.

### Make a positional 2D format canonical

Deferred pending the project-specific accuracy benchmark. It is attractive for
uniform statements but weakens local error isolation and makes evolving or
sparse grouping columns positional.

### Make TOON canonical for agents

Rejected under the accuracy-first objective. Current evidence does not show
more accurate generation, and compactness is not valuable enough here to
justify another grammar.

## Consequences

This is an incompatible semantic redesign, not a schema-only rename. Its
implementation requires the coordinated
[statement-item-row refactor](../plans/statement-item-row-refactor.md), which
covers:

- product scope, glossary, authoring guide, and semantic specification;
- the document, validation-result, and snapshot-diff schemas;
- examples and language-neutral fixtures;
- validation identities, diagnostics, and subtotal results;
- renderer behavior and the separately decided finite-output acceptance cases;
- CLI expected results and generated guidance; and
- removal or replacement of multidimensional examples, especially the
  statement of changes in equity.

The completed Roadmap step-9 plan remains historical evidence and must not be
rewritten as an active redesign plan.

The new row model should make common statements substantially easier for
people and agents to author and review. The corresponding costs are deliberate:
loss of shared-fact presentation, presentation-only heading rows, general
calculation rules, multidimensionality, and reusable mapping profiles. Those
capabilities must not return through undocumented conventions in grouping
column names.

JSON Schema can enforce the fixed item interface and the value types inside
`values` and `groupings`, but it cannot alone enforce every cross-reference
between document-local declarations and map keys. The semantic validator must
enforce exact map keys, reference resolution, uniqueness, rollup cycles, unit
equality along rollup edges, and cell-state rules. This is comparable to the
current validator's responsibility for document-local references and semantic
uniqueness.

The active plan updates each decision first in its owning normative document
and records temporary drift until the implementation and contract converge.
This ADR fixes the target design but does not by itself change implemented
behavior.
