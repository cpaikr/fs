# Financial Statement Documents

This context defines the language for representing financial statements as
structured facts, presentations, and optional arithmetic checks.

## Artifact

**FS document**:
A standalone collection of financial facts for exactly one reporting entity
and reporting scope.
_Avoid_: Report, dataset, validated document

**Reporting entity**:
The organization or consolidated group whose financial facts the FS document
describes.

**Reporting scope**:
The boundary within the reporting entity represented by the FS document, such
as consolidated or separate financial statements.

## Financial Data

**Item**:
A document-defined financial meaning, such as revenue, inventory, gross profit,
or gross margin.
_Avoid_: Account, row

**Fact**:
A stored value for an item at one complete coordinate. Facts exist independently
of any statement that presents them.
_Avoid_: Cell

**Coordinate**:
The semantic keys that distinguish a fact within an FS document, including its
item, period, unit, and any applicable dimensions.

**Period**:
Either an instant date or a duration with a start and end date.
_Avoid_: Column

**Unit**:
A named measurement and magnitude in which facts are expressed, such as KRW,
KRW million, shares, or percent.

**Dimension**:
An optional named axis that distinguishes otherwise identical facts, such as an
equity component.

**Missing fact**:
The absence of a fact at a coordinate. It is distinct from zero and from an
unavailable fact.

**Unavailable fact**:
A fact explicitly stating that its value is unavailable.

## Presentation

**Statement**:
An ordered presentation of items, such as a balance sheet or income statement.
A statement does not own facts or imply arithmetic.
_Avoid_: Table

## Validation

**Calculation rule**:
An optional declarative relationship that states an expected arithmetic
relationship among stored facts.
_Avoid_: Formula that creates values

**Explicit assertion**:
A calculation rule bound to specific fact coordinates for a relationship that
cannot be selected safely by a reusable rule.

**Roll-forward rule**:
A reusable calculation rule relating an opening fact, movements during a
duration, and a closing fact.

**Rule application**:
One evaluation of a calculation rule against concrete fact coordinates.

**Structural conformance**:
Whether an FS document follows the format and its referential invariants.

**Calculation consistency**:
Whether evaluated calculation-rule applications agree within their applicable
tolerances. It is independent of structural conformance.

**Validation result**:
The current outcome produced by evaluating structural conformance and any
calculation rules.

**Validation snapshot**:
A recorded historical validation result embedded in an ordinary FS document
for comparison with a later computation. It is not the document's current
status.
