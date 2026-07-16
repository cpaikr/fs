# Authoring FS Documents

Status: current V0 authoring guidance; reference CLI commands are not yet
implemented.

This guide is the entry point for a person or agent encoding an already-resolved
financial-statement model as an FS document. The
[semantic specification](semantic-spec.md) remains normative. The
[JSON Schema](../schema/fs-document.schema.json) checks the JSON shape but does
not enforce every reference, uniqueness, calendar, coordinate, or calculation
invariant.

FS is a file-first interchange format, not an extraction system, accounting
taxonomy, conversion method, or mutable financial database. It starts after an
author has chosen the financial meanings and values to represent.

## Authoring Contract

Before encoding begins, the author must supply:

- the reporting entity and exact reporting scope;
- every item meaning and stable local identifier;
- units, scales, periods, and fact values;
- any non-period dimensions and their members;
- the intended distinction between zero, missing, and unavailable facts;
- statement composition and display order; and
- any calculation rules and tolerances the author wants checked.

These are prerequisites, not questions the format answers. A person or agent
must stop and request missing or contradictory inputs rather than infer a
meaning, choose a sign, aggregate items, map a taxonomy, or invent a value.

## Workflow

### 1. Fix the artifact boundary

Create one document for exactly one entity and reporting scope. Mixed entities
or scopes require separate V0 documents. Choose stable local identifiers, but
do not imply that they belong to a universal taxonomy.

### 2. Define the coordinate vocabulary

Define items, units, periods, and any dimensions before referencing them.
Items describe financial meanings rather than source rows or ledger accounts.
Periods describe instants or inclusive durations rather than display columns.
Units make the measure and base-ten display scale explicit.

### 3. Store facts independently

Store every supplied value as an individual fact at its complete item, period,
unit, and dimension coordinate. In particular:

- values are normalized exact decimal strings;
- zero is `"0"`;
- a missing fact is an absent coordinate;
- an explicitly unavailable fact uses `"unavailable": true`; and
- omitted dimensions and an empty dimensions object identify the same
  dimensionless coordinate and must not be duplicated.

Do not calculate a missing value into existence or alter a supplied value to
make a relationship pass.

### 4. Add presentations

Statements are ordered views over shared facts. They choose a unit, displayed
periods, optional dimension axes, and flat heading or item entries. They do not
own facts, define fact identity, imply indentation, or imply calculations. One
fact may appear in multiple statements.

### 5. Add only confirmed checks

Calculation rules are optional. Use same-period rules for reusable item
relationships, roll-forwards for unambiguous consecutive duration series, and
explicit assertions for exact reconciliations or irregular relationships.
Rules check stored values; they never supply them.

### 6. Validate and deliver

Full validation must check JSON shape plus all semantic invariants and must
report structural conformance, calculation consistency, and snapshot
comparison separately. The planned `fs validate <document|-> --format json`
command will be the reference operational conformance check once implemented;
the semantic specification remains normative.

Until then, the AJV commands in the [fixture guide](../fixtures/README.md)
provide shape validation only. Passing JSON Schema is not sufficient evidence
of FS conformance.

A reviewable authoring result should include:

1. the FS JSON document;
2. its complete structured validation result when the reference validator is
   available.

FS defines no source ledger, provenance sidecar, or conversion record. Other
systems may maintain their own records, but they are outside this project and
its conformance contract. Source and provenance properties inside FS JSON are
nonconforming in V0.

## Schema and Version Discovery

Every V0 document declares `"formatVersion": "0.1"`. Do not add a top-level
`$schema` property: the current closed document schema does not permit it. Use
the bundled schema directly, and later use `fs schema document --version 0.1`
when the reference CLI is available.

Before public release, the project will replace the schema's placeholder `$id`
with an immutable versioned URL and decide whether to permit an optional
constant `$schema` pointer. Such a pointer would aid discovery only; full
semantic validation would still require the reference validator.

## Working With the Examples

Use [`minimal.json`](../examples/minimal.json) to learn the smallest complete
shape. It contains illustrative data and must not be treated as a partially
filled document.

Use [`manufacturing-group.json`](../examples/manufacturing-group.json) to look
up complex patterns such as shared facts, dimensions, assertions, and
roll-forwards. It deliberately contains an inconsistent calculation and is
evidence for validator behavior, not a general-purpose financial-statement
template.

FS does not provide balance-sheet, income-statement, or industry templates
because those would prescribe meanings and contents that remain
author-controlled.

## Reusable Agent Instruction

The following instruction can accompany an author-resolved financial model:

```text
Encode the supplied, author-resolved financial model as one FS document with
formatVersion "0.1". Use the FS semantic specification as normative, the
document JSON Schema for shape, and minimal.json only as a structural example.

Treat the supplied entity, scope, item meanings, units, scales, periods,
dimensions, facts, presentations, and calculation rules as inputs. Do not
extract, map, classify, aggregate, choose signs, infer relationships, or invent
values. If any required input is missing, contradictory, or ambiguous, stop
and identify exactly what the author must decide.

Use stable document-local identifiers. Store supplied values as independent
facts and statements as presentations over those facts. Distinguish zero,
missing, and explicitly unavailable values. Never alter a value to satisfy a
check or put provenance in the FS JSON.

Run the full reference validator, repair only structural encoding errors that
do not require a financial decision, and report calculation inconsistency
separately. Deliver the FS JSON and its structured validation result.
```

An installable Agent Skill should teach this encoding workflow, recognize when
the prerequisite financial model is incomplete, and invoke the same reference
validator. It must not add extraction or mapping instructions. It should route
to focused references rather than embedding the complete schema or fixture
suite in agent context.
