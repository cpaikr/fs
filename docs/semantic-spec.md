# FS V0 Semantic Specification

This specification defines the current `0.1` FS document contract independently
of any implementation language. The
[JSON Schema](../schema/fs-document.schema.json) enforces this JSON shape;
requirements concerning uniqueness, references, dates, nested-map keys,
rollups, snapshots, or ordering remain normative where JSON Schema cannot
express them.

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative.

## 1. Artifact boundary and closed grammar

An FS document is one JSON object describing exactly one reporting entity and
one reporting scope. Definitions and identifiers are document-local and have
no meaning outside the document unless an author separately coordinates them.
The document does not encode extraction provenance, an accounting taxonomy,
policy, source mappings, or multi-entity alignment. Filenames have no semantic
meaning.

`formatVersion` MUST be `"0.1"`. Validation results and snapshot diffs likewise
use `formatVersion: "0.1"`.

An FS document MAY contain a top-level `$schema` member. When present, its
value MUST be exactly
`https://cpaikr.github.io/fs/schema/0.1/fs-document.schema.json`. This pointer
aids schema discovery only. It does not change `formatVersion`, require network
access, or replace the complete structural and semantic validation defined by
this specification.

The top-level members, in specification order, are optional `$schema`,
`formatVersion`, optional `documentId`, `entity`, `scope`, `units`, `periods`,
optional `groupingColumns`, `statements`, and optional `validationSnapshot`.

No other top-level member is allowed. `$schema` is not an author-controlled
identifier: if supplied, it is the exact constant above. `documentId`,
optional `entity.id`, and optional `scope.id` are author-controlled stable
identities. Their required `entity.name` and `scope.label` members are
human-readable. Omitting an optional identity has no effect on conformance or
calculation semantics.

`entity` contains required nonempty string `name` and optional identifier
`id`. `scope` contains required nonempty string `label` and optional identifier
`id`. These objects have no other members. Every `label`, `name`, `measure`,
`description`, and grouping string described below MUST be nonempty.

`units`, `periods`, and `statements` MUST be nonempty arrays. Every statement's
`periods` and `items` arrays MUST be nonempty. `groupingColumns` MAY be omitted
when unused. Every item always has required `values` and `groupings` objects;
when `groupingColumns` is omitted or empty, `groupings` MUST be `{}`.

Objects are closed: properties not declared by the grammar below are
nonconforming. This specification is the complete source for required fields,
JSON types, meaning, and cross-object invariants. The schemas encode the same
closed grammar without adding another contract.

## 2. Identifiers, references, and order

Every identifier and grouping-column name MUST match
`^[A-Za-z][A-Za-z0-9._-]*$`. Unit, period, and statement identifiers MUST be
unique in their respective document-wide arrays. Item identifiers MUST be
unique within their containing statement. The same item identifier MAY occur
in different statements and has no shared identity between them.

References MUST resolve within the document and to the indicated definition
kind. Item references made by `rollupTo` resolve only within the containing
statement.

Object member order is never semantic. The following arrays are semantically
ordered:

1. `groupingColumns` declares grouping-column order;
2. `statements` declares statement display and calculation order;
3. each statement's `periods` declares its display and calculation order; and
4. each statement's `items` declares row and calculation order.

Unit and period definition-array order is not presentation order. Consumers
MUST NOT infer arithmetic, taxonomy, or hierarchy from any order.

## 3. Units and periods

### 3.1 Units

A unit names an author-defined `measure` and a base-ten `scale`. `scale` MUST
be an integer in the inclusive range `-9007199254740991` through
`9007199254740991`. It is the exponent `s` in:

`stored value × 10^s measure units`

Thus `"1250"` with measure `KRW` and scale `6` represents KRW 1,250,000,000.
FS does not resolve measures through a registry or convert currencies,
measures, scales, or units.

`defaultTolerance`, when present, is a nonnegative exact decimal expressed in
the unit's scaled values. Its implicit value is exact zero. A rollup uses the
parent item's unit default tolerance; there is no relationship-level override.
Each closed unit object contains required `id`, `label`, `measure`, and `scale`
and optional `defaultTolerance`.

Every decimal field uses one canonical JSON string grammar:

```text
^(?:0|-?(?:[1-9][0-9]*)(?:\.[0-9]*[1-9])?|-?0\.[0-9]*[1-9])$
```

This grammar applies to item values and application `actual`, `expected`,
`difference`, and `tolerance` in current results, snapshots, and diffs.
`defaultTolerance` and application `tolerance` additionally MUST be
nonnegative. No decimal field may use a JSON number.

### 3.2 Periods

An instant period has `kind: "instant"` and one ISO 8601 calendar `date`. A
duration period has `kind: "duration"`, an inclusive `start`, and an inclusive
`end`. Dates MUST be real Gregorian dates and a duration's start MUST be no
later than its end.

The closed instant object contains exactly `id`, `kind`, and `date`. The closed
duration object contains exactly `id`, `kind`, `start`, and `end`. Dates use
the lexical form `YYYY-MM-DD`.

Period identifiers are references, not encoded dates. Two period definitions
MUST NOT describe the same instant or the same `(start, end)` duration.
Different durations MAY overlap.

## 4. Statements and item rows

A statement owns an ordered collection of item rows and selects the periods
for which every row stores one cell. All item data is statement-owned.

Every closed statement object contains exactly required `id`, `label`,
`periods`, and `items`. Its label is a nonempty display string.

Each statement's `periods` array MUST contain unique, resolved period
identifiers. Every item has:

- required `id`, `label`, `unit`, `values`, and `groupings`;
- optional `description` and `rollupTo`; and
- no other member.

The `unit` reference applies to every value of that item. Different items in
one statement MAY use different units. `description` clarifies meaning and MAY
be displayed as presentation text, but it does not affect validation or
artifact semantics.

An item is the atomic financial meaning supplied to FS. It may correspond to
one ledger account, several accounts already aggregated upstream, or another
reported line. FS MAY group an item but MUST NOT split, allocate, or infer
finer detail from it.

## 5. Values and groupings

### 5.1 Value maps and cell states

An item's `values` object MUST have exactly the containing statement's period
identifiers as keys. No key may be missing or extra. Each cell is exactly one
of:

- an exact decimal string;
- JSON `null`, meaning missing; or
- `{ "unavailable": true }`, meaning explicitly unavailable.

Missing is encoded explicitly as `null`, because the exact-key rule makes
omission nonconforming. Zero is `"0"`. JSON number `0`, an empty string,
`null`, and an unavailable value are not zero.

The canonical decimal grammar in Section 3.1 forbids exponent, leading plus,
leading integer zeros, trailing fractional zeros, and negative zero. Consumers
MUST use decimal arithmetic capable of representing these strings exactly and
MUST NOT first convert them to binary floating point.

### 5.2 Grouping maps

`groupingColumns` declares document-local, user-named classification purposes.
It MUST contain unique identifiers. It defines no scheme, category registry,
taxonomy, hierarchy, arithmetic, or value coordinate.

Every item's `groupings` object MUST have exactly the declared
`groupingColumns` as keys. Each value is a nonempty string or JSON `null`.
Grouping values describe an already-atomic item. They never create another
item, split a value, affect item identity or order, or imply a rollup.

## 6. Additive rollups

`rollupTo` is the only arithmetic relationship. It is a child-to-parent
reference within the same statement. A reference MUST resolve to another item,
MUST NOT refer to the item itself, and all relationships in a statement MUST
form an acyclic directed graph. The child and parent MUST use the same unit
identifier.

A parent with one or more direct children is a reported subtotal. Parent
values remain explicit stored cells. Validation never derives, fills,
replaces, or materializes them. For each selected statement period:

`expected = sum(direct child values)`

`difference = actual parent value - expected`

Every coefficient is one and stored signs are used unchanged. An application
is satisfied when `abs(difference) <= parent unit defaultTolerance`, or exact
zero when the tolerance is omitted. Only direct children are summed. A child
that is itself a subtotal contributes its explicit stored value to its parent,
so a nested descendant is not counted twice.

Custom grouping values have no effect on rollup discovery or evaluation.

## 7. Structural and calculation outcomes

Structural conformance includes JSON Schema conformance and every normative
identifier, reference, date, map-key, snapshot, unit, and graph invariant in
this specification. Rollup inconsistency does not affect structural
conformance. Rollups MUST NOT run for a structurally nonconforming document.

Each rollup application has a stable key:

```json
{ "statement": "income-statement", "parent": "revenue", "period": "fy2025" }
```

The key is statement-local parent identity plus the selected period. Each
application is exactly one of:

- `satisfied`, with `actual`, `expected`, `difference`, and `tolerance`;
- `unsatisfied`, with the same numeric fields; or
- `error`, with reason `missing-value` or `unavailable-value` and a `cell`
  object `{ "statement": id, "item": id, "period": id }`.

For a cell error, inspect the parent first and then direct children in item
order; report only the first missing or unavailable cell. No numeric fields
are present on an error application.

The complete serialized application forms are:

```json
{
  "key": {
    "statement": "income-statement",
    "parent": "revenue",
    "period": "fy2025"
  },
  "status": "satisfied",
  "actual": "100",
  "expected": "100",
  "difference": "0",
  "tolerance": "0"
}
```

```json
{
  "key": {
    "statement": "income-statement",
    "parent": "revenue",
    "period": "fy2025"
  },
  "status": "error",
  "reason": "missing-value",
  "cell": {
    "statement": "income-statement",
    "item": "revenue",
    "period": "fy2025"
  }
}
```

An unsatisfied application has the first form with `status: "unsatisfied"`.
An unavailable-cell error has the second form with reason
`unavailable-value`. No other application field is permitted.

Applications are ordered by statement order, then parent item order among
items with direct children, then statement period order. Keys MUST be unique.
The document calculation status is:

- `not-run` when structural nonconformance prevents rollup evaluation;
- `not-defined` when no item is a rollup parent;
- `consistent` when at least one application exists and all are satisfied; or
- `inconsistent` when any application is unsatisfied or error.

`not-run` requires structural status `nonconforming`; every other calculation
status requires `conforming`. `not-run` and `not-defined` have empty
application arrays. The other statuses have nonempty arrays following the
rules above.

A validation result is exactly:

```json
{
  "formatVersion": "0.1",
  "conformance": { "status": "conforming", "errors": [] },
  "calculations": { "status": "not-defined", "applications": [] }
}
```

The empty application array is replaced by the required nonempty ordered
applications when status is `consistent` or `inconsistent`. For
`nonconforming`, `errors` is nonempty, calculations are `not-run`, and
applications are empty. For `conforming`, `errors` is empty. These objects are
closed, and each error contains exactly `code`, `path`, and `message`.

[`validation-result.schema.json`](../schema/validation-result.schema.json)
encodes this language-neutral result shape.

## 8. Validation snapshots and deterministic diffs

`validationSnapshot` MAY record an earlier validation result in an ordinary FS
document. It contains only `conformance`, `calculations`, and ordered
applications. It is historical evidence, never current status; consumers MUST
always recompute current validation.

The snapshot fields are scalar status strings plus the application array:

```json
{
  "conformance": "conforming",
  "calculations": "not-defined",
  "applications": []
}
```

As with a current result, `consistent` and `inconsistent` require nonempty
applications, while `not-run` and `not-defined` require an empty array.

Snapshots omit `formatVersion`, timestamps, validator identity, filenames,
document hashes, and duplicated document identity. A snapshot MUST be
internally consistent under the result-status rules in Section 7. Snapshot
application keys MUST be unique. Recorded keys and cells are historical and
do not resolve against current statements, items, or periods.

A diff compares conformance status, calculation status, and applications by
key. Applications are classified as `unchanged`, `changed`, `added`, or
`removed`. Entries are ordered by current application order followed by
removed applications in recorded order. Each key appears exactly once.

When `validationSnapshot` is absent, the diff is exactly:

```json
{ "formatVersion": "0.1", "status": "not-recorded" }
```

A present but structurally invalid snapshot produces exactly:

```json
{
  "formatVersion": "0.1",
  "status": "not-comparable",
  "reason": "invalid-snapshot"
}
```

Otherwise the closed diff object contains exactly `formatVersion`, status
`match` or `mismatch`, `conformance`, `calculations`, and `applications`.
`conformance` is exactly `{ "recorded": status, "current": status }`, where
each status is `conforming` or `nonconforming`. `calculations` has the same two
members, where each value is `not-run`, `not-defined`, `consistent`, or
`inconsistent`. Status is `match` only when every compared value matches and
`mismatch` otherwise.

Each closed application-change object has one of four exact member sets:

- `unchanged` and `changed`: `change`, `recorded`, and `current`;
- `added`: `change` and `current`; or
- `removed`: `change` and `recorded`.

`change` is the matching literal. Every `recorded` and `current` value is one
complete closed application object from Section 7, including all numeric fields
for `satisfied` or `unsatisfied`, or `reason` and `cell` for `error`.
`unchanged` and `changed` applications MUST have the same key. `added` and
`removed` intentionally omit the absent side. Human messages are not snapshot
fields and are not compared.
[`snapshot-diff.schema.json`](../schema/snapshot-diff.schema.json) encodes
these forms.

### 8.1 Structural diagnostics

Every structural error has a stable `code`, a JSON Pointer `path`, and a
nonempty human-readable `message`. Multiple errors are ordered by path and then
code. These are the complete current codes and path rules:

- `required-property`: a required member is absent; the path is the missing
  member's would-be path.
- `unknown-property`: a closed object has an extra member; the path is that
  member.
- `invalid-type`: a value has the wrong JSON type; the path is that value.
- `invalid-value`: a typed value violates its enum, constant, pattern,
  cardinality, closed union, or a recorded numeric application's arithmetic
  and status relationship; the path is that value, application, or collection.
- `decimal-string-required`: an item value uses a JSON number instead of an
  exact decimal string; the path is that value cell.
- `invalid-tolerance`: `defaultTolerance` is malformed or negative; the path
  is that member.
- `scale-out-of-range`: `scale` is outside the safe-integer range; the path is
  that member.
- `duplicate-id`: a unit, period, statement, grouping column, or
  statement-local item identifier repeats; the path is the later identifier.
- `duplicate-reference`: a statement repeats a selected period; the path is
  the later reference.
- `duplicate-period-definition`: a period repeats an instant or duration
  definition; the path is the later period object.
- `invalid-date`: a date string is not a real Gregorian date; the path is the
  date member.
- `invalid-duration`: a duration starts after it ends; the path is the period
  object.
- `unresolved-reference`: a period, unit, or `rollupTo` reference does not
  resolve in its required scope; the path is the reference.
- `map-key-mismatch`: `values` keys differ from statement periods or
  `groupings` keys differ from `groupingColumns`; the path is the complete map.
- `self-rollup`: an item rolls up to itself; the path is `rollupTo`.
- `cyclic-rollup`: a non-self `rollupTo` edge participates in a cycle; the path
  is that edge, with one error for every participating edge.
- `unit-mismatch`: a child and its rollup parent use different units; the path
  is the child's `rollupTo`.
- `duplicate-application-key`: an embedded snapshot repeats an application
  key; the path is the later application's `key`.

Self-reference validation emits only `self-rollup`; it does not also emit
`cyclic-rollup`. Schema validators MUST normalize native keywords to the code
above; implementation-specific schema keywords are not public diagnostics.
Language-neutral equality compares conformance status and each error's code
and path. Message wording is not normative.

## 9. Canonical JSON mapping and rendering

Canonical V0 means the fields and structures in this specification, not a
byte-level JSON canonicalization scheme. Producers SHOULD emit
top-level members in specification order and preserve author-chosen array
order. Consumers MUST preserve semantically ordered arrays and treat all
object member order as irrelevant.

Rendering is a deterministic projection, not a second semantic contract. It
shows statements and items in array order and periods in each statement's
selected order. Declared grouping columns appear as flat, non-arithmetic
columns in declaration order. A homogeneous statement identifies its one unit
once; a heterogeneous statement shows a unit cell for each row. Rendering does
not infer signs, missing values, taxonomy, or financial meaning from rollups or
groupings. A renderer may derive hierarchy and subtotal styling solely from
explicit `rollupTo` relationships for presentation; those derivations add no
financial meaning and do not change values or row order. A progressive copy
convenience may project one statement to tab-separated text with an explicit
Unit column on every row; this is still a non-normative presentation of the
same ordered item values. The
[CLI acceptance contract](cli/acceptance.md) fixes the exact HTML, copy, and
finite-output behavior.

## 10. Conformance fixture contract

Files under `examples/` and `fixtures/valid/` MUST conform to the document
schema and every semantic invariant above. Each file under `fixtures/invalid/`
is intentionally nonconforming and has a matching entry in
[`manifest.json`](../fixtures/manifest.json) naming its expected failure.

Calculation-result and snapshot-diff fixtures are language-neutral expected
outputs. A conforming validator MUST produce semantically equal objects for
the corresponding inputs, independent of programming language or display
format.
