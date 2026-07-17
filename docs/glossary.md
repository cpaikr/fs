# Domain Glossary

This glossary defines the canonical language for the accepted statement-item
row model in [ADR 0001](adr/0001-replace-dimensional-members-with-item-grouping.md).
The current [semantic specification](semantic-spec.md) remains normative until
the [statement-item-row refactor](plans/statement-item-row-refactor.md)
incorporates the decision. The active plan records that temporary terminology
drift.

## Artifact

**FS document**:
A standalone collection of financial statements for exactly one reporting
entity and reporting scope.
_Avoid_: Report, dataset, validated document

**Reporting entity**:
The organization or consolidated group whose financial statements the FS
document describes.

**Reporting scope**:
The boundary within the reporting entity represented by the FS document, such
as consolidated or separate financial statements.

## Financial Data

**Statement**:
An ordered collection of items for selected periods, such as a balance sheet
or income statement. A statement owns its items and their values.
_Avoid_: Fact presentation, multidimensional table

**Item**:
A statement-local financial meaning and ordered row, such as revenue,
inventory, or gross profit. An item may correspond to one ledger account,
several accounts already aggregated upstream, or another reported line. FS may
group an item but does not split or allocate it.
_Avoid_: Account, fact, member

**Item value**:
The stored cell state for one item and one period. It is an exact decimal,
missing, or explicitly unavailable; it is never derived merely because a
rollup exists.
_Avoid_: Fact, calculated value

**Period**:
Either an instant date or a duration with a start and end date. Statements
select periods, and each item stores exactly one value for every selected
period.
_Avoid_: Column

**Unit**:
A named measurement and magnitude applying to every value of one item, such as
KRW, KRW million, shares, or percent. Different items in one statement may use
different units.

**Missing value**:
An item-period cell explicitly encoded as `null`. It is distinct from zero and
from an unavailable value.

**Unavailable value**:
An item-period cell explicitly stating that its source value is unavailable.

## Grouping

**Grouping column**:
A document-local, user-named classification purpose such as `middleGroup`,
`valuation`, or `ppt`. It is a logical table column, not a scheme, hierarchy,
taxonomy, or value coordinate.

**Grouping value**:
The nonempty string or `null` assigned to an item for one grouping column. It
describes the item and never implies arithmetic, ordering, signs, or display
behavior.
_Avoid_: Dimension member, category entity

## Validation

**Rollup relationship**:
An optional additive relationship declared by a child item's `rollupTo`
reference to a parent item in the same statement. It uses stored signs and a
coefficient of one.
_Avoid_: Grouping, formula that creates values

**Reported subtotal**:
A parent item with explicitly stored values and one or more direct children
that roll up to it. Validation compares the reported values with the child
sums; it never materializes or replaces the parent values.

**Rollup application**:
One evaluation of a reported subtotal for one statement period.

**Application key**:
The stable statement, parent-item, and period identity of one rollup
application in current results, recorded snapshots, and snapshot diffs.

**Structural conformance**:
Whether an FS document follows the format and its referential invariants.

**Calculation consistency**:
Whether every rollup application agrees within the applicable unit tolerance.
It is independent of structural conformance.

**Calculation status**:
The derived aggregate outcome: not run, not defined, consistent, or
inconsistent. It is never stored as current document state.

**Validation result**:
The current outcome produced by evaluating structural conformance and rollup
relationships.

**Validation snapshot**:
A recorded historical validation result embedded in an ordinary FS document
for comparison with a later computation. It is not the document's current
status.

**Snapshot diff**:
A deterministic comparison of a recorded validation snapshot with a newly
computed validation result, matched by application key.
