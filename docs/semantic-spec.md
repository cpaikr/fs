# FS V0 Semantic Specification

Status: normative V0 artifact contract, 2026-07-16.

This specification defines the meaning of an FS document independently of any
implementation language. The [JSON Schema](../schema/fs-document.schema.json)
checks its JSON shape. Requirements in this document that concern uniqueness,
references, dates, arithmetic, or ordering are additional structural or
calculation semantics and remain normative even where JSON Schema cannot
express them.

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative.

## 1. Artifact boundary

An FS document is one JSON object describing exactly one reporting entity and
one reporting scope. It MAY contain many periods, facts, statements, and
calculation rules. Definitions are document-local; identifiers have no meaning
outside the document unless an author separately coordinates them.

The document does not encode extraction provenance, an accounting taxonomy,
policy, or multi-entity alignment. Filenames have no semantic meaning.

`formatVersion` MUST be `"0.1"`. A future incompatible artifact contract will
use a different value. `documentId` is an optional author-controlled stable
identity; omitting it has no effect on conformance or calculation semantics.
`entity.id` and `scope.id` are likewise author-controlled identifiers, while
their `name` and `label` fields are human-readable.

## 2. Identifiers and references

Every `id` MUST match `^[A-Za-z][A-Za-z0-9._-]*$`. Within each definition
collection, identifiers MUST be unique. References MUST resolve within the
same document and to the indicated definition kind.

Object member order is never semantic. Array order is semantic only where this
specification says so. Consumers MUST NOT infer meaning from definition or fact
array order.

## 3. Definitions

### 3.1 Items

An item gives a document-local financial meaning to facts. `label` is its
default display label. `description` MAY clarify the author's meaning.

V0 has no general classification field. Statement membership, calculation
participation, or an identifier naming convention MUST NOT be interpreted as a
classification taxonomy.

### 3.2 Units, measures, and scales

A unit names both a `measure` and a base-ten `scale`. `measure` is an
author-defined measurement name such as `KRW`, `shares`, or `pure`; it is not
resolved through a core registry. `scale` is the integer exponent `s` in:

`displayed value × 10^s measure units`

Thus a value of `"1250"` in a KRW unit with scale `6` means KRW
1,250,000,000. A percent can use measure `pure`, scale `-2`.

Arithmetic combines facts only when their unit identifiers are identical.
V0 does not convert units, scales, currencies, or measures.

`defaultTolerance`, when present, is an absolute tolerance expressed in the
unit's scaled values. Its implicit value is exact zero. A rule's `tolerance`
overrides the unit default for that rule.

### 3.3 Periods

An instant period has `kind: "instant"` and one ISO 8601 calendar `date`. A
duration period has `kind: "duration"`, an inclusive `start`, and an inclusive
`end`. Dates MUST be real Gregorian dates and a duration's start MUST be no
later than its end.

Period identifiers are references, not encoded dates. Two period definitions
MUST NOT describe the same instant or the same `(start, end)` duration.
Different durations MAY overlap, including annual, quarterly, and year-to-date
periods.

### 3.4 Dimensions

A dimension is a named non-period fact axis. Its member definitions are
document-local. Dimension and member identifiers MUST be unique within their
respective collections.

V0 uses explicit dimension coordinates. It defines no default member, member
hierarchy, aggregation, wildcard, or dimensional arithmetic. A fact with no
dimensions and a fact with dimensions are distinct.

## 4. Facts and coordinates

Facts are encoded individually in `facts`; compact fact series are not part of
the canonical V0 mapping. This makes absence, explicit unavailability, and the
complete coordinate visible without expansion rules.

A fact coordinate is the tuple of:

1. `item` identifier;
2. `period` identifier;
3. `unit` identifier; and
4. the complete `dimensions` object, or the empty object if omitted.

No two facts may have the same coordinate. Every dimension and member in a
fact MUST resolve. Dimension keys are compared as an unordered map.

A fact has exactly one of:

- `value`, containing an exact decimal string; or
- `unavailable: true`, stating explicitly that a value is unavailable.

A missing fact is represented only by the absence of its coordinate from
`facts`. Zero is `"0"`; JSON number `0`, JSON `null`, an empty string, and an
unavailable fact are not zero and are not valid value encodings.

Exact decimals use ordinary base-ten notation without exponent, leading plus,
leading integer zeros, trailing fractional zeros, or negative zero. Consumers
MUST use decimal arithmetic capable of representing the strings exactly and
MUST NOT first convert them to binary floating point.

## 5. Statements

A statement is a flat presentation over shared facts. It does not own facts,
materialize missing facts, or imply calculations.

`periods` explicitly lists displayed periods in display order. `dimensions`
MAY list non-period presentation axes and their displayed members in display
order. A statement cell is found by combining an item entry, one listed
period, all listed dimension members for the applicable axis product, and the
statement's `unit`. Absence remains missing; an unavailable fact remains
unavailable.

`entries` is the row order. An `item` entry references one item and MAY
override its display label. A `heading` entry contains only a label. Headings
are the sole non-item entry in V0 and carry no nesting, indentation,
calculation, coordinate, or classification semantics.

The same fact MAY be presented by any number of statements. Separate facts
that an author expects to agree require a calculation rule or explicit
assertion; presentation never creates that expectation.

## 6. Calculation rules

Calculation rules validate stored facts. They never create, replace, infer, or
materialize a fact. Rules are optional.

All coefficients and tolerances are exact decimals. For every evaluated rule:

`expected = Σ(coefficient × operand value)`

`difference = actual target value - expected`

The application is satisfied when `abs(difference) <= tolerance`.

Every target and operand selected by one application MUST use the rule's
`unit`. If an applicable required coordinate is missing or unavailable, the
application has an evaluation error; it is not skipped and not treated as
zero.

### 6.1 Same-period rules

A `samePeriod` rule declares a target item, one or more operand terms, a unit,
and an explicit scope. Its Cartesian application scope is every listed period
combined with every listed dimension coordinate. When `dimensions` is
omitted, the sole coordinate is the empty object.

For each application, target and operands use the same scoped period, unit,
and complete dimension coordinate. Same-period rules are reusable because the
item relationship is declared once for several coordinates.

### 6.2 Roll-forward rules

A `rollForward` rule is V0's only automatically bound cross-period rule. It
declares a balance item, movement terms, a unit, and candidate duration
periods. For each candidate duration `current`, the validator finds duration
periods from the same rule scope whose `end` is the calendar day immediately
before `current.start`.

- no candidate and no earlier scoped duration: skip as `no-predecessor`;
- no candidate but at least one earlier scoped duration: skip as `gap`;
- more than one candidate: skip as `ambiguous-predecessor`;
- exactly one candidate: apply the rule.

For an application, the opening coordinate is the balance item at the unique
instant period whose date equals the predecessor's `end`. The closing
coordinate is the balance item at the unique instant period whose date equals
the current duration's `end`. Movement coordinates use their declared items
and the current duration. All use the rule unit and scoped dimensions.

Once a unique predecessor exists, absent or non-unique boundary instant
periods, missing facts, and unavailable facts are evaluation errors. They are
not reasons to skip. Earlier means a duration whose end is before
`current.start`; overlap alone does not establish precedence.

The rule applies for every listed dimension coordinate, or the empty object
when `dimensions` is omitted. Authors MUST use explicit assertions for gaps,
ambiguous overlapping series, nonconsecutive comparisons, or any other
irregular temporal relationship.

### 6.3 Explicit assertions

An `assertion` binds one exact target coordinate and exact operand coordinates.
It has exactly one application and no automatic scope or temporal binding.
Assertions are appropriate for cross-statement reconciliations, irregular
periods, and relationships between differing dimensions. They are distinct
from reusable rules so an exact exception cannot silently broaden its scope.

## 7. Structural and calculation outcomes

Structural conformance includes JSON Schema conformance and all normative
referential, uniqueness, date, coordinate, and rule invariants in this
specification. Calculation inconsistency does not affect structural
conformance.

Each rule application has one status:

- `satisfied`: evaluated within tolerance;
- `unsatisfied`: evaluated outside tolerance;
- `error`: applicable but a required coordinate was missing or unavailable,
  a boundary instant was absent/non-unique, or another evaluation precondition
  failed; or
- `skipped`: automatic temporal binding did not apply, with reason
  `no-predecessor`, `gap`, or `ambiguous-predecessor`.

The document calculation status is:

- `not-defined` when no calculation rules exist;
- `not-evaluated` when rules exist but every application is skipped;
- `consistent` when at least one application is satisfied, any others are
  skipped, and none is unsatisfied or error; or
- `inconsistent` when any application is unsatisfied or error.

Application order is calculation-rule array order, then each rule's period
array order, then dimension-coordinate array order. An application key is the
structured object `{"rule": id}` plus `period` and `dimensions` when the rule
has those bindings. Empty dimensions are recorded as `{}`. This key is stable
across stored/current results and is the identity used by snapshot diffs.

The language-neutral result shape is specified by
[`validation-result.schema.json`](../schema/validation-result.schema.json).

## 8. Validation snapshots and deterministic diffs

`validationSnapshot` MAY record an earlier validation result in an otherwise
ordinary FS document. It contains only `conformance`, `calculations`, and the
ordered application results needed for comparison. It is historical evidence,
never current status; consumers MUST always recompute current validation.

Snapshots intentionally omit timestamps, validator identity, filenames,
document hashes, and duplicated document identity. These do not contribute to
semantic comparison and would make recording or diffing less deterministic.

Snapshot applications use the stable application key. A diff compares
conformance status, calculation status, and applications by key, classifying
each application as `unchanged`, `changed`, `added`, or `removed`. Diff entries
are ordered by current application order followed by removed applications in
their recorded order. No snapshot produces `status: "not-recorded"`; otherwise
the status is `match` only when every compared value matches, and `mismatch`
otherwise.

For `satisfied` and `unsatisfied`, comparison includes status, actual,
expected, difference, and tolerance. For `error` and `skipped`, it includes
status and reason. Human messages are not snapshot fields and are not compared.
The normative diff shape is specified by
[`snapshot-diff.schema.json`](../schema/snapshot-diff.schema.json).

## 9. Canonical JSON mapping and determinism

Canonical V0 means the field names and structures in this specification and
its schemas, not a byte-level JSON canonicalization scheme. Producers SHOULD
emit top-level collections in specification order and definition arrays in an
author-chosen stable order. Consumers MUST preserve semantically ordered
arrays and MUST treat all object member order as irrelevant.

Dates and decimals have one lexical form, dimensions are complete unordered
maps, facts are individual objects, and snapshot application identities are
structured keys. These constraints make semantic inspection and diffing
deterministic without giving whitespace, object-key order, or filenames
meaning.

## 10. Conformance fixture contract

Files under `examples/` and `fixtures/valid/` MUST conform to the document JSON
Schema and every semantic invariant above. Each file under `fixtures/invalid/`
is intentionally nonconforming and has a matching entry in
[`manifest.json`](../fixtures/manifest.json) naming its expected failure.

Calculation-result and snapshot-diff fixtures are language-neutral expected
outputs. A conforming validator MUST produce semantically equal objects for the
corresponding input cases, independent of programming language or display
format.
